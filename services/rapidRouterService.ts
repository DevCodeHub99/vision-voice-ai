import { Task, AnalysisResult } from '../types';
import { DEFAULT_RAPIDROUTER_CASCADE } from '../constants';
import { executeOpenAICompatibleVision } from './openAICompatibleService';

/**
 * Generates an AI-powered visual description or OCR text extraction using Rapid Router API.
 * Supports Rapid Router's free tier (50 free req/day on :free models with $0 balance).
 */
export const generateRapidRouterDescription = async (
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
            providerLabel: 'Rapid Router',
            endpoint: 'https://rapidrouter.ai/api/v1/chat/completions',
            defaultCascade: DEFAULT_RAPIDROUTER_CASCADE,
            missingKeyError: "No Rapid Router API key configured. Please click Settings (gear icon at top right) and enter your Rapid Router key.",
            includeRefererHeaders: true,
            maxTokens: 500,
            formatExhaustedError: (lastError) => {
                if (!lastError) {
                    return "An unknown error occurred while contacting Rapid Router service.";
                }
                if (lastError.message.toLowerCase().includes('free_tier_exhausted') || lastError.message.toLowerCase().includes('free_pool_exhausted')) {
                    return "Rapid Router free-tier quota exhausted (50 free requests/day, resets at midnight IST / 18:30 UTC). Try another provider in Settings.";
                }
                return `${lastError.message}. Please check your network connection and Rapid Router API key in Settings.`;
            }
        },
        signal
    );
};
