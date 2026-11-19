import { describe, it, expect, vi, beforeEach } from 'vitest';
import ErrorBoundary from '../components/ErrorBoundary';

describe('ErrorBoundary', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.unstubAllGlobals();
    });

    it('should derive state with error on getDerivedStateFromError', () => {
        const testError = new Error('Camera device crashed unexpectedly');
        const state = ErrorBoundary.getDerivedStateFromError(testError);

        expect(state).toEqual({
            hasError: true,
            error: testError
        });
    });

    it('should vocalize an announcement via window.speechSynthesis in componentDidCatch', () => {
        const mockSpeak = vi.fn();
        const mockCancel = vi.fn();

        const fakeWindow = {
            speechSynthesis: {
                speak: mockSpeak,
                cancel: mockCancel
            }
        };
        vi.stubGlobal('window', fakeWindow);

        class MockSpeechSynthesisUtterance {
            text: string;
            rate: number = 1.0;
            constructor(text: string) {
                this.text = text;
            }
        }
        vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance);

        const boundary = new ErrorBoundary({ children: null });
        const testError = new Error('WebGL context loss');
        const errorInfo = { componentStack: 'at VideoStream (CameraCapture.tsx:42)' };

        boundary.componentDidCatch(testError, errorInfo);

        expect(mockCancel).toHaveBeenCalledTimes(1);
        expect(mockSpeak).toHaveBeenCalledTimes(1);

        const [utterance] = mockSpeak.mock.calls[0];
        expect(utterance.text).toContain('VisionVoice encountered an unexpected problem');

        vi.unstubAllGlobals();
    });

    it('should degrade gracefully if window is undefined or speechSynthesis is unavailable', () => {
        vi.unstubAllGlobals();

        const boundary = new ErrorBoundary({ children: null });
        const testError = new Error('Critical failure');
        const errorInfo = { componentStack: 'at App (App.tsx:10)' };

        expect(() => {
            boundary.componentDidCatch(testError, errorInfo);
        }).not.toThrow();
    });
});
