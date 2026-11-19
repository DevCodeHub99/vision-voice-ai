import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateGeminiDescription } from '../services/geminiService';
import { Task } from '../types';

describe('geminiService Security & Header Authentication', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('should send the API key via x-goog-api-key header and NOT in URL query parameters', async () => {
        const fakeApiKey = 'AIzaSyExampleSecureKey12345';
        const mockFetch = vi.fn().mockResolvedValue({
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
        });

        vi.stubGlobal('fetch', mockFetch);

        const result = await generateGeminiDescription(
            'fakeBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            fakeApiKey,
            'gemini-2.5-flash'
        );

        expect(result.success).toBe(true);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        const [requestUrl, requestOptions] = mockFetch.mock.calls[0];

        // Ensure key is NOT in query param
        expect(requestUrl).not.toContain(fakeApiKey);
        expect(requestUrl).not.toContain('?key=');
        expect(requestUrl).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');

        // Ensure key IS in the official Google header
        expect(requestOptions.headers).toBeDefined();
        expect(requestOptions.headers['x-goog-api-key']).toBe(fakeApiKey);
    });

    it('should reject invalid keys that do not start with AIzaSy', async () => {
        const result = await generateGeminiDescription(
            'fakeBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            'invalid-key-prefix',
            'gemini-2.5-flash'
        );

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toContain("must start with 'AIzaSy...'");
        }
    });

    it('should cascade to gemini-2.5-flash-lite if gemini-2.5-flash fails with 503 service unavailable', async () => {
        const fakeApiKey = 'AIzaSyFallbackKey777888';
        const mockFetch = vi.fn()
            .mockResolvedValueOnce({
                ok: false,
                status: 503,
                statusText: 'Service Unavailable',
                json: async () => ({ error: { message: 'High load on primary flash' } })
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [
                        {
                            content: {
                                parts: [{ text: 'Flash Lite succeeded: A white ceramic mug.' }]
                            }
                        }
                    ]
                })
            });

        vi.stubGlobal('fetch', mockFetch);

        const result = await generateGeminiDescription(
            'fakeBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            fakeApiKey
        );

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(mockFetch.mock.calls[0][0]).toContain('gemini-2.5-flash');
        expect(mockFetch.mock.calls[1][0]).toContain('gemini-2.5-flash-lite');

        expect(result).toEqual({
            success: true,
            text: 'Flash Lite succeeded: A white ceramic mug.'
        });
    });

    it('should strip safety classification and code fences from Gemini responses', async () => {
        const fakeApiKey = 'AIzaSyCleanTextKey999';
        const mockFetch = vi.fn().mockResolvedValue({
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
        });

        vi.stubGlobal('fetch', mockFetch);

        const result = await generateGeminiDescription(
            'fakeBase64',
            'image/jpeg',
            Task.READ,
            'English',
            fakeApiKey
        );

        expect(result).toEqual({
            success: true,
            text: 'Sign on the door says: Emergency Exit Only.'
        });
    });
});
