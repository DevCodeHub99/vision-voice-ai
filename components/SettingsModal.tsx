import { useState, useEffect, memo } from 'react';
import { UserSettings, AIProvider, ProviderModelsMap } from '../types';
import {
    PROVIDER_ORDER,
    PROVIDER_PRESET_MODELS,
    PROVIDER_DEFAULT_MODELS,
    PROVIDER_LABELS
} from '../constants';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: UserSettings;
    onSaveSettings: (settings: UserSettings) => void;
}

interface ProviderUIConfig {
    title: string;
    subtitle: string;
    icon: string;
    activeClass: string;
    keyLabel: string;
    placeholder: string;
    keyHelpUrl: string;
    keyHelpText: string;
    linkColorClass: string;
    customPlaceholder: string;
    customHint: string;
}

const PROVIDER_UI: Record<AIProvider, ProviderUIConfig> = {
    gemini: {
        title: 'Google Gemini',
        subtitle: 'AI Studio • Free Tier',
        icon: 'fa-brands fa-google',
        activeClass: 'bg-blue-600 text-white shadow-lg shadow-blue-950/50',
        keyLabel: 'Google Gemini API Key',
        placeholder: 'AIzaSy...',
        keyHelpUrl: 'https://aistudio.google.com/app/apikey',
        keyHelpText: 'Google AI Studio',
        linkColorClass: 'text-blue-400 hover:text-blue-300',
        customPlaceholder: 'e.g. gemini-3.8-flash',
        customHint: 'Enter any valid Google AI Studio multimodal vision model ID.'
    },
    openrouter: {
        title: 'OpenRouter',
        subtitle: 'Free :free Models',
        icon: 'fa-solid fa-globe',
        activeClass: 'bg-violet-600 text-white shadow-lg shadow-violet-950/50',
        keyLabel: 'OpenRouter API Key',
        placeholder: 'sk-or-v1-...',
        keyHelpUrl: 'https://openrouter.ai/keys',
        keyHelpText: 'OpenRouter.ai',
        linkColorClass: 'text-violet-400 hover:text-violet-300',
        customPlaceholder: 'e.g. nvidia/nemotron-3.5-super-vl:free',
        customHint: 'Model must accept image/vision inputs. Use IDs ending with :free for zero cost.'
    },
    groq: {
        title: 'Groq Cloud',
        subtitle: 'Free LPU • No Card',
        icon: 'fa-solid fa-bolt',
        activeClass: 'bg-orange-600 text-white shadow-lg shadow-orange-950/50',
        keyLabel: 'Groq API Key',
        placeholder: 'gsk_...',
        keyHelpUrl: 'https://console.groq.com/keys',
        keyHelpText: 'Groq Console',
        linkColorClass: 'text-orange-400 hover:text-orange-300',
        customPlaceholder: 'e.g. qwen/qwen3.8-27b',
        customHint: 'Enter any Groq vision-capable model ID (free tier, no card required).'
    },
    rapidrouter: {
        title: 'Rapid Router',
        subtitle: 'Free Tier • 50/day',
        icon: 'fa-solid fa-route',
        activeClass: 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50',
        keyLabel: 'Rapid Router API Key',
        placeholder: 'sk-rr-v1-...',
        keyHelpUrl: 'https://rapidrouter.ai',
        keyHelpText: 'RapidRouter.ai',
        linkColorClass: 'text-emerald-400 hover:text-emerald-300',
        customPlaceholder: 'e.g. google/gemma-4-31b-it:free',
        customHint: 'Use :free model IDs for zero-cost usage ($0 balance, no credit card needed).'
    }
};

const resolveProviderModelState = (targetProvider: AIProvider, configuredModel?: string) => {
    const presets = PROVIDER_PRESET_MODELS[targetProvider];
    const defaultId = PROVIDER_DEFAULT_MODELS[targetProvider];
    const trimmed = configuredModel?.trim();
    if (!trimmed) {
        return { selected: defaultId, custom: '' };
    }
    const isPreset = presets.some(m => m.id === trimmed && m.id !== 'custom');
    if (isPreset) {
        return { selected: trimmed, custom: '' };
    }
    return { selected: 'custom', custom: trimmed };
};

const SettingsModal = memo(({ isOpen, onClose, settings, onSaveSettings }: SettingsModalProps) => {
    const initialProvider: AIProvider = settings.provider || 'openrouter';
    const [provider, setProvider] = useState<AIProvider>(initialProvider);
    const [keys, setKeys] = useState<Record<AIProvider, string>>({
        gemini: settings.geminiKey || '',
        openrouter: settings.openRouterKey || '',
        groq: settings.groqKey || '',
        rapidrouter: settings.rapidRouterKey || '',
    });
    const [providerModels, setProviderModels] = useState<ProviderModelsMap>(() => ({
        ...settings.providerModels,
        [initialProvider]: settings.providerModels?.[initialProvider] || settings.model || PROVIDER_DEFAULT_MODELS[initialProvider],
    }));
    const [showKey, setShowKey] = useState<boolean>(false);
    const [speechRate, setSpeechRate] = useState<number>(settings.speechRate ?? 0.95);
    const [showShortcuts, setShowShortcuts] = useState<boolean>(false);

    const initialModelState = resolveProviderModelState(
        initialProvider,
        settings.providerModels?.[initialProvider] || settings.model
    );
    const [selectedModel, setSelectedModel] = useState<string>(initialModelState.selected);
    const [customModel, setCustomModel] = useState<string>(initialModelState.custom);
    const [rememberKey, setRememberKey] = useState<boolean>(settings.rememberKey ?? true);

    useEffect(() => {
        const currentProvider: AIProvider = settings.provider || 'openrouter';
        const mergedModels: ProviderModelsMap = {
            ...settings.providerModels,
            [currentProvider]: settings.providerModels?.[currentProvider] || settings.model || PROVIDER_DEFAULT_MODELS[currentProvider],
        };

        setProvider(currentProvider);
        setKeys({
            gemini: settings.geminiKey || '',
            openrouter: settings.openRouterKey || '',
            groq: settings.groqKey || '',
            rapidrouter: settings.rapidRouterKey || '',
        });
        setProviderModels(mergedModels);
        setRememberKey(settings.rememberKey ?? true);
        setSpeechRate(settings.speechRate ?? 0.95);
        setShowKey(false);
        setShowShortcuts(false);

        const nextModelState = resolveProviderModelState(currentProvider, mergedModels[currentProvider]);
        setSelectedModel(nextModelState.selected);
        setCustomModel(nextModelState.custom);
    }, [settings, isOpen]);

    if (!isOpen) return null;

    const activePresetModels = PROVIDER_PRESET_MODELS[provider];
    const defaultModelId = PROVIDER_DEFAULT_MODELS[provider];
    const uiConfig = PROVIDER_UI[provider];

    const getEffectiveModelForCurrent = (sel: string, cust: string): string =>
        (sel === 'custom' ? cust.trim() : sel) || defaultModelId;

    const handleProviderChange = (newProvider: AIProvider) => {
        // Persist current provider's model selection before switching tabs
        const currentEffective = getEffectiveModelForCurrent(selectedModel, customModel);
        const updatedMap: ProviderModelsMap = {
            ...providerModels,
            [provider]: currentEffective,
        };
        setProviderModels(updatedMap);
        setProvider(newProvider);

        const nextModelState = resolveProviderModelState(newProvider, updatedMap[newProvider]);
        setSelectedModel(nextModelState.selected);
        setCustomModel(nextModelState.custom);
    };

    const handleModelSelectChange = (value: string) => {
        setSelectedModel(value);
        if (value !== 'custom') {
            setProviderModels(prev => ({ ...prev, [provider]: value }));
        }
    };

    const handleCustomModelChange = (value: string) => {
        setCustomModel(value);
        setProviderModels(prev => ({ ...prev, [provider]: value.trim() || PROVIDER_DEFAULT_MODELS[provider] }));
    };

    const handleSave = () => {
        const finalModel = getEffectiveModelForCurrent(selectedModel, customModel);
        const finalProviderModels: ProviderModelsMap = {
            ...providerModels,
            [provider]: finalModel,
        };

        onSaveSettings({
            provider,
            openRouterKey: keys.openrouter.trim(),
            geminiKey: keys.gemini.trim(),
            groqKey: keys.groq.trim(),
            rapidRouterKey: keys.rapidrouter.trim(),
            model: finalModel,
            providerModels: finalProviderModels,
            rememberKey,
            speechRate
        });
        onClose();
    };

    const handleClear = () => {
        const emptyKeys: Record<AIProvider, string> = {
            gemini: '',
            openrouter: '',
            groq: '',
            rapidrouter: '',
        };
        setKeys(emptyKeys);
        setProvider('openrouter');
        setProviderModels({});
        setSelectedModel(PROVIDER_DEFAULT_MODELS.openrouter);
        setCustomModel('');
        setRememberKey(true);
        setSpeechRate(0.95);
        onSaveSettings({
            provider: 'openrouter',
            openRouterKey: '',
            geminiKey: '',
            groqKey: '',
            rapidRouterKey: '',
            model: PROVIDER_DEFAULT_MODELS.openrouter,
            providerModels: {},
            rememberKey: true,
            speechRate: 0.95
        });
        onClose();
    };

    const hasAnyKey = Object.values(keys).some((k) => Boolean(k.trim()));

    const activeModelPreset = activePresetModels.find(m => m.id === selectedModel);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl transition-opacity duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="bg-slate-950/95 border border-white/15 rounded-3xl shadow-2xl w-[94vw] sm:max-w-lg max-h-[90dvh] overflow-y-auto p-5 sm:p-6 space-y-5 text-slate-100 relative overscroll-contain">

                {/* Modal Header */}
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-violet-600/30 flex items-center justify-center text-violet-400 border border-violet-500/30">
                            <i className="fa-solid fa-sliders text-lg" aria-hidden="true"></i>
                        </div>
                        <div>
                            <h2 id="settings-modal-title" className="text-xl font-bold text-white tracking-tight">VisionVoice Settings</h2>
                            <p className="text-xs text-slate-400">Free-Tier BYOK Providers & Model Preferences</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-colors min-h-[44px] min-w-[44px]"
                        aria-label="Close settings dialog"
                    >
                        <i className="fa-solid fa-xmark text-lg" aria-hidden="true"></i>
                    </button>
                </div>

                {/* Privacy & Zero-Backend Guarantee */}
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3.5 flex items-start space-x-3 text-xs text-emerald-200">
                    <i className="fa-solid fa-shield-halved text-emerald-400 text-base mt-0.5 flex-shrink-0" aria-hidden="true"></i>
                    <div className="space-y-1">
                        <p className="font-semibold text-emerald-300">Zero-Backend & Free-Tier BYOK</p>
                        <p className="text-slate-300 leading-relaxed text-[11px]">
                            VisionVoice has <strong>no servers or databases</strong>. All 4 providers offer free API tiers with no credit card required, and keys stay strictly in your browser with automatic failover.
                        </p>
                    </div>
                </div>

                {/* Provider Selector Grid */}
                <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Preferred AI Vision Provider
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1.5 rounded-2xl border border-white/10">
                        {PROVIDER_ORDER.map((id) => {
                            const cfg = PROVIDER_UI[id];
                            const isActive = provider === id;
                            const isConfigured = Boolean(keys[id]?.trim());
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => handleProviderChange(id)}
                                    className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-between min-h-[48px] ${
                                        isActive
                                            ? cfg.activeClass
                                            : 'text-slate-300 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <span className="flex items-center space-x-2 text-left">
                                        <i className={`${cfg.icon} text-sm flex-shrink-0`} aria-hidden="true"></i>
                                        <span className="flex flex-col leading-tight">
                                            <span>{cfg.title}</span>
                                            <span className={`text-[10px] font-normal ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                                                {cfg.subtitle}
                                            </span>
                                        </span>
                                    </span>
                                    {isConfigured && (
                                        <span
                                            className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 ml-1"
                                            title={`${cfg.title} API key configured`}
                                            aria-label={`${cfg.title} configured`}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* API Key Input */}
                <div className="space-y-2">
                    <label htmlFor="api-key-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        {uiConfig.keyLabel}
                    </label>
                    <div className="relative flex items-center">
                        <input
                            id="api-key-input"
                            type={showKey ? 'text' : 'password'}
                            value={keys[provider]}
                            onChange={(e) => setKeys(prev => ({ ...prev, [provider]: e.target.value }))}
                            placeholder={uiConfig.placeholder}
                            className="w-full bg-slate-900 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 pr-12 font-mono"
                        />
                        <button
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-3 text-slate-400 hover:text-slate-200 p-2 min-h-[40px] min-w-[40px] flex items-center justify-center"
                            aria-label={showKey ? "Hide API Key" : "Show API Key"}
                        >
                            <i className={`fa-solid ${showKey ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true"></i>
                        </button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                        Get a free API key (no credit card) at{' '}
                        <a
                            href={uiConfig.keyHelpUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${uiConfig.linkColorClass} underline font-medium`}
                        >
                            {uiConfig.keyHelpText} <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                        </a>.
                    </p>

                    {/* Remember Key Checkbox */}
                    <div className="flex items-center space-x-2.5 pt-1">
                        <input
                            type="checkbox"
                            id="rememberKey"
                            checked={rememberKey}
                            onChange={(e) => setRememberKey(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-violet-600 focus:ring-violet-500 cursor-pointer accent-violet-600"
                        />
                        <label htmlFor="rememberKey" className="text-xs text-slate-300 cursor-pointer select-none">
                            Save API keys in local browser storage (obfuscated)
                        </label>
                    </div>
                </div>

                {/* Model Selection Dropdown */}
                <div className="space-y-2">
                    <label htmlFor="model-select" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Multimodal Model Selection ({PROVIDER_LABELS[provider]})
                    </label>
                    <select
                        id="model-select"
                        value={selectedModel}
                        onChange={(e) => handleModelSelectChange(e.target.value)}
                        className="w-full bg-slate-900 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                    >
                        {activePresetModels.map((m) => (
                            <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                                {m.name}
                            </option>
                        ))}
                    </select>

                    {/* Active Model Description / Use Case Helper */}
                    {activeModelPreset?.description && (
                        <div className="flex items-start gap-2 pl-1 text-xs text-slate-400 leading-relaxed">
                            {activeModelPreset.badge && (
                                <span className="px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 font-semibold text-[10px] whitespace-nowrap mt-0.5">
                                    {activeModelPreset.badge}
                                </span>
                            )}
                            <p>💡 {activeModelPreset.description}</p>
                        </div>
                    )}

                    {selectedModel === 'custom' && (
                        <div className="space-y-1.5 mt-2">
                            <input
                                type="text"
                                value={customModel}
                                onChange={(e) => handleCustomModelChange(e.target.value)}
                                placeholder={uiConfig.customPlaceholder}
                                aria-label={`Custom ${PROVIDER_LABELS[provider]} model ID`}
                                className="w-full bg-slate-900 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 font-mono"
                            />
                            <p className="text-[11px] text-amber-400/90 pl-1">
                                ⚠️ {uiConfig.customHint}
                            </p>
                        </div>
                    )}
                </div>

                {/* Speech Synthesis Narration Rate Slider */}
                <div className="space-y-2 pt-1 border-t border-white/10">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
                        <span className="uppercase tracking-wider">Voice Narration Speed</span>
                        <span className="text-violet-400 font-mono font-bold">{speechRate.toFixed(2)}x</span>
                    </div>
                    <div className="flex items-center space-x-3">
                        <span className="text-xs text-slate-400 font-medium">Slower</span>
                        <input
                            type="range"
                            min="0.75"
                            max="1.5"
                            step="0.05"
                            value={speechRate}
                            onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                            className="w-full accent-violet-600 cursor-pointer"
                            aria-label="Adjust voice narration speed"
                        />
                        <span className="text-xs text-slate-400 font-medium">Faster</span>
                    </div>
                </div>

                {/* Keyboard Accessibility Reference */}
                <div className="pt-1">
                    <button
                        type="button"
                        onClick={() => setShowShortcuts(!showShortcuts)}
                        className="text-xs text-slate-400 hover:text-slate-200 flex items-center justify-between w-full py-1 text-left"
                        aria-expanded={showShortcuts}
                    >
                        <span className="font-semibold"><i className="fa-solid fa-keyboard mr-1.5"></i> Accessibility Keyboard Shortcuts</span>
                        <i className={`fa-solid ${showShortcuts ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px]`}></i>
                    </button>
                    {showShortcuts && (
                        <div className="mt-2 p-3 bg-slate-900/90 border border-white/10 rounded-xl text-xs space-y-1.5 text-slate-300">
                            <div className="flex justify-between"><span className="text-slate-400">Capture Photo</span><kbd className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px]">Space / Enter</kbd></div>
                            <div className="flex justify-between"><span className="text-slate-400">Describe Mode</span><kbd className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px]">D</kbd></div>
                            <div className="flex justify-between"><span className="text-slate-400">Read Text / OCR</span><kbd className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px]">R</kbd></div>
                            <div className="flex justify-between"><span className="text-slate-400">Upload Gallery</span><kbd className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px]">U</kbd></div>
                            <div className="flex justify-between"><span className="text-slate-400">Play / Pause Voice</span><kbd className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px]">S</kbd></div>
                            <div className="flex justify-between"><span className="text-slate-400">Toggle Hands-Free Voice</span><kbd className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px]">V</kbd></div>
                            <div className="flex justify-between"><span className="text-slate-400">Close Dialogs</span><kbd className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px]">Escape</kbd></div>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-3 border-t border-white/10">
                    <button
                        onClick={handleSave}
                        className="flex-1 py-3.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 font-bold text-white rounded-xl shadow-lg shadow-violet-950/60 transition-all active:scale-95 text-sm min-h-[48px]"
                    >
                        Save Settings
                    </button>
                    {hasAnyKey && (
                        <button
                            onClick={handleClear}
                            className="py-3.5 px-4 bg-slate-900 hover:bg-red-500/20 hover:text-red-400 font-semibold text-slate-400 rounded-xl border border-white/15 transition-all active:scale-95 text-sm min-h-[48px]"
                        >
                            Reset Keys
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
});

export default SettingsModal;
