import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { generateGeminiDescription } from '../services/geminiService';
import { Task } from '../types';

describe('geminiService Security & Header Authentication', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('should send the API key via x-goog-api-key header and NOT in URL query parameters', async () => {
        const fakeApiKey = 'AIzaSyExampleSecureKey12345';
        const mockFetch = mock.fn(async () => ({
            ok: true,
            json: async () => ({
                candidates: [
                    {
                        content: {
                            parts: [{ text: 'A clean wooden desk with a laptop.' }]
                        }
                    }
                ]
            })
        }));

        globalThis.fetch = mockFetch as unknown as typeof fetch;

        const result = await generateGeminiDescription(
            'fakeBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            fakeApiKey,
            'gemini-3.8-flash'
        );

        assert.equal(result.success, true);
        assert.equal(mockFetch.mock.callCount(), 1);

        const [requestUrl, requestOptions] = mockFetch.mock.calls[0].arguments as unknown as [string, RequestInit];

        assert.equal(requestUrl.includes(fakeApiKey), false);
        assert.equal(requestUrl.includes('?key='), false);
        assert.equal(requestUrl, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');

        const headers = requestOptions.headers as Record<string, string>;
        assert.ok(headers);
        assert.equal(headers['x-goog-api-key'], fakeApiKey);
        const body = JSON.parse(requestOptions.body as string);
        assert.equal(body.generationConfig.maxOutputTokens, 1024);
        assert.deepEqual(body.generationConfig.thinkingConfig, { thinkingLevel: 'minimal' });
    });

    it('should reject invalid keys that do not start with AIzaSy', async () => {
        const result = await generateGeminiDescription(
            'fakeBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            'invalid-key-prefix',
            'gemini-3.8-flash'
        );

        assert.equal(result.success, false);
        if (!result.success) {
            assert.ok(result.error.includes("must start with 'AIzaSy...'"));
        }
    });

    it('should reject malformed custom model IDs with path traversal or query characters', async () => {
        const result = await generateGeminiDescription(
            'fakeBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            'AIzaSyExampleKey123',
            'gemini-3.8-flash?alt=sse'
        );

        assert.equal(result.success, false);
        if (!result.success) {
            assert.ok(result.error.includes('Invalid Gemini model ID format'));
        }
    });

    it('should cascade to gemini-3.1-flash-lite if gemini-3.8-flash fails with 503 service unavailable', async () => {
        const fakeApiKey = 'AIzaSyFallbackKey777888';
        let callIndex = 0;
        const mockFetch = mock.fn(async () => {
            callIndex += 1;
            if (callIndex === 1) {
                return {
                    ok: false,
                    status: 503,
                    statusText: 'Service Unavailable',
                    json: async () => ({ error: { message: 'High load on primary flash' } })
                };
            }
            return {
                ok: true,
                json: async () => ({
                    candidates: [
                        {
                            content: {
                                parts: [
                                    { thought: true, text: 'Internal reasoning text' },
                                    { text: 'Flash Lite succeeded: A white ceramic mug.' }
                                ]
                            }
                        }
                    ]
                })
            };
        });

        globalThis.fetch = mockFetch as unknown as typeof fetch;

        const result = await generateGeminiDescription(
            'fakeBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            fakeApiKey
        );

        assert.equal(mockFetch.mock.callCount(), 2);
        assert.ok((mockFetch.mock.calls[0].arguments as unknown as [string])[0].includes('gemini-3.8-flash'));
        assert.ok((mockFetch.mock.calls[1].arguments as unknown as [string])[0].includes('gemini-3.1-flash-lite'));

        assert.deepEqual(result, {
            success: true,
            text: 'Flash Lite succeeded: A white ceramic mug.'
        });
    });

    it('should strip safety classification and code fences from Gemini responses', async () => {
        const fakeApiKey = 'AIzaSyCleanTextKey999';
        const mockFetch = mock.fn(async () => ({
            ok: true,
            json: async () => ({
                candidates: [
                    {
                        content: {
                            parts: [{ text: 'User Safety: safe\n```\nSign on the door says: Emergency Exit Only.\n```' }]
                        }
                    }
                ]
            })
        }));

        globalThis.fetch = mockFetch as unknown as typeof fetch;

        const result = await generateGeminiDescription(
            'fakeBase64',
            'image/jpeg',
            Task.READ,
            'English',
            fakeApiKey
        );

        assert.deepEqual(result, {
            success: true,
            text: 'Sign on the door says: Emergency Exit Only.'
        });
    });

    it('should fail fast on 401/403 auth errors without cascading through all Gemini models', async () => {
        const mockFetch = mock.fn(async () => ({
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            json: async () => ({ error: { message: 'API key not valid' } })
        }));
        globalThis.fetch = mockFetch as unknown as typeof fetch;

        const result = await generateGeminiDescription(
            'fakeBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            'AIzaSyInvalidKey999'
        );

        assert.equal(mockFetch.mock.callCount(), 1);
        assert.equal(result.success, false);
        if (!result.success) {
            assert.ok(result.error.includes('Gemini 403'));
        }
    });

    it('should surface explicit error when Gemini returns empty HTTP 200 responses across cascade', async () => {
        const mockFetch = mock.fn(async () => ({
            ok: true,
            json: async () => ({
                candidates: [{ content: { parts: [{ text: '   ' }] } }]
            })
        }));
        globalThis.fetch = mockFetch as unknown as typeof fetch;

        const result = await generateGeminiDescription(
            'fakeBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            'AIzaSyValidKey999'
        );

        assert.equal(mockFetch.mock.callCount(), 3);
        assert.equal(result.success, false);
        if (!result.success) {
            assert.ok(result.error.includes('returned an empty response'));
        }
    });
});
