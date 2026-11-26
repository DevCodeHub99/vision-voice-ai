import { useRef, useCallback, useEffect, useState } from 'react';

interface UseSpeechProps {
    language: string;
    speechRate?: number;
}

/**
 * Custom hook to manage Text-to-Speech (TTS) functionality.
 * Tracks both overall speaking state (`isSpeaking`, for acoustic feedback isolation)
 * and result narration state (`isNarrating`, for UI playback controls), with
 * keep-alive heartbeat support for mobile browsers.
 */
export const useSpeech = ({ language, speechRate = 0.95 }: UseSpeechProps) => {
    const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
    const [isNarrating, setIsNarrating] = useState<boolean>(false);
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
        const synth = window.speechSynthesis;

        const updateVoices = () => {
            const availableVoices = synth.getVoices();
            if (availableVoices.length > 0) {
                setVoices(availableVoices);
            }
        };

        updateVoices();
        if (typeof synth.addEventListener === 'function') {
            synth.addEventListener('voiceschanged', updateVoices);
        } else {
            synth.onvoiceschanged = updateVoices;
        }

        const timer = setTimeout(updateVoices, 300);

        return () => {
            clearTimeout(timer);
            if (typeof synth.removeEventListener === 'function') {
                synth.removeEventListener('voiceschanged', updateVoices);
            } else {
                synth.onvoiceschanged = null;
            }
        };
    }, []);

    const speakAnnouncement = useCallback((text: string) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        stopKeepAlive();
        setIsNarrating(false);

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;

        utterance.onstart = () => {
            setIsSpeaking(true);
            setIsNarrating(false);
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
        utterance.rate = speechRate;

        const langPrefix = lang.split('-')[0];
        const matchedVoice = voices.find((v: SpeechSynthesisVoice) => v.lang === lang) || voices.find((v: SpeechSynthesisVoice) => v.lang.startsWith(langPrefix));
        if (matchedVoice) {
            utterance.voice = matchedVoice;
        }

        utterance.onstart = () => {
            setIsSpeaking(true);
            setIsNarrating(true);
            startKeepAlive();
        };
        utterance.onend = () => {
            setIsSpeaking(false);
            setIsNarrating(false);
            stopKeepAlive();
            utteranceRef.current = null;
        };
        utterance.onerror = () => {
            setIsSpeaking(false);
            setIsNarrating(false);
            stopKeepAlive();
            utteranceRef.current = null;
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, [voices, speechRate, startKeepAlive, stopKeepAlive]);

    const toggleSpeech = useCallback((text: string) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        const synth = window.speechSynthesis;

        if (isNarrating && synth.speaking && !synth.paused) {
            synth.pause();
            setIsSpeaking(false);
            setIsNarrating(false);
            stopKeepAlive();
        } else if (synth.paused) {
            synth.resume();
            setIsSpeaking(true);
            setIsNarrating(true);
            startKeepAlive();
        } else if (text) {
            speak(text, language);
        }
    }, [isNarrating, speak, language, startKeepAlive, stopKeepAlive]);

    const stopSpeech = useCallback(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            setIsNarrating(false);
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
        isNarrating,
        speak,
        speakAnnouncement,
        toggleSpeech,
        stopSpeech
    };
};
