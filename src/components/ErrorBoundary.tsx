import React from 'react';
import { AlertTriangle, RotateCcw, ShieldAlert } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  declare readonly props: Readonly<ErrorBoundaryProps>;
  public state: ErrorBoundaryState = { hasError: false, errorMessage: '' };
  declare setState: (state: Partial<ErrorBoundaryState>) => void;

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected application error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Application ErrorBoundary caught error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      let parsedMessage = this.state.errorMessage;
      let isPermissionError = false;
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed && parsed.error && parsed.operationType) {
          parsedMessage = `Database ${parsed.operationType} failed on "${parsed.path || 'unknown'}": ${parsed.error}`;
          isPermissionError = String(parsed.error).toLowerCase().includes('permission');
        }
      } catch {
        // Not JSON
      }

      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-rose-200 max-w-lg w-full overflow-hidden">
            <div className="bg-[#0A2A66] text-white p-5 border-b-4 border-[#C9A227] flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-900/60 border border-rose-400/50 flex items-center justify-center text-rose-300">
                {isPermissionError ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="font-bold font-serif text-base uppercase tracking-wide">
                  Ghana Police Service Case Tracker
                </h2>
                <p className="text-xs text-blue-200">
                  {isPermissionError ? 'Security & Authorization Guard' : 'Application Recovery Notice'}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                {isPermissionError
                  ? 'Access to the requested cloud record was blocked by database Row Level Security (RLS) policies. Please ensure you are signed in with a verified account.'
                  : 'The interface encountered an unexpected error while processing your request.'}
              </p>

              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs font-mono text-rose-900 break-words">
                {parsedMessage}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  onClick={this.handleReset}
                  className="bg-[#0A2A66] hover:bg-[#071D49] text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center space-x-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>Recover Interface</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
