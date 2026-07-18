import Link from "next/link";
import { Soup } from "lucide-react";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";

/** 404 — routed URL matched nothing. Friendly, on-brand escape hatch. */
export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-5 py-20 text-center">
      <span className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl">
        <Soup className="size-7" />
      </span>
      <div className="space-y-2">
        <p className="text-primary text-sm font-semibold tracking-widest uppercase">
          404
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          This dish isn&apos;t on the menu
        </h1>
        <p className="text-muted-foreground max-w-md">
          The page you&apos;re looking for doesn&apos;t exist or was moved. Let&apos;s get
          you back to something delicious.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Back to home</Link>
      </Button>
    </Container>
  );
}
