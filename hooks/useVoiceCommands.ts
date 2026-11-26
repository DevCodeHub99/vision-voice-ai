import { useState, useEffect, useRef, useCallback } from 'react';

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

interface SpeechRecognitionErrorEventLike extends Event {
    error?: string;
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
    onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
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

export type VoiceAction = 'describe' | 'read' | 'capture' | 'stop' | 'repeat';

interface CommandKeywords {
    describe: string[];
    read: string[];
    capture: string[];
    stop: string[];
    repeat: string[];
}

const FATAL_SPEECH_ERRORS = new Set(['not-allowed', 'service-not-allowed', 'audio-capture']);

// Universal English keywords always recognized as fallback across all languages
const UNIVERSAL_KEYWORDS: CommandKeywords = {
    describe: ['describe', 'scene', 'look', 'what do you see', 'what is this'],
    read: ['read', 'text', 'ocr', 'words', 'document'],
    capture: ['capture', 'photo', 'picture', 'snap', 'click', 'take photo'],
    stop: ['stop', 'quiet', 'silence', 'pause', 'shut up', 'cancel'],
    repeat: ['repeat', 'again', 'replay', 'read again', 'once more']
};

const MULTILINGUAL_KEYWORDS: Record<string, CommandKeywords> = {
    'hi-IN': {
        describe: ['विवरण', 'दृश्य', 'क्या है', 'बताओ', 'डिस्क्राइब', 'सामने'],
        read: ['पढ़ो', 'टेक्स्ट', 'लिखा', 'रीड', 'पढ़'],
        capture: ['फोटो', 'खींचो', 'क्लिक', 'कैप्चर', 'तस्वीर'],
        stop: ['रुको', 'रोको', 'चुप', 'शांत', 'बंद'],
        repeat: ['दोहराओ', 'फिर से', 'दोबारा', 'रिपीट']
    },
    'es-ES': {
        describe: ['describir', 'escena', 'qué hay', 'mira', 'describe'],
        read: ['leer', 'texto', 'lee'],
        capture: ['capturar', 'foto', 'disparar', 'captura', 'tomar'],
        stop: ['parar', 'silencio', 'basta', 'detener', 'alto'],
        repeat: ['repetir', 'otra vez', 'de nuevo', 'repite']
    },
    'fr-FR': {
        describe: ['décrire', 'scène', "qu'est-ce", 'regarde', 'décris'],
        read: ['lire', 'texte', 'lecture', 'lis'],
        capture: ['capturer', 'photo', 'clic', 'prendre', 'capture'],
        stop: ['arrêter', 'silence', 'stop', 'pause', 'halte'],
        repeat: ['répéter', 'encore', 'rejouer', 'répète']
    },
    'de-DE': {
        describe: ['beschreiben', 'szene', 'sehen', 'blick', 'beschreibe'],
        read: ['lesen', 'text', 'vorlesen', 'lies'],
        capture: ['aufnahme', 'foto', 'knipsen', 'erfassen', 'aufnehmen'],
        stop: ['stopp', 'ruhe', 'anhalten', 'pause', 'stoppen'],
        repeat: ['wiederholen', 'nochmal', 'erneut', 'noch einmal']
    },
    'ja-JP': {
        describe: ['説明', '見て', 'シーン', '教えて'],
        read: ['読んで', 'テキスト', '文字', '読書'],
        capture: ['撮影', '写真', 'シャッター', '撮って'],
        stop: ['止めて', 'ストップ', '静かに', '停止'],
        repeat: ['もう一度', 'リピート', '繰り返して']
    },
    'it-IT': {
        describe: ['descrivere', 'descrivi', 'scena', 'vedi', 'guarda'],
        read: ['leggere', 'leggi', 'testo'],
        capture: ['catturare', 'scatta', 'foto', 'cattura'],
        stop: ['ferma', 'stop', 'silenzio', 'basta'],
        repeat: ['ripeti', 'ancora', 'di nuovo']
    },
    'pt-BR': {
        describe: ['descrever', 'descreva', 'cena', 'olhe', 'veja'],
        read: ['ler', 'leia', 'texto'],
        capture: ['capturar', 'foto', 'tirar', 'captura'],
        stop: ['parar', 'pare', 'silêncio', 'chega', 'cancela'],
        repeat: ['repetir', 'repita', 'de novo', 'novamente']
    }
};

/**
 * Pure parsing function to map speech transcripts to voice actions across 8 languages.
 */
export const parseVoiceCommand = (transcript: string, language: string = 'en-US'): VoiceAction | null => {
    if (!transcript) return null;
    const text = transcript.toLowerCase().trim();

    const langKey = language;
    const prefix = language.split('-')[0];
    const localized = MULTILINGUAL_KEYWORDS[langKey] || MULTILINGUAL_KEYWORDS[prefix] || null;

    const matches = (words: string[]) => words.some(w => {
        const lowerWord = w.toLowerCase();
        // CJK characters (Japanese): substring match
        if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(lowerWord)) {
            return text.includes(lowerWord);
        }
        // Latin and other scripts: word boundary match to avoid partial matches (e.g. "already" -> "read")
        const escaped = lowerWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(^|\\s|[.,!?;])${escaped}($|\\s|[.,!?;])`, 'i').test(text);
    });

    // Priority order: Stop > Capture > Repeat > Describe > Read
    if (matches(UNIVERSAL_KEYWORDS.stop) || (localized && matches(localized.stop))) {
        return 'stop';
    }
    if (matches(UNIVERSAL_KEYWORDS.capture) || (localized && matches(localized.capture))) {
        return 'capture';
    }
    if (matches(UNIVERSAL_KEYWORDS.repeat) || (localized && matches(localized.repeat))) {
        return 'repeat';
    }
    if (matches(UNIVERSAL_KEYWORDS.describe) || (localized && matches(localized.describe))) {
        return 'describe';
    }
    if (matches(UNIVERSAL_KEYWORDS.read) || (localized && matches(localized.read))) {
        return 'read';
    }

    return null;
};

interface UseVoiceCommandsProps {
    onDescribe: () => void;
    onReadText: () => void;
    onCapture: () => void;
    onStop: () => void;
    onRepeat: () => void;
    speakAnnouncement: (text: string) => void;
    triggerHaptic: (pattern?: number | number[]) => void;
    language?: string;
    isSpeaking?: boolean;
}

export const useVoiceCommands = ({
    onDescribe,
    onReadText,
    onCapture,
    onStop,
    onRepeat,
    speakAnnouncement,
    triggerHaptic,
    language = 'en-US',
    isSpeaking = false
}: UseVoiceCommandsProps) => {
    const [isListening, setIsListening] = useState<boolean>(false);
    const [isSupported, setIsSupported] = useState<boolean>(false);
    const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
    const activeListeningRef = useRef<boolean>(false);
    const isSpeakingRef = useRef<boolean>(isSpeaking);
    const restartTimerRef = useRef<number | null>(null);

    useEffect(() => {
        isSpeakingRef.current = isSpeaking;
    }, [isSpeaking]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
            setIsSupported(Boolean(SpeechRecognitionClass));
        }
    }, []);

    useEffect(() => {
        if (recognitionRef.current) {
            recognitionRef.current.lang = language || 'en-US';
        }
    }, [language]);

    const handleCommand = useCallback((transcript: string) => {
        const action = parseVoiceCommand(transcript, language);
        if (!action) return;

        // Prevent acoustic feedback loops during TTS, but ALWAYS allow "stop" to interrupt speech immediately
        if (isSpeakingRef.current && action !== 'stop') {
            return;
        }

        switch (action) {
            case 'describe':
                triggerHaptic();
                onDescribe();
                break;
            case 'read':
                triggerHaptic();
                onReadText();
                break;
            case 'capture':
                triggerHaptic();
                onCapture();
                break;
            case 'stop':
                triggerHaptic();
                onStop();
                speakAnnouncement("Speech stopped.");
                break;
            case 'repeat':
                triggerHaptic();
                onRepeat();
                break;
        }
    }, [language, onDescribe, onReadText, onCapture, onStop, onRepeat, triggerHaptic, speakAnnouncement]);

    const handleCommandRef = useRef(handleCommand);
    useEffect(() => {
        handleCommandRef.current = handleCommand;
    }, [handleCommand]);

    const clearRestartTimer = useCallback(() => {
        if (restartTimerRef.current !== null) {
            clearTimeout(restartTimerRef.current);
            restartTimerRef.current = null;
        }
    }, []);

    const stopListening = useCallback(() => {
        activeListeningRef.current = false;
        clearRestartTimer();
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch {
                // ignore
            }
        }
        setIsListening(false);
    }, [clearRestartTimer]);

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
                const transcript = event.results[current]?.[0]?.transcript;
                if (transcript) {
                    handleCommandRef.current(transcript);
                }
            };

            recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
                if (event.error && FATAL_SPEECH_ERRORS.has(event.error)) {
                    stopListening();
                    speakAnnouncement("Microphone access denied or unavailable.");
                }
            };

            recognition.onend = () => {
                if (activeListeningRef.current) {
                    clearRestartTimer();
                    restartTimerRef.current = window.setTimeout(() => {
                        restartTimerRef.current = null;
                        if (activeListeningRef.current && recognitionRef.current) {
                            try {
                                recognitionRef.current.start();
                            } catch {
                                stopListening();
                            }
                        }
                    }, 250);
                } else {
                    setIsListening(false);
                }
            };

            recognitionRef.current = recognition;
            recognition.start();
            triggerHaptic(50);
            speakAnnouncement("Voice commands active.");
        } catch {
            setIsListening(false);
            activeListeningRef.current = false;
            speakAnnouncement("Unable to start voice recognition.");
        }
    }, [language, stopListening, clearRestartTimer, triggerHaptic, speakAnnouncement]);

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
            clearRestartTimer();
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch {
                    // ignore
                }
            }
        };
    }, [clearRestartTimer]);

    return {
        isListening,
        isSupported,
        toggleListening
    };
};
