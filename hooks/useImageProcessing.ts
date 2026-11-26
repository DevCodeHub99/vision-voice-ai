import { useState, useCallback, useRef, useEffect } from 'react';
import { generateDescription } from '../services/aiService';
import { Task, UserSettings } from '../types';
import { LANGUAGES } from '../constants';

interface UseImageProcessingProps {
    language: string;
    userSettings?: UserSettings;
    onStartProcessing: () => void;
    onSuccess: (result: string) => void;
    onError: (error: string) => void;
}

/**
 * Custom hook to manage image processing state and AI service integration.
 * Tracks request generations and aborts in-flight requests on reset or superseding captures.
 */
export const useImageProcessing = ({ language, userSettings, onStartProcessing, onSuccess, onError }: UseImageProcessingProps) => {
    const [image, setImage] = useState<string | null>(null);
    const [output, setOutput] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const requestIdRef = useRef<number>(0);
    const abortControllerRef = useRef<AbortController | null>(null);

    const processImage = useCallback(async (imgData: string, mimeType: string, task: Task) => {
        requestIdRef.current += 1;
        const currentRequestId = requestIdRef.current;

        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setImage(imgData);
        setOutput('');
        setError(null);
        setIsLoading(true);

        onStartProcessing();

        const base64Data = imgData.split(',')[1] || '';
        const selectedLanguage = LANGUAGES.find(l => l.code === language);

        try {
            const result = await generateDescription(
                base64Data,
                mimeType,
                task,
                selectedLanguage?.name || 'English',
                userSettings,
                undefined,
                controller.signal
            );

            if (currentRequestId !== requestIdRef.current || controller.signal.aborted) {
                return;
            }

            setIsLoading(false);
            if (result.success) {
                setOutput(result.text);
                setError(null);
                onSuccess(result.text);
            } else {
                setError(result.error);
                onError(result.error);
            }
        } catch {
            if (currentRequestId !== requestIdRef.current || controller.signal.aborted) {
                return;
            }
            const errorMsg = "Something went wrong during image processing.";
            setError(errorMsg);
            setIsLoading(false);
            onError(errorMsg);
        }
    }, [language, userSettings, onStartProcessing, onSuccess, onError]);

    const reset = useCallback(() => {
        requestIdRef.current += 1;
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        setImage(null);
        setOutput('');
        setError(null);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
        };
    }, []);

    return {
        image,
        output,
        isLoading,
        error,
        processImage,
        reset
    };
};
