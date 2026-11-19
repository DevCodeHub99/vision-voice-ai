import { Task, AnalysisResult } from '../types';
import { PROMPT_TEMPLATES, DEFAULT_OPENROUTER_CASCADE, AI_SYSTEM_INSTRUCTION } from '../constants';
import { sanitizeKeyInput, sanitizeErrorMessage, cleanAIResponseText } from '../utils/security';

/**
 * Generates an AI-powered description or text extraction using OpenRouter API.
 * 
 * @param base64Data - Pure base64 image data.
 * @param mimeType - MIME type of the image.
 * @param task - Current task (DESCRIBE or READ).
 * @param languageName - Name of the target language.
 * @param customApiKey - User-provided BYOK OpenRouter API key.
 * @param customModel - Optional user-selected model.
 * 
 * @returns A promise that resolves to an AnalysisResult.
 */
export const generateOpenRouterDescription = async (
    base64Data: string,
    mimeType: string,
    task: Task,
    languageName: string,
    customApiKey?: string,
    customModel?: string
): Promise<AnalysisResult> => {
    const apiKey = sanitizeKeyInput(customApiKey);
    if (!apiKey) {
        return {
            success: false,
            error: "No OpenRouter API key configured. Please click Settings (gear icon at top right) and enter your API key."
        };
    }

    const fullPrompt = `${PROMPT_TEMPLATES[task]} Please provide the response in ${languageName}.`;
    const imageUrl = `data:${mimeType};base64,${base64Data}`;
    const referer = typeof window !== 'undefined' ? window.location.origin : 'https://visionvoice.app';

    const models = customModel?.trim()
        ? [customModel.trim(), ...DEFAULT_OPENROUTER_CASCADE.filter(m => m !== customModel.trim())]
        : DEFAULT_OPENROUTER_CASCADE;

    let lastError: Error | unknown = null;

    for (const model of models) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s network timeout

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': referer,
                    'X-Title': 'VisionVoice'
                },
                body: JSON.stringify({
                    model,
                    max_tokens: 300,
                    temperature: 0.2,
                    messages: [
                        {
                            role: 'system',
                            content: AI_SYSTEM_INSTRUCTION
                        },
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: fullPrompt },
                                { type: 'image_url', image_url: { url: imageUrl } }
                            ]
                        }
                    ]
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const msg = errorData.error?.message || `HTTP ${response.status} ${response.statusText}`;
                // Fail fast on auth or credit errors instead of hanging 120s trying subsequent models
                if (response.status === 401 || response.status === 403 || response.status === 402) {
                    return {
                        success: false,
                        error: sanitizeErrorMessage(`OpenRouter ${response.status}: ${msg}. Please check your API key and credits in Settings.`)
                    };
                }
                throw new Error(msg);
            }

            const data = await response.json();
            const rawText = data.choices?.[0]?.message?.content;
            const textResult = cleanAIResponseText(rawText || '');

            if (textResult) {
                return {
                    success: true,
                    text: textResult
                };
            }
        } catch (error) {
            clearTimeout(timeoutId);
            const isAbort = error instanceof Error && error.name === 'AbortError';
            const errorMsg = isAbort ? `Model ${model} request timed out (30s limit).` : sanitizeErrorMessage(error);
            console.warn(`OpenRouter request for '${model}' failed:`, errorMsg);
            lastError = isAbort ? new Error(`Request timed out for ${model}`) : new Error(errorMsg);
        }
    }

    const rawError = lastError instanceof Error
        ? `${lastError.message}. Please check your network connection and OpenRouter API quota.`
        : "An unknown error occurred while contacting OpenRouter service.";

    return {
        success: false,
        error: sanitizeErrorMessage(rawError)
    };
};
