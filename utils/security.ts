/**
 * Security & Obfuscation Utilities for VisionVoice BYOK (Bring Your Own Key) Architecture.
 * Ensures API keys are sanitized, obfuscated in browser storage, and never leaked in error logs.
 */

const SALT = 'VV_SECURE_SALT_2026';

/**
 * Obfuscates a plain-text API key string before saving to localStorage.
 * Prevents raw keys from being visible in plain text in browser DevTools / Local Storage inspectors.
 */
export const obfuscateKey = (key: string): string => {
    if (!key) return '';
    try {
        const bytes = new TextEncoder().encode(key);
        const xored = Array.from(bytes, (byte, index) =>
            byte ^ SALT.charCodeAt(index % SALT.length)
        );
        return btoa(String.fromCharCode(...xored));
    } catch {
        return '';
    }
};

/**
 * Deobfuscates an API key retrieved from browser storage.
 */
export const deobfuscateKey = (obfuscated: string): string => {
    if (!obfuscated) return '';
    try {
        const decoded = atob(obfuscated);
        const bytes = Uint8Array.from(decoded, (char, index) =>
            char.charCodeAt(0) ^ SALT.charCodeAt(index % SALT.length)
        );
        return new TextDecoder().decode(bytes);
    } catch {
        return '';
    }
};

/**
 * Sanitizes input API keys to remove invalid control characters or whitespace.
 */
export const sanitizeKeyInput = (key: string | undefined): string => {
    if (!key) return '';
    return key.replace(/[\s\r\n\t]/g, '').trim();
};

/**
 * Sanitizes error messages to guarantee NO API key patterns, headers, or query parameters leak in logs or UI.
 */
export const sanitizeErrorMessage = (error: unknown): string => {
    if (!error) return 'An unknown error occurred.';
    let message = error instanceof Error ? error.message : String(error);

    // Scrub key patterns (specific prefixes before generic sk- fallback)
    message = message.replace(/sk-or-v1-[A-Za-z0-9_-]+/g, 'sk-or-v1-***');
    message = message.replace(/sk-rr-v1-[A-Za-z0-9_-]+/g, 'sk-rr-v1-***');
    message = message.replace(/\bsk-[A-Za-z0-9_-]{8,}/g, 'sk-***');
    message = message.replace(/AIzaSy[A-Za-z0-9_-]+/g, 'AIzaSy***');
    message = message.replace(/gsk_[A-Za-z0-9_-]+/g, 'gsk_***');
    message = message.replace(/key=[A-Za-z0-9_-]+/g, 'key=***');
    message = message.replace(/(x-goog-api-key|api_key)([=:\s]+)[A-Za-z0-9_-]+/gi, '$1$2***');
    message = message.replace(/Bearer\s+[A-Za-z0-9_.-]+/gi, 'Bearer ***');

    return message;
};

/**
 * Cleans AI-generated response text by stripping safety metadata headers,
 * system classification lines (e.g. "User Safety : safe", "Response Safety : safe"),
 * and markdown code fence wrappers.
 */
export const cleanAIResponseText = (text: string): string => {
    if (!text) return '';
    return text
        .replace(/^(User|Response|Input|Output|Model)?\s*Safety\s*:\s*\w+\s*/gmi, '')
        .replace(/^(User|Response|Input|Output)\s*Safety\s*:\s*\w+$/gmi, '')
        .replace(/User Safety\s*:\s*\w+/gi, '')
        .replace(/Response Safety\s*:\s*\w+/gi, '')
        .trim()
        .replace(/^```[a-z]*\n?/gi, '')
        .replace(/\n?```$/gi, '')
        .trim();
};
