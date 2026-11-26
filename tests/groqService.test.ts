import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { generateGroqDescription } from '../services/groqService';
import { Task } from '../types';

describe('groqService', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('should return error when no Groq API key is provided', async () => {
        const result = await generateGroqDescription(
            'fakeBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            ''
        );

        assert.equal(result.success, false);
        if (!result.success) {
            assert.ok(result.error.includes('No Groq API key configured'));
        }
    });

    it('should call Groq OpenAI-compatible endpoint with Bearer token and reasoning_effort none for qwen3.8', async () => {
        const mockFetch = mock.fn(async () => ({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'A crosswalk ahead with a green pedestrian signal.' } }]
            })
        }));
        globalThis.fetch = mockFetch as unknown as typeof fetch;

        const result = await generateGroqDescription(
            'mockBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            'gsk_test_key_12345',
            'qwen/qwen3.8-27b'
        );

        assert.equal(mockFetch.mock.callCount(), 1);
        const [url, options] = mockFetch.mock.calls[0].arguments as unknown as [string, RequestInit];
        const headers = options.headers as Record<string, string>;
        const body = JSON.parse(options.body as string);
        assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
        assert.equal(headers['Authorization'], 'Bearer gsk_test_key_12345');
        assert.equal(headers['HTTP-Referer'], undefined);
        assert.equal(body.model, 'qwen/qwen3.8-27b');
        assert.equal(body.reasoning_effort, 'none');
        assert.deepEqual(result, {
            success: true,
            text: 'A crosswalk ahead with a green pedestrian signal.'
        });
    });

    it('should reject oversized base64 payloads exceeding Groq limit', async () => {
        const hugeBase64 = 'A'.repeat(3_900_000);
        const result = await generateGroqDescription(
            hugeBase64,
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            'gsk_test_key_12345'
        );

        assert.equal(result.success, false);
        if (!result.success) {
            assert.ok(result.error.includes('size limit'));
        }
    });

    it('should fail fast on 401 Unauthorized without cascading', async () => {
        const mockFetch = mock.fn(async () => ({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            json: async () => ({ error: { message: 'Invalid Groq API Key' } })
        }));
        globalThis.fetch = mockFetch as unknown as typeof fetch;

        const result = await generateGroqDescription(
            'mockBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            'gsk_invalid'
        );

        assert.equal(mockFetch.mock.callCount(), 1);
        assert.equal(result.success, false);
        if (!result.success) {
            assert.ok(result.error.includes('Groq 401'));
        }
    });

    it('should cascade on 500 and handle empty HTTP 200 responses explicitly', async () => {
        let callIndex = 0;
        const mockFetch = mock.fn(async () => {
            callIndex += 1;
            if (callIndex === 1) {
                return {
                    ok: false,
                    status: 500,
                    statusText: 'Internal Server Error',
                    json: async () => ({ error: { message: 'Temporary overload' } })
                };
            }
            return {
                ok: true,
                json: async () => ({ choices: [{ message: { content: 'Stairs descending directly ahead.' } }] })
            };
        });
        globalThis.fetch = mockFetch as unknown as typeof fetch;

        const result = await generateGroqDescription(
            'mockBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            'gsk_valid'
        );

        assert.equal(mockFetch.mock.callCount(), 2);
        assert.deepEqual(result, {
            success: true,
            text: 'Stairs descending directly ahead.'
        });
    });
});
