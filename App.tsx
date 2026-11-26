import { FC, useState, useRef, useEffect, useCallback } from 'react';
import { Task, UserSettings } from './types';
import { LANGUAGES } from './constants';
import { obfuscateKey, deobfuscateKey } from './utils/security';
import CameraCapture from './components/CameraCapture';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import ResultSheet from './components/ResultSheet';
import SettingsModal from './components/SettingsModal';

import { useSpeech } from './hooks/useSpeech';
import { useImageProcessing } from './hooks/useImageProcessing';
import { useHaptics } from './hooks/useHaptics';
import { useCamera } from './hooks/useCamera';
import { useVoiceCommands } from './hooks/useVoiceCommands';
import { optimizeImage } from './utils/imageProcessor';

// BeforeInstallPromptEvent type declaration
interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * VisionVoice Main Application Orchestrator
 * 
 * Manages:
 * - Real-time camera feeds and gallery uploads
 * - Multimodal AI processing lifecycle
 * - Multilingual voice narration (TTS) and voice recognition
 * - Keyboard navigation and accessibility shortcuts
 * - Network connectivity state and PWA installation
 */
const App: FC = () => {
    const [task, setTask] = useState<Task>(() => {
        if (typeof window !== 'undefined') {
            const param = new URLSearchParams(window.location.search).get('task');
            if (param === Task.READ) return Task.READ;
        }
        return Task.DESCRIBE;
    });
    const [language, setLanguage] = useState<string>(LANGUAGES[0].code);
    const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
    const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

    const [userSettings, setUserSettings] = useState<UserSettings>(() => {
        try {
            const saved = localStorage.getItem('visionvoice_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                const rawOpenRouter = parsed.openRouterKeyEnc ? deobfuscateKey(parsed.openRouterKeyEnc) : (parsed.openRouterKey || parsed.apiKey || '');
                const rawGemini = parsed.geminiKeyEnc ? deobfuscateKey(parsed.geminiKeyEnc) : (parsed.geminiKey || '');
                const rawGroq = parsed.groqKeyEnc ? deobfuscateKey(parsed.groqKeyEnc) : (parsed.groqKey || '');
                const rawRapidRouter = parsed.rapidRouterKeyEnc ? deobfuscateKey(parsed.rapidRouterKeyEnc) : (parsed.rapidRouterKey || '');
                return {
                    provider: parsed.provider || 'openrouter',
                    openRouterKey: rawOpenRouter,
                    geminiKey: rawGemini,
                    groqKey: rawGroq,
                    rapidRouterKey: rawRapidRouter,
                    model: parsed.model || 'openrouter/free',
                    providerModels: parsed.providerModels || {},
                    rememberKey: parsed.rememberKey ?? true,
                    speechRate: parsed.speechRate ?? 0.95
                };
            }
        } catch {
            // fallback
        }
        return {
            provider: 'openrouter',
            openRouterKey: '',
            geminiKey: '',
            groqKey: '',
            rapidRouterKey: '',
            model: 'openrouter/free',
            providerModels: {},
            rememberKey: true,
            speechRate: 0.95
        };
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Custom Hooks
    const { isSpeaking, isNarrating, speak, speakAnnouncement, toggleSpeech, stopSpeech } = useSpeech({
        language,
        speechRate: userSettings.speechRate
    });
    const { triggerHaptic } = useHaptics();
    const { cameraRef, onCaptureClick } = useCamera();

    const {
        image,
        output,
        isLoading,
        error,
        processImage,
        reset
    } = useImageProcessing({
        language,
        userSettings,
        onStartProcessing: useCallback(() => {
            triggerHaptic();
            stopSpeech();
            speakAnnouncement("Processing image.");
        }, [triggerHaptic, stopSpeech, speakAnnouncement]),
        onSuccess: useCallback((result) => {
            triggerHaptic(); // Success vibration
            speak(result, language);
        }, [triggerHaptic, speak, language]),
        onError: useCallback(() => {
            triggerHaptic([100, 50, 100]);
            speakAnnouncement("An error occurred. Please try again.");
        }, [triggerHaptic, speakAnnouncement])
    });

    // Voice Command Handlers
    const handleVoiceDescribe = useCallback(() => {
        setTask(Task.DESCRIBE);
        setActiveTab('camera');
        speakAnnouncement("Describe mode.");
    }, [speakAnnouncement]);

    const handleVoiceReadText = useCallback(() => {
        setTask(Task.READ);
        setActiveTab('camera');
        speakAnnouncement("Read text mode.");
    }, [speakAnnouncement]);

    const handleVoiceCapture = useCallback(() => {
        speakAnnouncement("Capturing.");
        triggerHaptic();
        onCaptureClick();
    }, [speakAnnouncement, triggerHaptic, onCaptureClick]);

    const handleVoiceStop = useCallback(() => {
        stopSpeech();
    }, [stopSpeech]);

    const handleVoiceRepeat = useCallback(() => {
        if (output) {
            speak(output, language);
        } else {
            speakAnnouncement("No description available to repeat.");
        }
    }, [output, speak, language, speakAnnouncement]);

    const {
        isListening: isVoiceListening,
        isSupported: isVoiceSupported,
        toggleListening: handleToggleVoice
    } = useVoiceCommands({
        onDescribe: handleVoiceDescribe,
        onReadText: handleVoiceReadText,
        onCapture: handleVoiceCapture,
        onStop: handleVoiceStop,
        onRepeat: handleVoiceRepeat,
        speakAnnouncement,
        triggerHaptic,
        language,
        isSpeaking
    });

    // Initial Voice Welcome & Guidance
    useEffect(() => {
        const timer = setTimeout(() => {
            const keyByProvider: Record<UserSettings['provider'], string | undefined> = {
                gemini: userSettings.geminiKey,
                openrouter: userSettings.openRouterKey,
                groq: userSettings.groqKey,
                rapidrouter: userSettings.rapidRouterKey,
            };
            const activeKey = keyByProvider[userSettings.provider];
            if (!activeKey?.trim()) {
                speakAnnouncement("Welcome to VisionVoice. Please tap the Setup Key button at the top right to configure your AI key.");
            } else {
                speakAnnouncement("Camera ready. Tap center shutter or press Space to capture.");
            }
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    // Network Connectivity Listener
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            speakAnnouncement("Internet connection restored.");
        };
        const handleOffline = () => {
            setIsOnline(false);
            speakAnnouncement("Internet connection lost. Multimodal vision requires network connectivity.");
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [speakAnnouncement]);

    // PWA Install Prompt Listener
    useEffect(() => {
        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e as BeforeInstallPromptEvent);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstall);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    }, []);

    const handleInstallApp = useCallback(async () => {
        if (!installPrompt) return;
        try {
            await installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;
            if (outcome === 'accepted') {
                speakAnnouncement("VisionVoice installation complete.");
                setInstallPrompt(null);
            }
        } catch {
            // Ignore installation aborts
        }
    }, [installPrompt, speakAnnouncement]);

    // Handlers
    const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (file) {
            if (file.size > 25 * 1024 * 1024) {
                speakAnnouncement("Image exceeds 25 megabyte limit. Please select a smaller photo.");
                return;
            }

            triggerHaptic();
            try {
                const { dataUrl, mimeType } = await optimizeImage(file);
                processImage(dataUrl, mimeType, task);
            } catch {
                speakAnnouncement("Failed to process uploaded image.");
            }
        }
    }, [triggerHaptic, processImage, task, speakAnnouncement]);

    const handleCameraCapture = useCallback((imageDataUrl: string) => {
        const [header] = imageDataUrl.split(',');
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        processImage(imageDataUrl, mimeType, task);
    }, [processImage, task]);

    const handleReset = useCallback(() => {
        reset();
        stopSpeech();
        speakAnnouncement("Camera ready.");
    }, [reset, stopSpeech, speakAnnouncement]);

    const handleCopy = useCallback(async (): Promise<boolean> => {
        if (!output) return false;
        if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
            speakAnnouncement("Clipboard unavailable in this browser context.");
            return false;
        }
        try {
            await navigator.clipboard.writeText(output);
            speakAnnouncement("Text copied to clipboard.");
            return true;
        } catch {
            speakAnnouncement("Unable to copy text to clipboard.");
            return false;
        }
    }, [output, speakAnnouncement]);

    const handleUploadClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleCaptureClick = useCallback(() => {
        triggerHaptic();
        onCaptureClick();
    }, [triggerHaptic, onCaptureClick]);

    const handleLanguageChange = useCallback((lang: string) => {
        setLanguage(lang);
        speakAnnouncement(`Language changed to ${LANGUAGES.find(l => l.code === lang)?.name}`);
    }, [speakAnnouncement]);

    const handleTaskChange = useCallback((t: Task) => {
        setTask(t);
        speakAnnouncement(`${t === Task.DESCRIBE ? 'Describe' : 'Read Text'} mode`);
    }, [speakAnnouncement]);

    const handleToggleSpeech = useCallback(() => {
        toggleSpeech(output);
    }, [toggleSpeech, output]);

    const handleSaveSettings = useCallback((newSettings: UserSettings) => {
        setUserSettings(newSettings);
        try {
            if (newSettings.rememberKey) {
                const toStore = {
                    provider: newSettings.provider,
                    openRouterKeyEnc: obfuscateKey(newSettings.openRouterKey),
                    geminiKeyEnc: obfuscateKey(newSettings.geminiKey),
                    groqKeyEnc: obfuscateKey(newSettings.groqKey || ''),
                    rapidRouterKeyEnc: obfuscateKey(newSettings.rapidRouterKey || ''),
                    model: newSettings.model,
                    providerModels: newSettings.providerModels || {},
                    rememberKey: true,
                    speechRate: newSettings.speechRate ?? 0.95
                };
                localStorage.setItem('visionvoice_settings', JSON.stringify(toStore));
            } else {
                const toStore = {
                    provider: newSettings.provider,
                    openRouterKeyEnc: '',
                    geminiKeyEnc: '',
                    groqKeyEnc: '',
                    rapidRouterKeyEnc: '',
                    model: newSettings.model,
                    providerModels: newSettings.providerModels || {},
                    rememberKey: false,
                    speechRate: newSettings.speechRate ?? 0.95
                };
                localStorage.setItem('visionvoice_settings', JSON.stringify(toStore));
            }
        } catch {
            console.warn("Could not save settings to localStorage");
        }
        speakAnnouncement("Settings saved.");
    }, [speakAnnouncement]);

    const handleOpenSettings = useCallback(() => {
        setIsSettingsOpen(true);
    }, []);

    const handleCloseSettings = useCallback(() => {
        setIsSettingsOpen(false);
    }, []);

    // Global Keyboard Shortcuts for Low-Vision & Motor Accessibility
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeElem = document.activeElement;
            if (activeElem && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElem.tagName)) {
                return;
            }

            if (e.key === 'Escape') {
                if (isSettingsOpen) {
                    e.preventDefault();
                    handleCloseSettings();
                } else if (image) {
                    e.preventDefault();
                    handleReset();
                }
                return;
            }

            if (isSettingsOpen || Boolean(image)) {
                return;
            }

            if (e.code === 'Space' || e.code === 'Enter') {
                if (activeTab === 'camera') {
                    e.preventDefault();
                    handleCaptureClick();
                }
            } else if (e.key === 'd' || e.key === 'D') {
                e.preventDefault();
                handleVoiceDescribe();
            } else if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                handleVoiceReadText();
            } else if (e.key === 'u' || e.key === 'U') {
                e.preventDefault();
                setActiveTab('upload');
                speakAnnouncement("Upload mode.");
            } else if (e.key === 's' || e.key === 'S') {
                e.preventDefault();
                if (output) {
                    toggleSpeech(output);
                }
            } else if (e.key === 'v' || e.key === 'V') {
                e.preventDefault();
                if (isVoiceSupported) {
                    handleToggleVoice();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        activeTab,
        isSettingsOpen,
        image,
        output,
        handleCaptureClick,
        handleVoiceDescribe,
        handleVoiceReadText,
        toggleSpeech,
        isVoiceSupported,
        handleToggleVoice,
        handleCloseSettings,
        handleReset,
        speakAnnouncement
    ]);

    return (
        <div className="fixed inset-0 h-[100dvh] bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">

            {/* 1. FULL SCREEN CAMERA BACKGROUND */}
            <CameraCapture
                ref={cameraRef}
                onCapture={handleCameraCapture}
                isActive={!image}
            />

            {/* 2. MAIN ACCESSIBLE UI OVERLAY */}
            <div
                id="camera-view"
                aria-hidden={Boolean(image) || isSettingsOpen}
                inert={Boolean(image) || isSettingsOpen ? true : undefined}
                className={`relative z-10 flex flex-col justify-between h-full transition-opacity duration-300 ${image ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            >

                <Header
                    language={language}
                    userSettings={userSettings}
                    onLanguageChange={handleLanguageChange}
                    onSettingsClick={handleOpenSettings}
                    isVoiceSupported={isVoiceSupported}
                    isVoiceListening={isVoiceListening}
                    onToggleVoice={handleToggleVoice}
                    isOnline={isOnline}
                    hasInstallPrompt={Boolean(installPrompt)}
                    onInstall={handleInstallApp}
                />

                {/* Center Viewfinder Reticle (Aids Aiming for Low-Vision Users) */}
                <div className="flex-grow flex items-center justify-center pointer-events-none">
                    <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-3xl border-2 border-white/25 flex items-center justify-center relative">
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-3 border-l-3 border-violet-400 -mt-0.5 -ml-0.5 rounded-tl-xl"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-3 border-r-3 border-violet-400 -mt-0.5 -mr-0.5 rounded-tr-xl"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-3 border-l-3 border-violet-400 -mb-0.5 -ml-0.5 rounded-bl-xl"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-3 border-r-3 border-violet-400 -mb-0.5 -mr-0.5 rounded-br-xl"></div>
                        <i className="fa-solid fa-plus text-white/30 text-xl" aria-hidden="true"></i>
                    </div>
                </div>

                <BottomNav
                    task={task}
                    activeTab={activeTab}
                    onTaskChange={handleTaskChange}
                    onTabChange={setActiveTab}
                    onCaptureClick={handleCaptureClick}
                    onUploadClick={handleUploadClick}
                    fileInputRef={fileInputRef}
                    handleImageUpload={handleImageUpload}
                />
            </div>

            {/* 3. RESULTS SHEET (Slide Up Accessible Modal) */}
            <ResultSheet
                image={image}
                isLoading={isLoading}
                error={error}
                output={output}
                task={task}
                isSpeaking={isNarrating}
                onReset={handleReset}
                onToggleSpeech={handleToggleSpeech}
                onCopy={handleCopy}
                onOpenSettings={handleOpenSettings}
            />

            {/* 4. SETTINGS MODAL (BYOK & Model Selection) */}
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={handleCloseSettings}
                settings={userSettings}
                onSaveSettings={handleSaveSettings}
            />

        </div>
    );
};

export default App;
