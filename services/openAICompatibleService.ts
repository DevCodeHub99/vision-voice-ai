import { Task, AnalysisResult } from '../types';
import { PROMPT_TEMPLATES, AI_SYSTEM_INSTRUCTION } from '../constants';
import { sanitizeKeyInput, sanitizeErrorMessage, cleanAIResponseText } from '../utils/security';

export interface OpenAICompatibleVisionConfig {
    providerLabel: string;
    endpoint: string;
    defaultCascade: string[];
    missingKeyError: string;
    includeRefererHeaders?: boolean;
    maxTokens?: number;
    maxBase64Bytes?: number;
    getExtraPayload?: (model: string) => Record<string, unknown>;
    formatExhaustedError?: (lastError: Error | null) => string;
}

const extractMessageText = (content: unknown): string => {
    if (typeof content === 'string') {
        return content;
    }
    if (Array.isArray(content)) {
        return content
            .map((part) => (typeof part === 'object' && part !== null && 'text' in part && typeof (part as { text?: unknown }).text === 'string'
                ? (part as { text: string }).text
                : ''))
            .join('\n');
    }
    return '';
};

const createLinkedSignal = (timeoutMs: number, externalSignal?: AbortSignal) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(new Error('Request timed out')), timeoutMs);

    const onExternalAbort = () => {
        controller.abort(externalSignal?.reason);
    };

    if (externalSignal) {
        if (externalSignal.aborted) {
            controller.abort(externalSignal.reason);
        } else {
            externalSignal.addEventListener('abort', onExternalAbort, { once: true });
        }
    }

    const cleanup = () => {
        clearTimeout(timeoutId);
        externalSignal?.removeEventListener('abort', onExternalAbort);
    };

    return { signal: controller.signal, cleanup };
};

/**
 * Shared client for OpenAI-compatible multimodal chat/completions APIs
 * (OpenRouter, Groq, Rapid Router) with model cascades, 30s timeouts,
 * fail-fast auth/network handling, and empty-response detection.
 */
export const executeOpenAICompatibleVision = async (
    base64Data: string,
    mimeType: string,
    task: Task,
    languageName: string,
    customApiKey: string | undefined,
    customModel: string | undefined,
    config: OpenAICompatibleVisionConfig,
    externalSignal?: AbortSignal
): Promise<AnalysisResult> => {
    const apiKey = sanitizeKeyInput(customApiKey);
    if (!apiKey) {
        return {
            success: false,
            error: config.missingKeyError
        };
    }

    if (externalSignal?.aborted) {
        return { success: false, error: 'Request cancelled.' };
    }

    if (config.maxBase64Bytes && base64Data.length > config.maxBase64Bytes) {
        return {
            success: false,
            error: `Image payload exceeds ${config.providerLabel}'s size limit. Please capture a smaller or simpler image.`
        };
    }

    const fullPrompt = `${AI_SYSTEM_INSTRUCTION}\n\nTask: ${PROMPT_TEMPLATES[task]} Please provide the response in ${languageName}.`;
    const imageUrl = `data:${mimeType};base64,${base64Data}`;
    const referer = typeof window !== 'undefined' ? window.location.origin : 'https://visionvoice.app';

    const trimmedCustomModel = customModel?.trim();
    const models = trimmedCustomModel
        ? [trimmedCustomModel, ...config.defaultCascade.filter(m => m !== trimmedCustomModel)]
        : config.defaultCascade;

    let lastError: Error | null = null;

    for (const model of models) {
        if (externalSignal?.aborted) {
            return { success: false, error: 'Request cancelled.' };
        }

        const { signal, cleanup } = createLinkedSignal(30000, externalSignal);

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        };

        if (config.includeRefererHeaders) {
            headers['HTTP-Referer'] = referer;
            headers['X-Title'] = 'VisionVoice';
        }

        try {
            const response = await fetch(config.endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model,
                    max_tokens: config.maxTokens ?? 300,
                    temperature: 0.2,
                    ...(config.getExtraPayload?.(model) ?? {}),
                    messages: [
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: fullPrompt },
                                { type: 'image_url', image_url: { url: imageUrl } }
                            ]
                        }
                    ]
                }),
                signal
            });

            cleanup();

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const rawMsg = errorData.error?.metadata?.raw
                    || errorData.error?.message
                    || `HTTP ${response.status} ${response.statusText}`;
                const msg = typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg);

                // Fail fast on auth or credit errors instead of stalling across fallback models
                if (response.status === 401 || response.status === 403 || response.status === 402) {
                    return {
                        success: false,
                        error: sanitizeErrorMessage(`${config.providerLabel} ${response.status}: ${msg}. Please check your API key and credits in Settings.`)
                    };
                }
                throw new Error(msg);
            }

            const data = await response.json();
            const rawText = extractMessageText(data.choices?.[0]?.message?.content);
            const textResult = cleanAIResponseText(rawText);

            if (!textResult) {
                throw new Error(`Model ${model} returned an empty response.`);
            }

            return {
                success: true,
                text: textResult
            };
        } catch (error) {
            cleanup();
            if (externalSignal?.aborted) {
                return { success: false, error: 'Request cancelled.' };
            }
            const isAbort = error instanceof Error && error.name === 'AbortError';
            const isNetworkError = error instanceof TypeError;
            const errorMsg = isAbort ? `Model ${model} request timed out (30s limit).` : sanitizeErrorMessage(error);
            console.warn(`${config.providerLabel} request for '${model}' failed:`, errorMsg);
            lastError = isAbort ? new Error(`Request timed out for ${model}`) : new Error(errorMsg);
            if (isNetworkError) {
                break;
            }
        }
    }

    const rawError = config.formatExhaustedError
        ? config.formatExhaustedError(lastError)
        : (lastError
            ? `${lastError.message}. Please check your network connection and ${config.providerLabel} API key in Settings.`
            : `An unknown error occurred while contacting ${config.providerLabel} service.`);

    return {
        success: false,
        error: sanitizeErrorMessage(rawError)
    };
};
