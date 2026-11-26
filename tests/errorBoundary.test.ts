import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import ErrorBoundary from '../components/ErrorBoundary';

describe('ErrorBoundary', () => {
    const originalWindow = globalThis.window;
    const originalUtterance = globalThis.SpeechSynthesisUtterance;

    afterEach(() => {
        if (originalWindow === undefined) {
            delete (globalThis as Record<string, unknown>).window;
        } else {
            globalThis.window = originalWindow;
        }
        if (originalUtterance === undefined) {
            delete (globalThis as Record<string, unknown>).SpeechSynthesisUtterance;
        } else {
            globalThis.SpeechSynthesisUtterance = originalUtterance;
        }
    });

    it('should derive state with error on getDerivedStateFromError', () => {
        const testError = new Error('Camera device crashed unexpectedly');
        const state = ErrorBoundary.getDerivedStateFromError(testError);

        assert.deepEqual(state, {
            hasError: true,
            error: testError
        });
    });

    it('should vocalize an announcement via window.speechSynthesis in componentDidCatch', () => {
        const mockSpeak = mock.fn();
        const mockCancel = mock.fn();

        (globalThis as Record<string, unknown>).window = {
            speechSynthesis: {
                speak: mockSpeak,
                cancel: mockCancel
            }
        };

        class MockSpeechSynthesisUtterance {
            text: string;
            rate: number = 1.0;
            constructor(text: string) {
                this.text = text;
            }
        }
        (globalThis as Record<string, unknown>).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;

        const boundary = new ErrorBoundary({ children: null });
        const testError = new Error('WebGL context loss');
        const errorInfo = { componentStack: 'at VideoStream (CameraCapture.tsx:42)' };

        boundary.componentDidCatch(testError, errorInfo);

        assert.equal(mockCancel.mock.callCount(), 1);
        assert.equal(mockSpeak.mock.callCount(), 1);

        const [utterance] = mockSpeak.mock.calls[0].arguments as [MockSpeechSynthesisUtterance];
        assert.ok(utterance.text.includes('VisionVoice encountered an unexpected problem'));
    });

    it('should degrade gracefully if window is undefined or speechSynthesis is unavailable', () => {
        delete (globalThis as Record<string, unknown>).window;

        const boundary = new ErrorBoundary({ children: null });
        const testError = new Error('Critical failure');
        const errorInfo = { componentStack: 'at App (App.tsx:10)' };

        assert.doesNotThrow(() => {
            boundary.componentDidCatch(testError, errorInfo);
        });
    });
});
