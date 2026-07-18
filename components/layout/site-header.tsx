import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { mainNav } from "@/config/navigation";
import { Logo } from "@/components/shared/logo";
import { ModeToggle } from "@/components/shared/mode-toggle";
import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";

/**
 * SiteHeader — sticky glass header for the customer site.
 *
 * Navigation renders from `config/navigation.ts` (routes arrive in their
 * respective parts). The cart button will be wired to the cart store +
 * Sheet drawer in the Cart part — today it's a visible affordance proving
 * layout, tokens and iconography end-to-end.
 */
export function SiteHeader() {
  return (
    <header className="border-border/60 bg-background/85 sticky top-0 z-40 w-full border-b backdrop-blur-md">
      <Container className="flex h-[var(--header-height)] items-center justify-between gap-4">
        <Logo />

        <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
          {mainNav.map((item) => (
            <Button key={item.href} variant="ghost" asChild>
              <Link href={item.href}>{item.title}</Link>
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ModeToggle />
          <Button
            variant="default"
            size="default"
            className="gap-2"
            aria-label="Open cart"
          >
            <ShoppingCart className="size-4" />
            <span className="hidden sm:inline">Cart</span>
          </Button>
        </div>
      </Container>
    </header>
  );
}
