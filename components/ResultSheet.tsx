import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { Task } from '../types';

interface ResultSheetProps {
    image: string | null;
    isLoading: boolean;
    error: string | null;
    output: string;
    task: Task;
    isSpeaking: boolean;
    onReset: () => void;
    onToggleSpeech: () => void;
    onCopy: () => Promise<boolean> | boolean | void;
    onOpenSettings?: () => void;
}

const ResultSheet = memo(({
    image,
    isLoading,
    error,
    output,
    task,
    isSpeaking,
    onReset,
    onToggleSpeech,
    onCopy,
    onOpenSettings
}: ResultSheetProps) => {
    const [copied, setCopied] = useState(false);
    const touchStartY = useRef<number | null>(null);
    const copyTimerRef = useRef<number | null>(null);

    const isOpen = Boolean(image);

    const isKeyError = Boolean(
        error && (
            error.toLowerCase().includes('key') ||
            error.toLowerCase().includes('settings') ||
            error.toLowerCase().includes('quota') ||
            error.toLowerCase().includes('401') ||
            error.toLowerCase().includes('403')
        )
    );

    useEffect(() => {
        return () => {
            if (copyTimerRef.current !== null) {
                clearTimeout(copyTimerRef.current);
            }
        };
    }, []);

    // Touch gesture to swipe down and dismiss
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStartY.current === null) return;
        const currentY = e.touches[0].clientY;
        const diff = currentY - touchStartY.current;
        if (diff > 90) {
            touchStartY.current = null;
            onReset();
        }
    };

    const handleTouchEnd = () => {
        touchStartY.current = null;
    };

    const handleCopyClick = useCallback(async () => {
        const succeeded = await onCopy();
        if (succeeded === false) {
            return;
        }
        setCopied(true);
        if (copyTimerRef.current !== null) {
            clearTimeout(copyTimerRef.current);
        }
        copyTimerRef.current = window.setTimeout(() => {
            setCopied(false);
            copyTimerRef.current = null;
        }, 2000);
    }, [onCopy]);

    const handleShare = useCallback(async () => {
        if (navigator.share && output) {
            try {
                await navigator.share({
                    title: task === Task.DESCRIBE ? 'VisionVoice Scene Description' : 'VisionVoice Text Content',
                    text: output
                });
            } catch {
                // User cancelled or share not supported
            }
        }
    }, [output, task]);

    return (
        <div
            className={`fixed inset-x-0 bottom-0 z-40 transform transition-transform duration-500 ease-out flex flex-col max-h-[88vh] ${
                isOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'
            }`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            role="dialog"
            aria-modal="false"
            aria-hidden={!isOpen}
            inert={!isOpen ? true : undefined}
            aria-label={task === Task.DESCRIBE ? "Scene description result" : "Text recognition result"}
        >
            {/* Drag Handle Area */}
            <div
                onClick={onReset}
                className="h-8 w-full flex justify-center items-center cursor-pointer group"
                aria-label="Swipe or click to dismiss result"
            >
                <div className="w-14 h-1.5 bg-white/40 group-hover:bg-white/70 rounded-full transition-colors"></div>
            </div>

            {/* Content Container */}
            <div className="bg-slate-950/95 backdrop-blur-2xl border-t border-white/15 rounded-t-3xl shadow-[0_-15px_50px_rgba(0,0,0,0.7)] flex flex-col flex-grow overflow-hidden pb-8 overscroll-contain">

                {/* Header */}
                <div className="flex justify-between items-center p-5 sm:p-6 border-b border-white/10">
                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-violet-400 uppercase tracking-widest mb-0.5">
                            {task === Task.DESCRIBE ? 'Visual Description' : 'Recognized Text (OCR)'}
                        </span>
                        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                            {isLoading ? 'Analyzing surroundings...' : error ? 'Setup Needed' : 'Result Summary'}
                        </h2>
                    </div>

                    <button
                        onClick={onReset}
                        className="w-11 h-11 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors active:scale-95 border border-white/10"
                        aria-label="Close result and return to camera"
                    >
                        <i className="fa-solid fa-xmark text-lg" aria-hidden="true"></i>
                    </button>
                </div>

                {/* Scrollable Content Body */}
                <div className="flex-grow overflow-y-auto px-5 sm:px-6 py-4 overscroll-contain" aria-live="polite" role="status">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center space-y-5 py-10">
                            <div className="relative w-16 h-16 flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full bg-violet-600/30 animate-ping"></div>
                                <div className="w-12 h-12 rounded-full border-3 border-violet-500 border-t-transparent animate-spin"></div>
                                <i className="fa-solid fa-eye text-violet-400 text-base" aria-hidden="true"></i>
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-slate-200 font-medium text-base">Processing image via Multimodal AI</p>
                                <p className="text-slate-400 text-xs">Generating speech narration...</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="space-y-4 py-2">
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-amber-200 flex items-start space-x-3.5 shadow-inner">
                                <i className="fa-solid fa-key text-amber-400 text-xl mt-0.5 flex-shrink-0" aria-hidden="true"></i>
                                <div className="space-y-1">
                                    <p className="font-bold text-amber-300 text-sm">Configuration Required</p>
                                    <p className="text-xs sm:text-sm leading-relaxed text-slate-300">{error}</p>
                                </div>
                            </div>

                            {isKeyError && onOpenSettings && (
                                <button
                                    onClick={() => {
                                        onReset();
                                        onOpenSettings();
                                    }}
                                    className="w-full py-4 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] font-bold text-white rounded-2xl shadow-xl shadow-violet-950/60 flex items-center justify-center space-x-3 text-base transition-all min-h-[48px]"
                                >
                                    <i className="fa-solid fa-sliders text-lg" aria-hidden="true"></i>
                                    <span>Configure AI Key & Provider</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-5 py-2">
                            {/* Animated Audio Equalizer Waveform */}
                            {isSpeaking && (
                                <div className="flex items-center space-x-2 py-2 px-3.5 bg-gradient-to-r from-violet-950/80 to-slate-900 border border-violet-500/40 rounded-2xl w-fit shadow-lg">
                                    <div className="flex items-end space-x-1 h-5">
                                        <span className="w-1 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.4s] h-3"></span>
                                        <span className="w-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.2s] h-5"></span>
                                        <span className="w-1 bg-fuchsia-400 rounded-full animate-bounce [animation-delay:-0.3s] h-2"></span>
                                        <span className="w-1 bg-white rounded-full animate-bounce [animation-delay:-0.1s] h-4"></span>
                                        <span className="w-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.25s] h-3"></span>
                                    </div>
                                    <span className="text-xs font-semibold text-violet-200 tracking-wide">Speaking Narration...</span>
                                </div>
                            )}

                            {/* Crisp Multimodal Output */}
                            <p className="text-xl sm:text-2xl font-medium leading-relaxed sm:leading-loose text-slate-100 whitespace-pre-wrap select-text tracking-normal">
                                {output}
                            </p>
                        </div>
                    )}
                </div>

                {/* Bottom Action Buttons Bar */}
                {!isLoading && output && !error && (
                    <div className="p-5 sm:p-6 pt-3 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent border-t border-white/5">
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Toggle Audio Button */}
                            <button
                                onClick={onToggleSpeech}
                                className={`flex-1 h-14 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center space-x-2.5 transition-all active:scale-95 shadow-xl min-h-[48px] ${
                                    isSpeaking
                                        ? 'bg-white text-slate-950 hover:bg-slate-100'
                                        : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-950/50'
                                }`}
                                aria-label={isSpeaking ? "Pause speech narration" : "Play speech narration"}
                            >
                                <i className={`fa-solid ${isSpeaking ? 'fa-pause' : 'fa-volume-high'} text-lg`} aria-hidden="true"></i>
                                <span>{isSpeaking ? 'Pause Voice' : 'Speak Text'}</span>
                            </button>

                            {/* Copy Button */}
                            <button
                                onClick={handleCopyClick}
                                className={`h-14 px-5 rounded-2xl font-bold text-sm sm:text-base border flex items-center justify-center space-x-2 transition-all active:scale-95 min-h-[48px] ${
                                    copied
                                        ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                                        : 'bg-slate-900 border-white/15 text-slate-200 hover:bg-slate-800'
                                }`}
                                aria-label="Copy text to clipboard"
                            >
                                <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} aria-hidden="true"></i>
                                <span>{copied ? 'Copied' : 'Copy'}</span>
                            </button>

                            {/* Web Share API (if supported) */}
                            {typeof navigator !== 'undefined' && 'share' in navigator && (
                                <button
                                    onClick={handleShare}
                                    className="h-14 w-14 rounded-2xl bg-slate-900 border border-white/15 text-slate-200 hover:bg-slate-800 flex items-center justify-center transition-all active:scale-95 min-h-[48px]"
                                    aria-label="Share description with another app"
                                    title="Share"
                                >
                                    <i className="fa-solid fa-share-nodes text-lg" aria-hidden="true"></i>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

export default ResultSheet;
