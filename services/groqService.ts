import { Task, AnalysisResult } from '../types';
import { DEFAULT_GROQ_CASCADE } from '../constants';
import { executeOpenAICompatibleVision } from './openAICompatibleService';

/**
 * Generates an AI-powered visual description or OCR text extraction using Groq Cloud API.
 * Uses Groq's free-tier LPU-accelerated OpenAI-compatible vision endpoint (no card required).
 */
export const generateGroqDescription = async (
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
            providerLabel: 'Groq',
            endpoint: 'https://api.groq.com/openai/v1/chat/completions',
            defaultCascade: DEFAULT_GROQ_CASCADE,
            missingKeyError: "No Groq API key configured. Please click Settings (gear icon at top right) and enter your free Groq API key (starting with 'gsk_...').",
            includeRefererHeaders: false,
            maxTokens: 1024,
            maxBase64Bytes: 3_800_000,
            getExtraPayload: (model) =>
                model.startsWith('qwen/qwen3.8') ? { reasoning_effort: 'none' } : {}
        },
        signal
    );
};
