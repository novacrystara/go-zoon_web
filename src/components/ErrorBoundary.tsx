import React from 'react';
import { reportClientError } from '../api';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Catches render-time crashes so a malformed API response or bad state
// shows a recoverable screen instead of a blank white page.
export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // This project has no @types/react installed, so React.Component's generic
  // members don't resolve; `declare` type-annotates them without altering the
  // real runtime fields React.Component itself sets up via super(props).
  declare props: ErrorBoundaryProps;
  declare state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught render error:', error, info);
    reportClientError(error.message, error.stack, 'react-error-boundary');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 text-center p-6">
          <span className="text-3xl">⚠️</span>
          <h1 className="font-black text-slate-900 text-lg">Something went wrong</h1>
          <p className="text-slate-500 text-sm max-w-xs">
            Go-Zoon hit an unexpected error. Please reload the app to continue.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-brand-orange text-white font-bold rounded-lg text-sm"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
