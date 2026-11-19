import { RefObject, ChangeEvent, memo } from 'react';
import { Task } from '../types';

interface BottomNavProps {
    task: Task;
    activeTab: 'camera' | 'upload';
    onTaskChange: (task: Task) => void;
    onTabChange: (tab: 'camera' | 'upload') => void;
    onCaptureClick: () => void;
    onUploadClick: () => void;
    fileInputRef: RefObject<HTMLInputElement | null>;
    handleImageUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}

const BottomNav = memo(({
    task,
    activeTab,
    onTaskChange,
    onTabChange,
    onCaptureClick,
    onUploadClick,
    fileInputRef,
    handleImageUpload
}: BottomNavProps) => {
    return (
        <nav
            className="safe-bottom flex flex-col items-center bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pb-6 pt-8 space-y-5"
            role="navigation"
            aria-label="Mode Navigation and Capture"
        >
            {/* Center Capture / Action Trigger */}
            <div className="relative flex items-center justify-center">
                {/* Camera Capture Trigger */}
                {activeTab === 'camera' ? (
                    <button
                        onClick={onCaptureClick}
                        className="group relative w-22 h-22 rounded-full flex items-center justify-center transition-all active:scale-90 touch-manipulation focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-400"
                        aria-label="Capture photo now (or press Space)"
                    >
                        {/* Outer Glow Ring */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-violet-600/40 via-cyan-500/40 to-white/30 rounded-full animate-ping opacity-40"></div>
                        <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 rounded-full blur-md opacity-70 group-hover:opacity-100 transition duration-300"></div>
                        
                        {/* Inner High-Contrast White Shutter Button */}
                        <div className="relative w-18 h-18 bg-white rounded-full border-4 border-slate-950 shadow-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                            <div className="w-13 h-13 rounded-full border-2 border-slate-300 bg-slate-100/80"></div>
                        </div>
                    </button>
                ) : (
                    /* Gallery Upload Trigger */
                    <button
                        onClick={onUploadClick}
                        className="group relative w-20 h-20 rounded-full flex items-center justify-center transition-transform active:scale-95 touch-manipulation shadow-2xl bg-gradient-to-br from-violet-600 to-indigo-700 border-2 border-white/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-400"
                        aria-label="Select and upload image from device gallery"
                    >
                        <i className="fa-solid fa-image text-3xl text-white group-hover:scale-110 transition-transform" aria-hidden="true"></i>
                    </button>
                )}
            </div>

            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
                accept="image/*"
                aria-label="Choose image file"
            />

            {/* Bottom Segmented Mode Selector */}
            <div
                className="flex items-center justify-between w-[92vw] max-w-sm mx-auto bg-slate-900/90 backdrop-blur-xl border border-white/15 rounded-2xl p-1.5 shadow-2xl"
                role="tablist"
                aria-label="Operating Modes"
            >
                {/* Describe Mode */}
                <button
                    role="tab"
                    id="tab-describe"
                    aria-selected={task === Task.DESCRIBE && activeTab === 'camera'}
                    aria-controls="camera-view"
                    onClick={() => { onTaskChange(Task.DESCRIBE); onTabChange('camera'); }}
                    className={`flex-1 flex flex-col items-center justify-center py-2.5 px-2 rounded-xl transition-all duration-200 min-h-[48px] touch-manipulation ${
                        task === Task.DESCRIBE && activeTab === 'camera'
                            ? 'bg-violet-600 text-white font-bold shadow-lg shadow-violet-900/40'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
                    }`}
                >
                    <i className="fa-solid fa-eye text-base mb-1" aria-hidden="true"></i>
                    <span className="text-[11px] tracking-wide uppercase">Describe</span>
                </button>

                {/* Read Text Mode */}
                <button
                    role="tab"
                    id="tab-read"
                    aria-selected={task === Task.READ && activeTab === 'camera'}
                    aria-controls="camera-view"
                    onClick={() => { onTaskChange(Task.READ); onTabChange('camera'); }}
                    className={`flex-1 flex flex-col items-center justify-center py-2.5 px-2 rounded-xl transition-all duration-200 min-h-[48px] touch-manipulation ${
                        task === Task.READ && activeTab === 'camera'
                            ? 'bg-cyan-600 text-white font-bold shadow-lg shadow-cyan-900/40'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
                    }`}
                >
                    <i className="fa-solid fa-align-left text-base mb-1" aria-hidden="true"></i>
                    <span className="text-[11px] tracking-wide uppercase">Read Text</span>
                </button>

                {/* Upload Mode */}
                <button
                    role="tab"
                    id="tab-upload"
                    aria-selected={activeTab === 'upload'}
                    aria-controls="camera-view"
                    onClick={() => onTabChange('upload')}
                    className={`flex-1 flex flex-col items-center justify-center py-2.5 px-2 rounded-xl transition-all duration-200 min-h-[48px] touch-manipulation ${
                        activeTab === 'upload'
                            ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-900/40'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
                    }`}
                >
                    <i className="fa-solid fa-upload text-base mb-1" aria-hidden="true"></i>
                    <span className="text-[11px] tracking-wide uppercase">Upload</span>
                </button>
            </div>
        </nav>
    );
});

export default BottomNav;
