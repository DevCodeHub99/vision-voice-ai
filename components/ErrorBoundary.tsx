import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Accessible Error Boundary for VisionVoice.
 * 
 * In the event of an unhandled runtime error:
 * 1. Announces the issue verbally using native SpeechSynthesis so visually impaired users are alerted.
 * 2. Displays a high-contrast, accessible full-screen recovery interface with a large reload button.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error:", error, errorInfo);

    // Vocal announcement for visually impaired users
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(
          "VisionVoice encountered an unexpected problem. Tap the center of the screen to reload the application."
        );
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch {
        // Fallback gracefully if speech synthesis fails
      }
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-screen w-full bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center select-none"
          onClick={this.handleReload}
        >
          <div className="w-20 h-20 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-6 text-3xl border border-red-500/40">
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>

          <h1 className="text-2xl font-bold mb-3 tracking-tight">Something went wrong</h1>
          <p className="text-slate-300 text-base max-w-md mb-8 leading-relaxed">
            VisionVoice encountered an unexpected issue. Please tap anywhere or press the button below to restart the application.
          </p>

          <button
            onClick={this.handleReload}
            className="w-full max-w-xs py-4 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-2xl shadow-lg shadow-violet-600/30 transition-all active:scale-95 touch-manipulation text-lg"
            aria-label="Reload Application"
          >
            <i className="fa-solid fa-rotate-right mr-2"></i> Reload VisionVoice
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
