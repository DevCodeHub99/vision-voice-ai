import { useRef, useCallback, useEffect, useState } from 'react';

interface UseSpeechProps {
    language: string;
}

/**
 * Custom hook to manage Text-to-Speech (TTS) functionality.
 * Provides methods for results reading and situational announcements with
 * keep-alive heartbeat support for mobile browsers (iOS Safari / Android Chrome).
 * 
 * @param props - Configuration properties.
 * @param props.language - The current BCP 47 language code for synthesized speech.
 */
export const useSpeech = ({ language }: UseSpeechProps) => {
    const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const keepAliveTimerRef = useRef<number | null>(null);

    const stopKeepAlive = useCallback(() => {
        if (keepAliveTimerRef.current !== null) {
            clearInterval(keepAliveTimerRef.current);
            keepAliveTimerRef.current = null;
        }
    }, []);

    const startKeepAlive = useCallback(() => {
        stopKeepAlive();
        keepAliveTimerRef.current = window.setInterval(() => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
                    window.speechSynthesis.pause();
                    window.speechSynthesis.resume();
                }
            }
        }, 10000);
    }, [stopKeepAlive]);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        const updateVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            if (availableVoices.length > 0) {
                setVoices(availableVoices);
            }
        };

        updateVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = updateVoices;
        }

        // Retry once after a brief delay for browsers that load voices asynchronously
        const timer = setTimeout(updateVoices, 300);

        return () => {
            clearTimeout(timer);
            if (window.speechSynthesis) {
                window.speechSynthesis.onvoiceschanged = null;
            }
        };
    }, []);

    const speakAnnouncement = useCallback((text: string) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        stopKeepAlive();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;

        utterance.onstart = () => {
            setIsSpeaking(true);
        };
        utterance.onend = () => {
            setIsSpeaking(false);
            utteranceRef.current = null;
        };
        utterance.onerror = () => {
            setIsSpeaking(false);
            utteranceRef.current = null;
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, [stopKeepAlive]);

    const speak = useCallback((text: string, lang: string) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        window.speechSynthesis.cancel();
        stopKeepAlive();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.9;

        // Attempt to match exact language tag or prefix
        const langPrefix = lang.split('-')[0];
        const matchedVoice = voices.find((v: SpeechSynthesisVoice) => v.lang === lang) || voices.find((v: SpeechSynthesisVoice) => v.lang.startsWith(langPrefix));
        if (matchedVoice) {
            utterance.voice = matchedVoice;
        }

        utterance.onstart = () => {
            setIsSpeaking(true);
            startKeepAlive();
        };
        utterance.onend = () => {
            setIsSpeaking(false);
            stopKeepAlive();
            utteranceRef.current = null;
        };
        utterance.onerror = () => {
            setIsSpeaking(false);
            stopKeepAlive();
            utteranceRef.current = null;
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, [voices, startKeepAlive, stopKeepAlive]);

    const toggleSpeech = useCallback((text: string) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        if (isSpeaking) {
            window.speechSynthesis.pause();
            setIsSpeaking(false);
            stopKeepAlive();
        } else {
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
                setIsSpeaking(true);
                startKeepAlive();
            } else if (text) {
                speak(text, language);
            }
        }
    }, [isSpeaking, speak, language, startKeepAlive, stopKeepAlive]);

    const stopSpeech = useCallback(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            stopKeepAlive();
            utteranceRef.current = null;
        }
    }, [stopKeepAlive]);

    useEffect(() => {
        return () => {
            stopKeepAlive();
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, [stopKeepAlive]);

    return {
        isSpeaking,
        speak,
        speakAnnouncement,
        toggleSpeech,
        stopSpeech
    };
};
