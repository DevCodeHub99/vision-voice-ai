import { useState, useEffect, useRef, useCallback } from 'react';

// SpeechRecognition type declarations for browsers
interface SpeechRecognitionEventLike extends Event {
    resultIndex: number;
    results: {
        [index: number]: {
            [index: number]: {
                transcript: string;
            };
            isFinal: boolean;
        };
        length: number;
    };
}

interface SpeechRecognitionLike extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: ((event: Event) => void) | null;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
}

declare global {
    interface Window {
        SpeechRecognition?: {
            new (): SpeechRecognitionLike;
        };
        webkitSpeechRecognition?: {
            new (): SpeechRecognitionLike;
        };
    }
}

interface UseVoiceCommandsProps {
    onDescribe: () => void;
    onReadText: () => void;
    onCapture: () => void;
    onStop: () => void;
    onRepeat: () => void;
    speakAnnouncement: (text: string) => void;
    triggerHaptic: (pattern?: number | number[]) => void;
    language?: string;
}

export const useVoiceCommands = ({
    onDescribe,
    onReadText,
    onCapture,
    onStop,
    onRepeat,
    speakAnnouncement,
    triggerHaptic,
    language = 'en-US'
}: UseVoiceCommandsProps) => {
    const [isListening, setIsListening] = useState<boolean>(false);
    const [isSupported, setIsSupported] = useState<boolean>(false);
    const [lastCommand, setLastCommand] = useState<string>('');
    const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
    const activeListeningRef = useRef<boolean>(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
            setIsSupported(Boolean(SpeechRecognitionClass));
        }
    }, []);

    const handleCommand = useCallback((transcript: string) => {
        const text = transcript.toLowerCase().trim();
        setLastCommand(text);

        // Command: Describe Scene
        if (text.includes('describe') || text.includes('scene')) {
            triggerHaptic();
            onDescribe();
            return;
        }

        // Command: Read Text (OCR)
        if (text.includes('read') || text.includes('text')) {
            triggerHaptic();
            onReadText();
            return;
        }

        // Command: Capture Image
        if (text.includes('capture') || text.includes('photo') || text.includes('picture') || text.includes('snap') || text.includes('click')) {
            triggerHaptic();
            onCapture();
            return;
        }

        // Command: Stop Speech
        if (text.includes('stop') || text.includes('quiet') || text.includes('silence')) {
            triggerHaptic();
            onStop();
            speakAnnouncement("Speech stopped.");
            return;
        }

        // Command: Repeat / Replay
        if (text.includes('repeat') || text.includes('again') || text.includes('replay')) {
            triggerHaptic();
            onRepeat();
            return;
        }
    }, [onDescribe, onReadText, onCapture, onStop, onRepeat, triggerHaptic, speakAnnouncement]);

    const stopListening = useCallback(() => {
        activeListeningRef.current = false;
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch {
                // ignore
            }
        }
        setIsListening(false);
    }, []);

    const startListening = useCallback(() => {
        if (typeof window === 'undefined') return;
        const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionClass) {
            speakAnnouncement("Voice recognition is not supported in this browser.");
            return;
        }

        stopListening();

        try {
            const recognition = new SpeechRecognitionClass();
            recognition.continuous = true;
            recognition.interimResults = false;
            recognition.lang = language || 'en-US';

            recognition.onstart = () => {
                setIsListening(true);
                activeListeningRef.current = true;
            };

            recognition.onresult = (event: SpeechRecognitionEventLike) => {
                const current = event.resultIndex;
                const transcript = event.results[current][0].transcript;
                if (transcript) {
                    handleCommand(transcript);
                }
            };

            recognition.onerror = () => {
                // Ignore transient errors
            };

            recognition.onend = () => {
                // If user didn't explicitly stop listening, auto-restart continuous listener
                if (activeListeningRef.current) {
                    try {
                        recognition.start();
                    } catch {
                        setIsListening(false);
                        activeListeningRef.current = false;
                    }
                } else {
                    setIsListening(false);
                }
            };

            recognitionRef.current = recognition;
            recognition.start();
            triggerHaptic(50);
            speakAnnouncement("Voice commands active. Say describe, read, or capture.");
        } catch {
            setIsListening(false);
            activeListeningRef.current = false;
            speakAnnouncement("Unable to start voice recognition.");
        }
    }, [language, stopListening, handleCommand, triggerHaptic, speakAnnouncement]);

    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
            triggerHaptic(50);
            speakAnnouncement("Voice commands disabled.");
        } else {
            startListening();
        }
    }, [isListening, stopListening, startListening, triggerHaptic, speakAnnouncement]);

    useEffect(() => {
        return () => {
            activeListeningRef.current = false;
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch {
                    // ignore
                }
            }
        };
    }, []);

    return {
        isListening,
        isSupported,
        lastCommand,
        startListening,
        stopListening,
        toggleListening
    };
};
