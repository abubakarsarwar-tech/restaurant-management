import { Flame, Database, Palette, ShieldCheck, Blocks, Rocket } from "lucide-react";

import { siteConfig } from "@/config/site";
import { Container } from "@/components/shared/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Temporary foundation-status page (Part 1 verification only).
 * Confirms, at a glance, that layout, fonts, tokens, dark mode and the
 * component library all render correctly. Replaced by the real home page
 * in a later part.
 */
const FOUNDATIONS = [
  {
    icon: Blocks,
    title: "Component Library",
    body: "shadcn/ui primitives wired to the design tokens — Button, Card, Dialog, Sheet, Form & more.",
  },
  {
    icon: Palette,
    title: "Design System",
    body: "Flame-orange brand, warm neutrals, semantic states, elevation scale & display typography.",
  },
  {
    icon: Database,
    title: "Data Layer",
    body: "Prisma + MySQL datasource configured, Prisma singleton ready for the schema part.",
  },
  {
    icon: ShieldCheck,
    title: "Typed Environment",
    body: "Zod-validated env contract — the app fails fast on misconfiguration, never silently.",
  },
  {
    icon: Rocket,
    title: "Server State",
    body: "TanStack Query + devtools mounted globally; typed API client + response envelope ready.",
  },
  {
    icon: Flame,
    title: "Client State",
    body: "Zustand stores (cart with localStorage persistence, UI state) with cents-safe money math.",
  },
];

export default function HomePage() {
  return (
    <Container className="py-16 md:py-24">
      <section className="mx-auto max-w-2xl space-y-6 text-center">
        <Badge variant="accent" className="animate-fade-up px-3 py-1">
          Part 1 · Foundation Ready
        </Badge>
        <h1 className="font-display animate-fade-up text-4xl font-semibold tracking-tight text-balance md:text-6xl">
          {siteConfig.name}
        </h1>
        <p className="text-muted-foreground animate-fade-up text-lg leading-relaxed">
          {siteConfig.tagline} This placeholder proves the project foundation renders
          end-to-end — tokens, typography, dark mode, providers and the shared layout are
          live.
        </p>
        <div className="animate-fade-up flex items-center justify-center gap-3">
          <Button size="lg">Primary CTA</Button>
          <Button size="lg" variant="secondary">
            Secondary
          </Button>
          <Button size="lg" variant="outline">
            Outline
          </Button>
        </div>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FOUNDATIONS.map((f) => (
          <Card key={f.title} className="shadow-lift">
            <CardHeader>
              <span className="bg-primary/10 text-primary mb-1 flex size-10 items-center justify-center rounded-xl">
                <f.icon className="size-5" />
              </span>
              <CardTitle>{f.title}</CardTitle>
              <CardDescription className="leading-relaxed">{f.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
    </Container>
  );
}
