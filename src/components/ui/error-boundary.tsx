"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">Something went wrong</h2>
          <p className="text-sm text-text-muted mb-4 text-center max-w-md">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-all active:scale-[0.98]"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Page
          </button>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <pre className="mt-4 p-3 bg-red-500/10 rounded-lg text-xs text-red-300 max-w-lg overflow-auto max-h-40">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
