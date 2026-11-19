import { useState, useEffect, memo } from 'react';
import { UserSettings, AIProvider } from '../types';
import { OPENROUTER_PRESET_MODELS, GEMINI_PRESET_MODELS } from '../constants';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: UserSettings;
    onSaveSettings: (settings: UserSettings) => void;
}

const SettingsModal = memo(({ isOpen, onClose, settings, onSaveSettings }: SettingsModalProps) => {
    const [provider, setProvider] = useState<AIProvider>(settings.provider || 'openrouter');
    const [openRouterKey, setOpenRouterKey] = useState<string>(settings.openRouterKey || '');
    const [geminiKey, setGeminiKey] = useState<string>(settings.geminiKey || '');
    const [showKey, setShowKey] = useState<boolean>(false);
    const [speechRate, setSpeechRate] = useState<number>(settings.speechRate ?? 0.95);
    const [showShortcuts, setShowShortcuts] = useState<boolean>(false);

    const activePresetModels = provider === 'gemini' ? GEMINI_PRESET_MODELS : OPENROUTER_PRESET_MODELS;
    const defaultModelId = provider === 'gemini' ? 'gemini-2.5-flash' : 'openrouter/free';

    const [selectedModel, setSelectedModel] = useState<string>(settings.model || defaultModelId);
    const [customModel, setCustomModel] = useState<string>('');
    const [rememberKey, setRememberKey] = useState<boolean>(settings.rememberKey ?? true);

    useEffect(() => {
        setProvider(settings.provider || 'openrouter');
        setOpenRouterKey(settings.openRouterKey || '');
        setGeminiKey(settings.geminiKey || '');
        setRememberKey(settings.rememberKey ?? true);
        setSpeechRate(settings.speechRate ?? 0.95);

        const currentModels = (settings.provider === 'gemini' ? GEMINI_PRESET_MODELS : OPENROUTER_PRESET_MODELS);
        const isPreset = currentModels.some(m => m.id === settings.model);
        if (settings.model && !isPreset) {
            setSelectedModel('custom');
            setCustomModel(settings.model);
        } else {
            setSelectedModel(settings.model || (settings.provider === 'gemini' ? 'gemini-2.5-flash' : 'openrouter/free'));
            setCustomModel('');
        }
    }, [settings, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleProviderChange = (newProvider: AIProvider) => {
        setProvider(newProvider);
        const newDefaultModel = newProvider === 'gemini' ? 'gemini-2.5-flash' : 'openrouter/free';
        setSelectedModel(newDefaultModel);
        setCustomModel('');
    };

    const handleSave = () => {
        const finalModel = selectedModel === 'custom' ? customModel.trim() : selectedModel;
        onSaveSettings({
            provider,
            openRouterKey: openRouterKey.trim(),
            geminiKey: geminiKey.trim(),
            model: finalModel || defaultModelId,
            rememberKey,
            speechRate
        });
        onClose();
    };

    const handleClear = () => {
        setOpenRouterKey('');
        setGeminiKey('');
        setSelectedModel(defaultModelId);
        setCustomModel('');
        setRememberKey(true);
        setSpeechRate(0.95);
        onSaveSettings({
            provider: 'openrouter',
            openRouterKey: '',
            geminiKey: '',
            model: 'openrouter/free',
            rememberKey: true,
            speechRate: 0.95
        });
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl transition-opacity animate-in fade-in duration-200"
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
                            <p className="text-xs text-slate-400">BYOK AI Providers & Accessibility Options</p>
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
                        <p className="font-semibold text-emerald-300">Zero-Backend & On-Device Security</p>
                        <p className="text-slate-300 leading-relaxed text-[11px]">
                            VisionVoice has <strong>no servers, databases, or user accounts</strong>. Your API keys are stored locally in your browser and used strictly for direct, encrypted client-to-API requests.
                        </p>
                    </div>
                </div>

                {/* Provider Selector Tabs */}
                <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        AI Vision Provider
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1.5 rounded-2xl border border-white/10">
                        <button
                            type="button"
                            onClick={() => handleProviderChange('openrouter')}
                            className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-2 min-h-[44px] ${
                                provider === 'openrouter'
                                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-950/50'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <i className="fa-solid fa-globe text-sm" aria-hidden="true"></i>
                            <span>OpenRouter (Free Tier)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleProviderChange('gemini')}
                            className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-2 min-h-[44px] ${
                                provider === 'gemini'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/50'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <i className="fa-brands fa-google text-sm" aria-hidden="true"></i>
                            <span>Google Gemini (AI Studio)</span>
                        </button>
                    </div>
                </div>

                {/* API Key Input */}
                <div className="space-y-2">
                    <label htmlFor="api-key-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        {provider === 'gemini' ? 'Google Gemini API Key' : 'OpenRouter API Key'}
                    </label>
                    <div className="relative flex items-center">
                        <input
                            id="api-key-input"
                            type={showKey ? 'text' : 'password'}
                            value={provider === 'gemini' ? geminiKey : openRouterKey}
                            onChange={(e) => provider === 'gemini' ? setGeminiKey(e.target.value) : setOpenRouterKey(e.target.value)}
                            placeholder={provider === 'gemini' ? 'AIzaSy...' : 'sk-or-v1-...'}
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
                        {provider === 'gemini' ? (
                            <>
                                Get a free API key at{' '}
                                <a
                                    href="https://aistudio.google.com/app/apikey"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 underline hover:text-blue-300 font-medium"
                                >
                                    Google AI Studio <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                                </a>.
                            </>
                        ) : (
                            <>
                                Get a free API key at{' '}
                                <a
                                    href="https://openrouter.ai/keys"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-violet-400 underline hover:text-violet-300 font-medium"
                                >
                                    OpenRouter.ai <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                                </a>.
                            </>
                        )}
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
                            Save API key in local browser storage (obfuscated)
                        </label>
                    </div>
                </div>

                {/* Model Selection Dropdown */}
                <div className="space-y-2">
                    <label htmlFor="model-select" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Multimodal Model Selection ({provider === 'gemini' ? 'Gemini' : 'OpenRouter'})
                    </label>
                    <select
                        id="model-select"
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full bg-slate-900 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                    >
                        {activePresetModels.map((m) => (
                            <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                                {m.name}
                            </option>
                        ))}
                    </select>

                    {/* Active Model Description / Use Case Helper */}
                    {activePresetModels.find(m => m.id === selectedModel)?.description && (
                        <p className="text-xs text-slate-400 pl-1 leading-relaxed">
                            💡 {activePresetModels.find(m => m.id === selectedModel)?.description}
                        </p>
                    )}

                    {selectedModel === 'custom' && (
                        <div className="space-y-1.5 mt-2">
                            <input
                                type="text"
                                value={customModel}
                                onChange={(e) => setCustomModel(e.target.value)}
                                placeholder={provider === 'gemini' ? 'e.g. gemini-2.5-flash' : 'e.g. qwen/qwen2.5-vl-7b-instruct:free'}
                                className="w-full bg-slate-900 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 font-mono"
                            />
                            <p className="text-[11px] text-amber-400/90 pl-1">
                                ⚠️ Model must accept image/vision inputs. Use IDs ending with <span className="font-mono font-bold">:free</span> for zero cost.
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
                    {(openRouterKey || geminiKey) && (
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
