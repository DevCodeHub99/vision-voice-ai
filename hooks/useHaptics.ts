import { useCallback } from 'react';

/**
 * Custom hook for tactile haptic feedback.
 * Uses useCallback to provide a stable reference across parent component re-renders.
 */
export const useHaptics = () => {
    const triggerHaptic = useCallback((pattern: number | number[] = 50) => {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try {
                navigator.vibrate(pattern);
            } catch {
                // Ignore vibration failure
            }
        }
    }, []);

    return {
        triggerHaptic
    };
};
