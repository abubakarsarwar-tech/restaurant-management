import { SiteHeader, SiteFooter } from "@/components/layout";

/**
 * Customer-facing chrome — sticky header + routed content + footer.
 * Only the (site) route group wears it; (auth) is minimal, (admin) has its
 * own dashboard shell. Shared providers live one level up in the root layout.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
