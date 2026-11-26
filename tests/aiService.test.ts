import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { generateDescription, ProviderExecutor } from '../services/aiService';
import { Task } from '../types';

describe('aiService Dispatcher', () => {
    const defaultStub: ProviderExecutor = async () => ({ success: false, error: 'Not mocked' });
    const mockOpenRouter = mock.fn<ProviderExecutor>(defaultStub);
    const mockGemini = mock.fn<ProviderExecutor>(defaultStub);
    const mockGroq = mock.fn<ProviderExecutor>(defaultStub);
    const mockRapidRouter = mock.fn<ProviderExecutor>(defaultStub);

    const executors = {
        openrouter: mockOpenRouter,
        gemini: mockGemini,
        groq: mockGroq,
        rapidrouter: mockRapidRouter,
    };

    beforeEach(() => {
        mockOpenRouter.mock.resetCalls();
        mockGemini.mock.resetCalls();
        mockGroq.mock.resetCalls();
        mockRapidRouter.mock.resetCalls();
    });

    it('should route to OpenRouter by default and return result', async () => {
        mockOpenRouter.mock.mockImplementationOnce(async () => ({
            success: true,
            text: 'A white mug on a wooden table.'
        }));

        const result = await generateDescription('fakeBase64', 'image/jpeg', Task.DESCRIBE, 'English', {
            provider: 'openrouter',
            openRouterKey: 'sk-or-v1-testkey',
            geminiKey: '',
            model: 'openrouter/free',
            rememberKey: true
        }, executors);

        assert.equal(mockOpenRouter.mock.callCount(), 1);
        assert.deepEqual(result, {
            success: true,
            text: 'A white mug on a wooden table.'
        });
    });

    it('should route to Gemini when provider is set to gemini', async () => {
        mockGemini.mock.mockImplementationOnce(async () => ({
            success: true,
            text: 'Text on paper reads: Emergency Exit.'
        }));

        const result = await generateDescription('fakeBase64', 'image/jpeg', Task.READ, 'English', {
            provider: 'gemini',
            openRouterKey: '',
            geminiKey: 'AIzaSyTestKey123',
            model: 'gemini-2.5-flash',
            rememberKey: true
        }, executors);

        assert.equal(mockGemini.mock.callCount(), 1);
        assert.deepEqual(result, {
            success: true,
            text: 'Text on paper reads: Emergency Exit.'
        });
    });

    it('should route to Groq and respect per-provider custom model preferences', async () => {
        mockGroq.mock.mockImplementationOnce(async () => ({
            success: true,
            text: 'Groq result: crosswalk ahead.'
        }));

        const result = await generateDescription('fakeBase64', 'image/jpeg', Task.DESCRIBE, 'English', {
            provider: 'groq',
            openRouterKey: '',
            geminiKey: '',
            groqKey: 'gsk_test_key',
            model: 'openrouter/free',
            providerModels: { groq: 'meta-models/muse-spark-open' },
            rememberKey: true
        }, executors);

        assert.equal(mockGroq.mock.callCount(), 1);
        assert.deepEqual(mockGroq.mock.calls[0].arguments, [
            'fakeBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            'gsk_test_key',
            'meta-models/muse-spark-open',
            undefined
        ]);
        assert.deepEqual(result, {
            success: true,
            text: 'Groq result: crosswalk ahead.'
        });
    });

    it('should route to Rapid Router when provider is set to rapidrouter', async () => {
        mockRapidRouter.mock.mockImplementationOnce(async () => ({
            success: true,
            text: 'Rapid Router result: pharmacy sign.'
        }));

        const result = await generateDescription('fakeBase64', 'image/jpeg', Task.READ, 'English', {
            provider: 'rapidrouter',
            openRouterKey: '',
            geminiKey: '',
            rapidRouterKey: 'rr_key_123',
            model: 'google/gemma-4-31b-it:free',
            rememberKey: true
        }, executors);

        assert.equal(mockRapidRouter.mock.callCount(), 1);
        assert.deepEqual(result, {
            success: true,
            text: 'Rapid Router result: pharmacy sign.'
        });
    });

    it('should fallback to OpenRouter when Gemini fails and OpenRouter key exists', async () => {
        mockGemini.mock.mockImplementationOnce(async () => ({
            success: false,
            error: 'Gemini quota exceeded'
        }));
        mockOpenRouter.mock.mockImplementationOnce(async () => ({
            success: true,
            text: 'Fallback scene description from OpenRouter.'
        }));

        const result = await generateDescription('fakeBase64', 'image/jpeg', Task.DESCRIBE, 'English', {
            provider: 'gemini',
            openRouterKey: 'sk-or-v1-backup-key',
            geminiKey: 'AIzaSyTestKey123',
            model: 'gemini-2.5-flash',
            rememberKey: true
        }, executors);

        assert.equal(mockGemini.mock.callCount(), 1);
        assert.equal(mockOpenRouter.mock.callCount(), 1);
        assert.deepEqual(result, {
            success: true,
            text: 'Fallback scene description from OpenRouter.'
        });
    });

    it('should fallback to Gemini when OpenRouter fails and Gemini key exists', async () => {
        mockOpenRouter.mock.mockImplementationOnce(async () => ({
            success: false,
            error: 'OpenRouter rate limit'
        }));
        mockGemini.mock.mockImplementationOnce(async () => ({
            success: true,
            text: 'Fallback OCR from Gemini.'
        }));

        const result = await generateDescription('fakeBase64', 'image/jpeg', Task.READ, 'English', {
            provider: 'openrouter',
            openRouterKey: 'sk-or-v1-primary-key',
            geminiKey: 'AIzaSyBackupKey456',
            model: 'openrouter/free',
            rememberKey: true
        }, executors);

        assert.equal(mockOpenRouter.mock.callCount(), 1);
        assert.equal(mockGemini.mock.callCount(), 1);
        assert.deepEqual(result, {
            success: true,
            text: 'Fallback OCR from Gemini.'
        });
    });

    it('should fallback to Groq using its configured providerModel when Rapid Router fails', async () => {
        mockRapidRouter.mock.mockImplementationOnce(async () => ({
            success: false,
            error: 'Rapid Router daily limit'
        }));
        mockGroq.mock.mockImplementationOnce(async () => ({
            success: true,
            text: 'Fallback from Groq vision.'
        }));

        const result = await generateDescription('fakeBase64', 'image/jpeg', Task.DESCRIBE, 'English', {
            provider: 'rapidrouter',
            openRouterKey: '',
            geminiKey: '',
            groqKey: 'gsk_backup_key',
            rapidRouterKey: 'rr_primary_key',
            model: 'google/gemma-4-31b-it:free',
            providerModels: { groq: 'qwen/qwen3.8-27b' },
            rememberKey: true
        }, executors);

        assert.equal(mockGroq.mock.callCount(), 1);
        assert.deepEqual(mockGroq.mock.calls[0].arguments, [
            'fakeBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            'gsk_backup_key',
            'qwen/qwen3.8-27b',
            undefined
        ]);
        assert.deepEqual(result, {
            success: true,
            text: 'Fallback from Groq vision.'
        });
    });
});
