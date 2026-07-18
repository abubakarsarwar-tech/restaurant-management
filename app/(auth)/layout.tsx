import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { siteConfig } from "@/config/site";

/**
 * Auth chrome — premium split screen.
 * Left: brand panel (display typography over a warm brand gradient, static
 *       SinCity-style backdrop made of pure CSS so it costs zero images).
 * Right: the form surface. Collapses to a single centered column on mobile.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <aside className="from-primary text-primary-foreground relative hidden overflow-hidden bg-gradient-to-br via-[#D9500F] to-[#8C2B08] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, white 1.5px, transparent 1.5px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px)",
            backgroundSize: "90px 90px, 55px 55px",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Logo
              withWordmark={false}
              className="[&_svg]:text-white [&>span]:bg-transparent"
            />
          </span>
          <span className="font-display text-xl font-semibold">{siteConfig.name}</span>
        </div>

        <div className="relative space-y-6">
          <blockquote className="space-y-4">
            <p className="font-display text-4xl leading-tight font-medium text-balance xl:text-5xl">
              “Every order is a small promise, delivered warm.”
            </p>
            <footer className="text-primary-foreground/80 text-sm">
              The operating system for modern restaurants — menu to doorstep.
            </footer>
          </blockquote>
        </div>

        <p className="text-primary-foreground/70 relative text-xs">
          © {new Date().getFullYear()} {siteConfig.legalName}
        </p>
      </aside>

      {/* Form panel */}
      <div className="bg-background relative flex min-h-screen flex-col">
        <div className="flex items-center justify-between p-6">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to site
          </Link>
          <div className="lg:hidden">
            <Logo />
          </div>
        </div>

        <main className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="animate-fade-up w-full max-w-sm">{children}</div>
        </main>
      </div>
    </div>
  );
}
