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
});
