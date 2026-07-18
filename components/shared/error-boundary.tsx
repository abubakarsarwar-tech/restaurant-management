"use client";

import * as React from "react";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Generic client-side ErrorBoundary for isolating fragile widgets
 * (maps embed, chart panel) so one crash can't blank the whole screen.
 * Route-level failures use Next's error.tsx files instead.
 */
type ErrorBoundaryProps = {
  children: React.ReactNode;
  /** Rendered instead of children when a descendant throws. */
  fallback?: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
};

type ErrorBoundaryState = { hasError: boolean };

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info);
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="border-destructive/25 bg-destructive/5 flex flex-col items-center justify-center gap-3 rounded-2xl border p-8 text-center">
            <TriangleAlert className="text-destructive size-8" />
            <p className="text-foreground text-sm font-medium">
              Something went wrong loading this section.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => this.setState({ hasError: false })}
            >
              Try again
            </Button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
