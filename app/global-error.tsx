"use client";

/**
 * Last-resort boundary — replaces the ENTIRE document when the root layout
 * itself throws. Must render its own <html>/<body> and cannot rely on any
 * shared components (they may be the thing that failed), hence inline styles.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          backgroundColor: "hsl(36 33% 97%)",
          color: "hsl(24 24% 12%)",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Something went wrong</h1>
        <p style={{ color: "hsl(28 10% 42%)", margin: 0 }}>
          A critical error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          style={{
            border: 0,
            borderRadius: "0.75rem",
            padding: "0.75rem 1.5rem",
            fontWeight: 600,
            color: "#fff",
            backgroundColor: "hsl(22 93% 50%)",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
