import { Task, AnalysisResult } from '../types';
import { PROMPT_TEMPLATES, DEFAULT_GEMINI_CASCADE, AI_SYSTEM_INSTRUCTION } from '../constants';
import { sanitizeKeyInput, sanitizeErrorMessage, cleanAIResponseText, isValidGeminiKey } from '../utils/security';

const GEMINI_MODEL_ID_REGEX = /^[a-zA-Z0-9._-]+$/;

const buildGeminiThinkingConfig = (model: string): Record<string, unknown> | undefined => {
    if (model.startsWith('gemini-2.5-pro')) {
        return { thinkingBudget: 128 };
    }
    if (model.startsWith('gemini-2.5-flash')) {
        return { thinkingBudget: 0 };
    }
    if (model.startsWith('gemini-3') || model.startsWith('gemini-4')) {
        return { thinkingLevel: 'minimal' };
    }
    return undefined;
};

const extractGeminiPartsText = (parts: unknown): string => {
    if (!Array.isArray(parts)) return '';
    return parts
        .filter((part): part is { text: string; thought?: boolean } =>
            typeof part === 'object'
            && part !== null
            && !(part as { thought?: unknown }).thought
            && 'text' in part
            && typeof (part as { text?: unknown }).text === 'string'
        )
        .map((part) => part.text)
        .join('\n');
};

/**
 * Generates an AI-powered description or text extraction using Google Gemini REST API.
 * Uses zero external SDK dependencies and official x-goog-api-key header authentication.
 */
export const generateGeminiDescription = async (
    base64Data: string,
    mimeType: string,
    task: Task,
    languageName: string,
    customApiKey?: string,
    customModel?: string,
    externalSignal?: AbortSignal
): Promise<AnalysisResult> => {
    const apiKey = sanitizeKeyInput(customApiKey);
    if (!apiKey) {
        return {
            success: false,
            error: "No Google Gemini API key configured. Please click Settings (gear icon at top right) and enter your Gemini API key (starting with 'AQ.' or 'AIza...')."
        };
    }

    if (!isValidGeminiKey(apiKey)) {
        return {
            success: false,
            error: "Invalid Gemini API key. API keys from Google AI Studio must start with 'AQ.' or 'AIza...'. Get a key at https://aistudio.google.com/app/apikey."
        };
    }

    if (externalSignal?.aborted) {
        return { success: false, error: 'Request cancelled.' };
    }

    const trimmedCustom = customModel?.trim();
    if (trimmedCustom && !GEMINI_MODEL_ID_REGEX.test(trimmedCustom)) {
        return {
            success: false,
            error: "Invalid Gemini model ID format. Use alphanumeric characters, dots, underscores, or hyphens only."
        };
    }

    const fullPrompt = `${PROMPT_TEMPLATES[task]} Please provide the response in ${languageName}.`;

    const models = trimmedCustom
        ? [trimmedCustom, ...DEFAULT_GEMINI_CASCADE.filter(m => m !== trimmedCustom)]
        : DEFAULT_GEMINI_CASCADE;

    let lastError: Error | unknown = null;

    for (const model of models) {
        if (externalSignal?.aborted) {
            return { success: false, error: 'Request cancelled.' };
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(new Error('Request timed out')), 30000);
        const onExternalAbort = () => controller.abort(externalSignal?.reason);

        if (externalSignal) {
            externalSignal.addEventListener('abort', onExternalAbort, { once: true });
        }

        const cleanup = () => {
            clearTimeout(timeoutId);
            externalSignal?.removeEventListener('abort', onExternalAbort);
        };

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
            const thinkingConfig = buildGeminiThinkingConfig(model);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{ text: AI_SYSTEM_INSTRUCTION }]
                    },
                    contents: [
                        {
                            parts: [
                                { inlineData: { mimeType, data: base64Data } },
                                { text: fullPrompt }
                            ]
                        }
                    ],
                    generationConfig: {
                        maxOutputTokens: 1024,
                        temperature: 0.2,
                        ...(thinkingConfig ? { thinkingConfig } : {})
                    }
                }),
                signal: controller.signal
            });

            cleanup();

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const rawMsg = errorData.error?.message || `HTTP ${response.status} ${response.statusText}`;
                const cleanMsg = sanitizeErrorMessage(rawMsg);

                // Fail fast on auth errors instead of retrying every fallback model
                if (response.status === 401 || response.status === 403) {
                    return {
                        success: false,
                        error: sanitizeErrorMessage(`Gemini ${response.status}: ${cleanMsg}. Please check your Gemini API key in Settings.`)
                    };
                }
                throw new Error(cleanMsg);
            }

            const data = await response.json();
            const rawText = extractGeminiPartsText(data.candidates?.[0]?.content?.parts);
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
            console.warn(`Gemini request for '${model}' failed:`, errorMsg);
            lastError = isAbort ? new Error(`Request timed out for ${model}`) : new Error(errorMsg);
            if (isNetworkError) {
                break;
            }
        }
    }

    const rawError = lastError instanceof Error
        ? `${lastError.message}. Please check your Gemini API key and quota in Google AI Studio.`
        : "An unknown error occurred while contacting Google Gemini service.";

    return {
        success: false,
        error: sanitizeErrorMessage(rawError)
    };
};
