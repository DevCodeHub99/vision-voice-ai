import { memo } from 'react';
import { AIProvider, UserSettings } from '../types';
import { LANGUAGES, PROVIDER_LABELS } from '../constants';

interface HeaderProps {
    language: string;
    userSettings?: UserSettings;
    onLanguageChange: (language: string) => void;
    onSettingsClick?: () => void;
    isVoiceSupported?: boolean;
    isVoiceListening?: boolean;
    onToggleVoice?: () => void;
    isOnline?: boolean;
    hasInstallPrompt?: boolean;
    onInstall?: () => void;
}

const getActiveProviderKey = (provider: AIProvider, userSettings?: UserSettings): string | undefined => {
    switch (provider) {
        case 'gemini':
            return userSettings?.geminiKey;
        case 'openrouter':
            return userSettings?.openRouterKey;
        case 'groq':
            return userSettings?.groqKey;
        case 'rapidrouter':
            return userSettings?.rapidRouterKey;
    }
};

const Header = memo(({
    language,
    userSettings,
    onLanguageChange,
    onSettingsClick,
    isVoiceSupported = true,
    isVoiceListening = false,
    onToggleVoice,
    isOnline = true,
    hasInstallPrompt = false,
    onInstall
}: HeaderProps) => {
    const provider: AIProvider = userSettings?.provider || 'openrouter';
    const activeKey = getActiveProviderKey(provider, userSettings);
    const hasKey = Boolean(activeKey?.trim());
    const providerLabel = PROVIDER_LABELS[provider] || 'OpenRouter';

    return (
        <header className="safe-top pt-4 px-4 sm:px-6 flex flex-wrap justify-between items-center gap-2" role="banner">
            {/* Left Controls: Language Selector & Offline Status */}
            <div className="flex items-center space-x-2">
                {/* Language Selector (Floating Pill) */}
                <div className="bg-slate-900/80 backdrop-blur-md rounded-full px-3.5 py-2 flex items-center border border-white/15 shadow-xl transition-all focus-within:ring-2 focus-within:ring-violet-400">
                    <i className="fa-solid fa-globe text-slate-300 mr-2 text-sm" aria-hidden="true"></i>
                    <select
                        value={language}
                        onChange={(e) => onLanguageChange(e.target.value)}
                        className="bg-transparent text-white font-medium text-xs sm:text-sm outline-none appearance-none cursor-pointer pr-1"
                        aria-label="Application Language"
                    >
                        {LANGUAGES.map((lang) => (
                            <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">{lang.name}</option>
                        ))}
                    </select>
                    <i className="fa-solid fa-chevron-down text-slate-400 ml-1 text-xs pointer-events-none" aria-hidden="true"></i>
                </div>

                {/* Offline Indicator Pill */}
                {!isOnline && (
                    <div
                        role="status"
                        aria-live="polite"
                        className="bg-red-950/80 border border-red-500/50 text-red-300 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 shadow-lg animate-pulse"
                        title="No internet connection detected"
                    >
                        <i className="fa-solid fa-wifi text-xs" aria-hidden="true"></i>
                        <span>Offline</span>
                    </div>
                )}
            </div>

            {/* Right Controls: PWA Install, Voice Toggle, Provider Pill & Settings */}
            <div className="flex items-center space-x-2">
                {/* Install PWA Button if browser prompt is active */}
                {hasInstallPrompt && onInstall && (
                    <button
                        onClick={onInstall}
                        className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-full px-3 py-1.5 flex items-center space-x-1.5 text-xs font-semibold shadow-lg transition-transform active:scale-95 border border-white/20"
                        aria-label="Install VisionVoice Progressive Web App"
                    >
                        <i className="fa-solid fa-download text-xs" aria-hidden="true"></i>
                        <span className="hidden sm:inline">Install App</span>
                    </button>
                )}

                {/* Hands-free Voice Commands Toggle */}
                {isVoiceSupported && onToggleVoice && (
                    <button
                        onClick={onToggleVoice}
                        className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center border transition-all active:scale-95 shadow-xl ${
                            isVoiceListening
                                ? 'bg-red-950/70 border-red-500 text-red-400 ring-2 ring-red-500/50 animate-pulse'
                                : 'bg-slate-900/80 border-white/15 text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                        aria-label={isVoiceListening ? "Voice commands active. Tap to turn off." : "Turn on hands-free voice commands"}
                        title={isVoiceListening ? "Listening... Tap to stop" : "Voice commands"}
                    >
                        <i className={`fa-solid ${isVoiceListening ? 'fa-microphone' : 'fa-microphone-slash'} text-sm`} aria-hidden="true"></i>
                    </button>
                )}

                {/* BYOK Status Pill */}
                <button
                    onClick={onSettingsClick}
                    className={`bg-slate-900/80 backdrop-blur-md rounded-full px-3 py-2 flex items-center border transition-all active:scale-95 shadow-xl ${
                        hasKey
                            ? 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/50'
                            : 'border-amber-500/50 text-amber-300 hover:bg-amber-950/50 animate-pulse'
                    }`}
                    aria-label={hasKey ? `Active provider: ${providerLabel}. Tap to edit settings` : 'API key required. Tap to setup'}
                >
                    <span className={`w-2 h-2 rounded-full mr-2 ${hasKey ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} aria-hidden="true"></span>
                    <span className="text-xs font-semibold tracking-wide">
                        {hasKey ? providerLabel : 'Setup Key'}
                    </span>
                </button>

                {/* Settings Gear Button */}
                <button
                    onClick={onSettingsClick}
                    className="w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur-md flex items-center justify-center text-slate-200 border border-white/15 active:scale-95 shadow-xl hover:bg-slate-800 transition-all"
                    aria-label="Open AI and Accessibility Settings"
                >
                    <i className="fa-solid fa-gear text-base" aria-hidden="true"></i>
                </button>
            </div>
        </header>
    );
});

export default Header;
