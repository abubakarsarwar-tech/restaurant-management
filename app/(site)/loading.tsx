import { Container } from "@/components/shared/container";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Global loading boundary — wraps <main> in a <Suspense> and shows this
 * while a route segment streams in. Mirrors the real home layout shape
 * (hero + card grid) so the swap feels seamless instead of jumpy.
 */
export default function Loading() {
  return (
    <Container
      className="space-y-10 py-16 md:py-24"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        <Skeleton className="h-6 w-40 rounded-full" />
        <Skeleton className="h-12 w-80 max-w-full" />
        <Skeleton className="h-4 w-[28rem] max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-11 w-32" />
          <Skeleton className="h-11 w-32" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    </Container>
  );
}
