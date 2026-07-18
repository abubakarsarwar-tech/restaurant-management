"use client";

import { useEffect } from "react";
import { TriangleAlert, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";

/**
 * Route-segment error boundary — catches render/runtime errors below the
 * root layout. `reset()` re-renders the segment without a full navigation.
 * (Root-layout failures use global-error.tsx.)
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hook for the observability part: forward digest to Sentry/Logtail.
    console.error("[route-error]", error);
  }, [error]);

  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-5 py-20 text-center">
      <span className="bg-destructive/10 text-destructive flex size-14 items-center justify-center rounded-2xl">
        <TriangleAlert className="size-7" />
      </span>
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Something didn&apos;t cook right
        </h1>
        <p className="text-muted-foreground max-w-md">
          An unexpected error occurred. You can retry — if it keeps happening, our team
          has been notified{error.digest ? ` (ref ${error.digest})` : ""}.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={reset} className="gap-2">
          <RotateCcw className="size-4" /> Try again
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <Link href="/">
            <Home className="size-4" /> Back home
          </Link>
        </Button>
      </div>
    </Container>
  );
}
