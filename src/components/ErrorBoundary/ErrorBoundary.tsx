import React from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";

interface ErrorBoundaryInnerProps {
  children: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
  onReset?: () => void;
}

interface ErrorBoundaryInnerState {
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

// Class-based boundary that captures any error thrown by descendants,
// including TanStack Query failures when `throwOnError` is enabled.
class ErrorBoundaryInner extends React.Component<
  ErrorBoundaryInnerProps,
  ErrorBoundaryInnerState
> {
  constructor(props: ErrorBoundaryInnerProps) {
    super(props);
    this.state = { error: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryInnerState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    this.props.onError?.(error, info);
    console.error("ErrorBoundary caught an error:", error, info);
  }

  handleReset(): void {
    this.props.onReset?.();
    this.setState({ error: null });
  }

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    const message = error?.message ?? String(error);
    const showDetails = Boolean(import.meta.env && import.meta.env.DEV);

    return (
      <div
        className="flex min-h-[60vh] items-center justify-center bg-(--background-color) p-6"
        role="alert"
      >
        <div className="w-full max-w-120 rounded border-t-4 border-(--color1) bg-(--background-color2) px-6 py-8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <h1 className="mb-3 font-(--f1b) text-[1.4rem] text-(--color1)">
            Something went wrong
          </h1>
          <p className="mb-4 font-(--f1r) text-(--text-color2)">
            We could not load this content. Please try again.
          </p>
          {showDetails && (
            <pre className="mb-4 max-h-40 overflow-auto break-words rounded bg-(--background-buttons) p-2 text-left font-mono text-xs whitespace-pre-wrap">
              {message}
            </pre>
          )}
          <button
            type="button"
            className="cursor-pointer rounded border-0 bg-(--button-background) px-5 py-2.5 font-(--f1b) text-(--button-text) transition-colors duration-200 hover:bg-(--color2)"
            onClick={this.handleReset}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}

// Pairing the class boundary with `QueryErrorResetBoundary` lets the
// fallback's "Try again" button reset any failed queries inside the
// subtree so they refetch on the next render.
function ErrorBoundary({ children }: ErrorBoundaryProps): JSX.Element {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundaryInner onReset={reset}>{children}</ErrorBoundaryInner>
      )}
    </QueryErrorResetBoundary>
  );
}

export default ErrorBoundary;
