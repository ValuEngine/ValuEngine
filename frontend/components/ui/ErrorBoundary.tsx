"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  section?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.section ? ` — ${this.props.section}` : ""}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="rounded-2xl p-6 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>
          <AlertTriangle size={32} className="mx-auto mb-3" style={{ color: "var(--color-danger)" }} />
          <p className="font-display font-bold text-sm mb-1" style={{ color: "var(--text-primary)" }}>
            {this.props.section ? `Erreur dans "${this.props.section}"` : "Une erreur est survenue"}
          </p>
          <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
            Cette section n&apos;a pas pu se charger correctement.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
            style={{ background: "var(--accent-primary-muted)", color: "var(--accent-primary)" }}
          >
            <RefreshCw size={14} />
            Réessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
