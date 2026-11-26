import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    obfuscateKey,
    deobfuscateKey,
    sanitizeKeyInput,
    sanitizeErrorMessage,
    cleanAIResponseText
} from '../utils/security';

describe('Security Utilities', () => {
    describe('obfuscateKey & deobfuscateKey', () => {
        it('should round-trip obfuscate and deobfuscate an OpenRouter API key accurately', () => {
            const key = 'sk-or-v1-abcdef1234567890-test-key';
            const obfuscated = obfuscateKey(key);
            assert.notEqual(obfuscated, key);
            assert.equal(typeof obfuscated, 'string');
            assert.equal(deobfuscateKey(obfuscated), key);
        });

        it('should round-trip obfuscate and deobfuscate a Google Gemini API key accurately', () => {
            const key = 'AIzaSyDa-example-gemini-key_12345';
            const obfuscated = obfuscateKey(key);
            assert.notEqual(obfuscated, key);
            assert.equal(deobfuscateKey(obfuscated), key);
        });

        it('should return an empty string when given empty or invalid input', () => {
            assert.equal(obfuscateKey(''), '');
            assert.equal(deobfuscateKey(''), '');
            assert.equal(deobfuscateKey('!!!invalid-base64!!!'), '');
        });
    });

    describe('sanitizeKeyInput', () => {
        it('should strip all whitespace, tabs, and newlines from input', () => {
            const dirty = '  sk-or-v1 \n 12345 \t abcde \r ';
            assert.equal(sanitizeKeyInput(dirty), 'sk-or-v112345abcde');
        });

        it('should return an empty string for undefined or empty input', () => {
            assert.equal(sanitizeKeyInput(undefined), '');
            assert.equal(sanitizeKeyInput(''), '');
        });
    });

    describe('sanitizeErrorMessage', () => {
        it('should scrub OpenRouter API keys from error messages', () => {
            const err = new Error('Failed to connect with key sk-or-v1-abcde1234567890_xyz');
            const sanitized = sanitizeErrorMessage(err);
            assert.equal(sanitized.includes('sk-or-v1-abcde1234567890_xyz'), false);
            assert.ok(sanitized.includes('sk-or-v1-***'));
        });

        it('should scrub Google Gemini AQ. and AIzaSy API keys from error messages', () => {
            const err = 'Google API error at url https://generativelanguage.googleapis.com?key=AIzaSyA123_456-test';
            const aqErr = 'Gemini auth error for key AQ.ExampleTestKey_123.456';
            const sanitized = sanitizeErrorMessage(err);
            const sanitizedAq = sanitizeErrorMessage(aqErr);
            assert.equal(sanitized.includes('AIzaSyA123_456-test'), false);
            assert.ok(sanitized.includes('key=***'));
            assert.equal(sanitizedAq.includes('AQ.ExampleTestKey_123.456'), false);
            assert.ok(sanitizedAq.includes('AQ.***'));
        });

        it('should scrub Bearer authentication headers', () => {
            const err = 'HTTP 401 Unauthorized with header Bearer sk-or-v1-mysecretkey';
            const sanitized = sanitizeErrorMessage(err);
            assert.equal(sanitized.includes('mysecretkey'), false);
            assert.ok(sanitized.includes('Bearer ***'));
        });

        it('should scrub Groq and Rapid Router API keys from error messages', () => {
            const groqErr = new Error('Groq auth failed for gsk_AbCdEf1234567890');
            const rrErr = new Error('Rapid Router failed with sk-rr-v1-abc123456789');
            const sanitizedGroq = sanitizeErrorMessage(groqErr);
            const sanitizedRr = sanitizeErrorMessage(rrErr);
            assert.equal(sanitizedGroq.includes('gsk_AbCdEf1234567890'), false);
            assert.ok(sanitizedGroq.includes('gsk_***'));
            assert.equal(sanitizedRr.includes('sk-rr-v1-abc123456789'), false);
            assert.ok(sanitizedRr.includes('sk-rr-v1-***'));
        });

        it('should return a default message when error is falsy', () => {
            assert.equal(sanitizeErrorMessage(null), 'An unknown error occurred.');
            assert.equal(sanitizeErrorMessage(undefined), 'An unknown error occurred.');
        });
    });

    describe('cleanAIResponseText', () => {
        it('should strip safety classification headers', () => {
            const raw = 'User Safety: safe\nResponse Safety: safe\nA blue ceramic cup on a desk.';
            const cleaned = cleanAIResponseText(raw);
            assert.equal(cleaned, 'A blue ceramic cup on a desk.');
        });

        it('should strip markdown code block backticks even with surrounding whitespace', () => {
            const raw = '  \n```text\nExit door on the left with emergency sign.\n```\n  ';
            const cleaned = cleanAIResponseText(raw);
            assert.equal(cleaned, 'Exit door on the left with emergency sign.');
        });

        it('should return an empty string when given empty text', () => {
            assert.equal(cleanAIResponseText(''), '');
        });
    });
});
