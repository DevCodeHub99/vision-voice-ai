import { Task, AnalysisResult } from '../types';
import { DEFAULT_OPENROUTER_CASCADE } from '../constants';
import { executeOpenAICompatibleVision } from './openAICompatibleService';

/**
 * Generates an AI-powered description or text extraction using OpenRouter API.
 */
export const generateOpenRouterDescription = async (
    base64Data: string,
    mimeType: string,
    task: Task,
    languageName: string,
    customApiKey?: string,
    customModel?: string,
    signal?: AbortSignal
): Promise<AnalysisResult> => {
    return executeOpenAICompatibleVision(
        base64Data,
        mimeType,
        task,
        languageName,
        customApiKey,
        customModel,
        {
            providerLabel: 'OpenRouter',
            endpoint: 'https://openrouter.ai/api/v1/chat/completions',
            defaultCascade: DEFAULT_OPENROUTER_CASCADE,
            missingKeyError: "No OpenRouter API key configured. Please click Settings (gear icon at top right) and enter your API key.",
            includeRefererHeaders: true,
            maxTokens: 1024,
            getExtraPayload: () => ({
                reasoning: { effort: 'none', exclude: true }
            }),
            formatExhaustedError: (lastError) => {
                if (!lastError) {
                    return "An unknown error occurred while contacting OpenRouter service.";
                }
                if (lastError.message.toLowerCase().includes('provider returned error')) {
                    return "The model provider returned an error. On OpenRouter, free models require enabling 'Allow free models that may train on inputs' in your OpenRouter Account Settings (openrouter.ai/settings/privacy), or switch to another model in Settings.";
                }
                return `${lastError.message}. Please check your network connection and OpenRouter API quota.`;
            }
        },
        signal
    );
};
