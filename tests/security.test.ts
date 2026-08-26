import { describe, it, expect } from 'vitest';
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
            expect(obfuscated).not.toBe(key);
            expect(typeof obfuscated).toBe('string');
            expect(deobfuscateKey(obfuscated)).toBe(key);
        });

        it('should round-trip obfuscate and deobfuscate a Google Gemini API key accurately', () => {
            const key = 'AIzaSyDa-example-gemini-key_12345';
            const obfuscated = obfuscateKey(key);
            expect(obfuscated).not.toBe(key);
            expect(deobfuscateKey(obfuscated)).toBe(key);
        });

        it('should return an empty string when given empty or invalid input', () => {
            expect(obfuscateKey('')).toBe('');
            expect(deobfuscateKey('')).toBe('');
            expect(deobfuscateKey('!!!invalid-base64!!!')).toBe('');
        });
    });

    describe('sanitizeKeyInput', () => {
        it('should strip all whitespace, tabs, and newlines from input', () => {
            const dirty = '  sk-or-v1 \n 12345 \t abcde \r ';
            expect(sanitizeKeyInput(dirty)).toBe('sk-or-v112345abcde');
        });

        it('should return an empty string for undefined or empty input', () => {
            expect(sanitizeKeyInput(undefined)).toBe('');
            expect(sanitizeKeyInput('')).toBe('');
        });
    });

    describe('sanitizeErrorMessage', () => {
        it('should scrub OpenRouter API keys from error messages', () => {
            const err = new Error('Failed to connect with key sk-or-v1-abcde1234567890_xyz');
            const sanitized = sanitizeErrorMessage(err);
            expect(sanitized).not.toContain('sk-or-v1-abcde1234567890_xyz');
            expect(sanitized).toContain('sk-or-v1-***');
        });

        it('should scrub Gemini API keys from error messages', () => {
            const err = 'Google API error at url https://generativelanguage.googleapis.com?key=AIzaSyA123_456-test';
            const sanitized = sanitizeErrorMessage(err);
            expect(sanitized).not.toContain('AIzaSyA123_456-test');
            expect(sanitized).toContain('key=***');
        });

        it('should scrub Bearer authentication headers', () => {
            const err = 'HTTP 401 Unauthorized with header Bearer sk-or-v1-mysecretkey';
            const sanitized = sanitizeErrorMessage(err);
            expect(sanitized).not.toContain('mysecretkey');
            expect(sanitized).toContain('Bearer ***');
        });

        it('should return a default message when error is falsy', () => {
            expect(sanitizeErrorMessage(null)).toBe('An unknown error occurred.');
            expect(sanitizeErrorMessage(undefined)).toBe('An unknown error occurred.');
        });
    });

    describe('cleanAIResponseText', () => {
        it('should strip safety classification headers', () => {
            const raw = 'User Safety: safe\nResponse Safety: safe\nA blue ceramic cup on a desk.';
            const cleaned = cleanAIResponseText(raw);
            expect(cleaned).toBe('A blue ceramic cup on a desk.');
        });

        it('should strip markdown code block backticks', () => {
            const raw = '```text\nExit door on the left with emergency sign.\n```';
            const cleaned = cleanAIResponseText(raw);
            expect(cleaned).toBe('Exit door on the left with emergency sign.');
        });

        it('should return an empty string when given empty text', () => {
            expect(cleanAIResponseText('')).toBe('');
        });
    });
});
