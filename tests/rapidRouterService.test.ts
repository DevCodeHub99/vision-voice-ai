import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { generateRapidRouterDescription } from '../services/rapidRouterService';
import { Task } from '../types';

describe('rapidRouterService', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('should return error when no Rapid Router API key is provided', async () => {
        const result = await generateRapidRouterDescription(
            'fakeBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            ''
        );

        assert.equal(result.success, false);
        if (!result.success) {
            assert.ok(result.error.includes('No Rapid Router API key configured'));
        }
    });

    it('should send Bearer auth and referer headers to rapidrouter.ai', async () => {
        const mockFetch = mock.fn(async () => ({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'Exit door clearly marked to the right.' } }]
            })
        }));
        globalThis.fetch = mockFetch as unknown as typeof fetch;

        const result = await generateRapidRouterDescription(
            'mockBase64',
            'image/jpeg',
            Task.READ,
            'English',
            'rr-test-key-123',
            'google/gemma-4-31b-it:free'
        );

        assert.equal(mockFetch.mock.callCount(), 1);
        const [url, options] = mockFetch.mock.calls[0].arguments as unknown as [string, RequestInit];
        const headers = options.headers as Record<string, string>;
        assert.equal(url, 'https://rapidrouter.ai/api/v1/chat/completions');
        assert.equal(headers['Authorization'], 'Bearer rr-test-key-123');
        assert.equal(headers['X-Title'], 'VisionVoice');
        assert.deepEqual(result, {
            success: true,
            text: 'Exit door clearly marked to the right.'
        });
    });

    it('should fail fast on 402 payment/limit errors without cascading', async () => {
        const mockFetch = mock.fn(async () => ({
            ok: false,
            status: 402,
            statusText: 'Payment Required',
            json: async () => ({ error: { message: 'Balance depleted' } })
        }));
        globalThis.fetch = mockFetch as unknown as typeof fetch;

        const result = await generateRapidRouterDescription(
            'mockBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            'rr-test-key'
        );

        assert.equal(mockFetch.mock.callCount(), 1);
        assert.equal(result.success, false);
        if (!result.success) {
            assert.ok(result.error.includes('Rapid Router 402'));
        }
    });

    it('should report empty response explicitly when all cascade models return blank content', async () => {
        const mockFetch = mock.fn(async () => ({
            ok: true,
            json: async () => ({ choices: [{ message: { content: '' } }] })
        }));
        globalThis.fetch = mockFetch as unknown as typeof fetch;

        const result = await generateRapidRouterDescription(
            'mockBase64',
            'image/jpeg',
            Task.DESCRIBE,
            'English',
            'rr-test-key'
        );

        assert.equal(mockFetch.mock.callCount(), 2);
        assert.equal(result.success, false);
        if (!result.success) {
            assert.ok(result.error.includes('returned an empty response'));
        }
    });
});
