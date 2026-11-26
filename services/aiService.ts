import { AIProvider, AnalysisResult, Task, UserSettings } from '../types';
import { PROVIDER_ORDER } from '../constants';
import { generateOpenRouterDescription } from './openRouterService';
import { generateGeminiDescription } from './geminiService';
import { generateGroqDescription } from './groqService';
import { generateRapidRouterDescription } from './rapidRouterService';

export type ProviderExecutor = (
    base64Data: string,
    mimeType: string,
    task: Task,
    languageName: string,
    apiKey?: string,
    model?: string,
    signal?: AbortSignal
) => Promise<AnalysisResult>;

const PROVIDER_EXECUTORS: Record<AIProvider, ProviderExecutor> = {
    gemini: generateGeminiDescription,
    openrouter: generateOpenRouterDescription,
    groq: generateGroqDescription,
    rapidrouter: generateRapidRouterDescription,
};

const getProviderKey = (provider: AIProvider, userSettings?: UserSettings): string | undefined => {
    switch (provider) {
        case 'gemini':
            return userSettings?.geminiKey;
        case 'openrouter':
            return userSettings?.openRouterKey;
        case 'groq':
            return userSettings?.groqKey;
        case 'rapidrouter':
            return userSettings?.rapidRouterKey;
    }
};

export const hasValidProviderKey = (provider: AIProvider, userSettings?: UserSettings): boolean => {
    const key = getProviderKey(provider, userSettings)?.trim();
    if (!key) return false;
    if (provider === 'gemini') {
        return key.startsWith('AIzaSy');
    }
    return true;
};

/**
 * Unified AI Provider Dispatcher.
 * Routes image analysis requests to the user's configured provider and model,
 * with automatic cross-provider failover to any other configured free-tier provider.
 */
export const generateDescription = async (
    base64Data: string,
    mimeType: string,
    task: Task,
    languageName: string,
    userSettings?: UserSettings,
    executors: Partial<Record<AIProvider, ProviderExecutor>> = PROVIDER_EXECUTORS,
    signal?: AbortSignal
): Promise<AnalysisResult> => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return {
            success: false,
            error: 'No internet connection detected. Multimodal vision requires network connectivity.'
        };
    }

    if (signal?.aborted) {
        return { success: false, error: 'Request cancelled.' };
    }

    const resolvedExecutors = { ...PROVIDER_EXECUTORS, ...executors };
    const primaryProvider: AIProvider = userSettings?.provider || 'openrouter';
    const primaryModel = userSettings?.providerModels?.[primaryProvider] ?? userSettings?.model;

    const primaryResult = await resolvedExecutors[primaryProvider](
        base64Data,
        mimeType,
        task,
        languageName,
        getProviderKey(primaryProvider, userSettings),
        primaryModel,
        signal
    );

    if (primaryResult.success || signal?.aborted) {
        return primaryResult;
    }

    for (const fallbackProvider of PROVIDER_ORDER) {
        if (fallbackProvider === primaryProvider || !hasValidProviderKey(fallbackProvider, userSettings)) {
            continue;
        }
        if (signal?.aborted) {
            return { success: false, error: 'Request cancelled.' };
        }

        console.warn(`${primaryProvider} provider failed, checking ${fallbackProvider} fallback...`, primaryResult.error);
        const fallbackModel = userSettings?.providerModels?.[fallbackProvider];
        const fallbackResult = await resolvedExecutors[fallbackProvider](
            base64Data,
            mimeType,
            task,
            languageName,
            getProviderKey(fallbackProvider, userSettings),
            fallbackModel,
            signal
        );

        if (fallbackResult.success) {
            return fallbackResult;
        }
    }

    return primaryResult;
};
