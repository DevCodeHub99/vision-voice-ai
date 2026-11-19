import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateOpenRouterDescription } from '../services/openRouterService';
import { Task } from '../types';

describe('openRouterService', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('should return error when no API key is provided', async () => {
        const result = await generateOpenRouterDescription(
            'fakeBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            ''
        );

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toContain('No OpenRouter API key configured');
        }
    });

    it('should send correct Authorization headers, HTTP-Referer and X-Title', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [
                    { message: { content: 'A brown dog sitting on the grass.' } }
                ]
            })
        });
        global.fetch = mockFetch;

        const result = await generateOpenRouterDescription(
            'mockBase64String',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            'sk-or-v1-my-secret-key'
        );

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [url, options] = mockFetch.mock.calls[0];
        expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
        expect(options.method).toBe('POST');
        expect(options.headers['Authorization']).toBe('Bearer sk-or-v1-my-secret-key');
        expect(options.headers['X-Title']).toBe('VisionVoice');
        expect(options.headers['Content-Type']).toBe('application/json');

        expect(result).toEqual({
            success: true,
            text: 'A brown dog sitting on the grass.'
        });
    });

    it('should fail fast on 401 Unauthorized without cascading through all models', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            json: async () => ({
                error: { message: 'Invalid API key provided' }
            })
        });
        global.fetch = mockFetch;

        const result = await generateOpenRouterDescription(
            'mockBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            'sk-or-v1-bad-key'
        );

        // Crucial behavior check: Should only call fetch ONCE, not 4 times
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toContain('401');
            expect(result.error).toContain('Invalid API key provided');
        }
    });

    it('should fail fast on 402 Payment Required without cascading through all models', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 402,
            statusText: 'Payment Required',
            json: async () => ({
                error: { message: 'Insufficient credits on account' }
            })
        });
        global.fetch = mockFetch;

        const result = await generateOpenRouterDescription(
            'mockBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            'sk-or-v1-no-credits-key'
        );

        // Crucial check: Must not freeze user for 120s trying fallback models
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toContain('402');
            expect(result.error).toContain('Insufficient credits');
        }
    });

    it('should cascade to the next model when first model encounters a transient 500 server error', async () => {
        const mockFetch = vi.fn()
            .mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                json: async () => ({ error: { message: 'Model provider overloaded' } })
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [
                        { message: { content: 'Fallback model succeeded: A red stop sign.' } }
                    ]
                })
            });
        global.fetch = mockFetch;

        const result = await generateOpenRouterDescription(
            'mockBase64',
            'image/jpeg',
            Task.READ,
            'English',
            'sk-or-v1-valid-key'
        );

        // First model failed with 500 -> Second model called and succeeded
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result).toEqual({
            success: true,
            text: 'Fallback model succeeded: A red stop sign.'
        });
    });

    it('should strip safety classification headers and code blocks from model response', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [
                    { message: { content: 'User Safety: safe\n\n```markdown\nA clear glass bottle on a counter.\n```' } }
                ]
            })
        });
        global.fetch = mockFetch;

        const result = await generateOpenRouterDescription(
            'mockBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            'sk-or-v1-valid-key'
        );

        expect(result).toEqual({
            success: true,
            text: 'A clear glass bottle on a counter.'
        });
    });
});
