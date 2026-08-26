import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateDescription } from '../services/aiService';
import { Task } from '../types';
import * as openRouterService from '../services/openRouterService';
import * as geminiService from '../services/geminiService';

vi.mock('../services/openRouterService');
vi.mock('../services/geminiService');

describe('aiService Dispatcher', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should route to OpenRouter by default and return result', async () => {
        vi.mocked(openRouterService.generateOpenRouterDescription).mockResolvedValueOnce({
            success: true,
            text: 'A white mug on a wooden table.'
        });

        const result = await generateDescription('fakeBase64', 'image/jpeg', Task.DESCRIBE, 'English', {
            provider: 'openrouter',
            openRouterKey: 'sk-or-v1-testkey',
            geminiKey: '',
            model: 'openrouter/free',
            rememberKey: true
        });

        expect(openRouterService.generateOpenRouterDescription).toHaveBeenCalledTimes(1);
        expect(result.success).toBe(true);
        expect(result.text).toBe('A white mug on a wooden table.');
    });

    it('should route to Gemini when provider is set to gemini', async () => {
        vi.mocked(geminiService.generateGeminiDescription).mockResolvedValueOnce({
            success: true,
            text: 'Text on paper reads: Emergency Exit.'
        });

        const result = await generateDescription('fakeBase64', 'image/jpeg', Task.READ, 'English', {
            provider: 'gemini',
            openRouterKey: '',
            geminiKey: 'AIzaSyTestKey123',
            model: 'gemini-2.5-flash',
            rememberKey: true
        });

        expect(geminiService.generateGeminiDescription).toHaveBeenCalledTimes(1);
        expect(result.success).toBe(true);
        expect(result.text).toBe('Text on paper reads: Emergency Exit.');
    });

    it('should fallback to OpenRouter when Gemini fails and OpenRouter key exists', async () => {
        vi.mocked(geminiService.generateGeminiDescription).mockResolvedValueOnce({
            success: false,
            error: 'Gemini quota exceeded'
        });
        vi.mocked(openRouterService.generateOpenRouterDescription).mockResolvedValueOnce({
            success: true,
            text: 'Fallback scene description from OpenRouter.'
        });

        const result = await generateDescription('fakeBase64', 'image/jpeg', Task.DESCRIBE, 'English', {
            provider: 'gemini',
            openRouterKey: 'sk-or-v1-backup-key',
            geminiKey: 'AIzaSyTestKey123',
            model: 'gemini-2.5-flash',
            rememberKey: true
        });

        expect(geminiService.generateGeminiDescription).toHaveBeenCalledTimes(1);
        expect(openRouterService.generateOpenRouterDescription).toHaveBeenCalledTimes(1);
        expect(result.success).toBe(true);
        expect(result.text).toBe('Fallback scene description from OpenRouter.');
    });

    it('should fallback to Gemini when OpenRouter fails and Gemini key exists', async () => {
        vi.mocked(openRouterService.generateOpenRouterDescription).mockResolvedValueOnce({
            success: false,
            error: 'OpenRouter rate limit'
        });
        vi.mocked(geminiService.generateGeminiDescription).mockResolvedValueOnce({
            success: true,
            text: 'Fallback OCR from Gemini.'
        });

        const result = await generateDescription('fakeBase64', 'image/jpeg', Task.READ, 'English', {
            provider: 'openrouter',
            openRouterKey: 'sk-or-v1-primary-key',
            geminiKey: 'AIzaSyBackupKey456',
            model: 'openrouter/free',
            rememberKey: true
        });

        expect(openRouterService.generateOpenRouterDescription).toHaveBeenCalledTimes(1);
        expect(geminiService.generateGeminiDescription).toHaveBeenCalledTimes(1);
        expect(result.success).toBe(true);
        expect(result.text).toBe('Fallback OCR from Gemini.');
    });
});
