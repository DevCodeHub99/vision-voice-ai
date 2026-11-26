import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { generateOpenRouterDescription } from '../services/openRouterService';
import { Task } from '../types';

describe('openRouterService', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('should return error when no API key is provided', async () => {
        const result = await generateOpenRouterDescription(
            'fakeBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            ''
        );

        assert.equal(result.success, false);
        if (!result.success) {
            assert.ok(result.error.includes('No OpenRouter API key configured'));
        }
    });

    it('should send correct Authorization headers, HTTP-Referer and X-Title', async () => {
        const mockFetch = mock.fn(async () => ({
            ok: true,
            json: async () => ({
                choices: [
                    { message: { content: 'A brown dog sitting on the grass.' } }
                ]
            })
        }));
        globalThis.fetch = mockFetch as unknown as typeof fetch;

        const result = await generateOpenRouterDescription(
            'mockBase64String',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            'sk-or-v1-my-secret-key'
        );

        assert.equal(mockFetch.mock.callCount(), 1);
        const [url, options] = mockFetch.mock.calls[0].arguments as unknown as [string, RequestInit];
        const headers = options.headers as Record<string, string>;
        assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
        assert.equal(options.method, 'POST');
        assert.equal(headers['Authorization'], 'Bearer sk-or-v1-my-secret-key');
        assert.equal(headers['X-Title'], 'VisionVoice');
        assert.equal(headers['Content-Type'], 'application/json');

        assert.deepEqual(result, {
            success: true,
            text: 'A brown dog sitting on the grass.'
        });
    });

    it('should fail fast on 401 Unauthorized without cascading through all models', async () => {
        const mockFetch = mock.fn(async () => ({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            json: async () => ({
                error: { message: 'Invalid API key provided' }
            })
        }));
        globalThis.fetch = mockFetch as unknown as typeof fetch;

        const result = await generateOpenRouterDescription(
            'mockBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            'sk-or-v1-bad-key'
        );

        assert.equal(mockFetch.mock.callCount(), 1);
        assert.equal(result.success, false);
        if (!result.success) {
            assert.ok(result.error.includes('401'));
            assert.ok(result.error.includes('Invalid API key provided'));
        }
    });

    it('should fail fast on 402 Payment Required without cascading through all models', async () => {
        const mockFetch = mock.fn(async () => ({
            ok: false,
            status: 402,
            statusText: 'Payment Required',
            json: async () => ({
                error: { message: 'Insufficient credits on account' }
            })
        }));
        globalThis.fetch = mockFetch as unknown as typeof fetch;

        const result = await generateOpenRouterDescription(
            'mockBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            'sk-or-v1-no-credits-key'
        );

        assert.equal(mockFetch.mock.callCount(), 1);
        assert.equal(result.success, false);
        if (!result.success) {
            assert.ok(result.error.includes('402'));
            assert.ok(result.error.includes('Insufficient credits'));
        }
    });

    it('should cascade to the next model when first model encounters a transient 500 server error', async () => {
        let callIndex = 0;
        const mockFetch = mock.fn(async () => {
            callIndex += 1;
            if (callIndex === 1) {
                return {
                    ok: false,
                    status: 500,
                    statusText: 'Internal Server Error',
                    json: async () => ({ error: { message: 'Model provider overloaded' } })
                };
            }
            return {
                ok: true,
                json: async () => ({
                    choices: [
                        { message: { content: 'Fallback model succeeded: A red stop sign.' } }
                    ]
                })
            };
        });
        globalThis.fetch = mockFetch as unknown as typeof fetch;

        const result = await generateOpenRouterDescription(
            'mockBase64',
            'image/jpeg',
            Task.READ,
            'English',
            'sk-or-v1-valid-key'
        );

        assert.equal(mockFetch.mock.callCount(), 2);
        assert.deepEqual(result, {
            success: true,
            text: 'Fallback model succeeded: A red stop sign.'
        });
    });

    it('should strip safety classification headers and code blocks from model response', async () => {
        const mockFetch = mock.fn(async () => ({
            ok: true,
            json: async () => ({
                choices: [
                    { message: { content: 'User Safety: safe\n\n```markdown\nA clear glass bottle on a counter.\n```' } }
                ]
            })
        }));
        globalThis.fetch = mockFetch as unknown as typeof fetch;

        const result = await generateOpenRouterDescription(
            'mockBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            'sk-or-v1-valid-key'
        );

        assert.deepEqual(result, {
            success: true,
            text: 'A clear glass bottle on a counter.'
        });
    });

    it('should cascade and throw explicit error when OpenRouter returns empty HTTP 200 responses', async () => {
        const mockFetch = mock.fn(async () => ({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: '' } }]
            })
        }));
        globalThis.fetch = mockFetch as unknown as typeof fetch;

        const result = await generateOpenRouterDescription(
            'mockBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            'sk-or-v1-valid-key'
        );

        assert.equal(mockFetch.mock.callCount(), 5);
        assert.equal(result.success, false);
        if (!result.success) {
            assert.ok(result.error.includes('returned an empty response'));
        }
    });
});
