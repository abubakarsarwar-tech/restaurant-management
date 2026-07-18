import Link from "next/link";
import { Clock, MapPin, Phone } from "lucide-react";

import { footerNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { Logo } from "@/components/shared/logo";
import { Container } from "@/components/shared/container";
import { InstagramIcon, FacebookIcon, XBrandIcon } from "@/components/shared/brand-icons";
import { Separator } from "@/components/ui/separator";

/**
 * SiteFooter — brand block, opening hours, link columns, social row.
 * Content is config-driven; only layout lives here.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border/60 bg-muted/40 mt-auto border-t">
      <Container className="grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo />
          <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
            {siteConfig.description}
          </p>
          <div className="flex items-center gap-2">
            {[
              {
                icon: InstagramIcon,
                href: siteConfig.links.instagram,
                label: "Instagram",
              },
              { icon: FacebookIcon, href: siteConfig.links.facebook, label: "Facebook" },
              { icon: XBrandIcon, href: siteConfig.links.x, label: "X (Twitter)" },
            ].map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="border-border/60 text-muted-foreground hover:border-primary hover:text-primary flex size-9 items-center justify-center rounded-lg border transition-all duration-200"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-foreground text-sm font-semibold tracking-wide uppercase">
            Visit Us
          </h3>
          <ul className="text-muted-foreground space-y-2.5 text-sm">
            <li className="flex items-start gap-2">
              <MapPin className="text-primary mt-0.5 size-4 shrink-0" />
              {siteConfig.contact.address}
            </li>
            <li className="flex items-start gap-2">
              <Phone className="text-primary mt-0.5 size-4 shrink-0" />
              {siteConfig.contact.phone}
            </li>
            {siteConfig.hours.map((h) => (
              <li key={h.days} className="flex items-start gap-2">
                <Clock className="text-primary mt-0.5 size-4 shrink-0" />
                <span>
                  {h.days}
                  <br />
                  <span className="text-foreground/80">{h.time}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {footerNav.map((column) => (
          <nav key={column.title} aria-label={column.title} className="space-y-3">
            <h3 className="text-foreground text-sm font-semibold tracking-wide uppercase">
              {column.title}
            </h3>
            <ul className="space-y-2.5">
              {column.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-muted-foreground hover:text-primary text-sm transition-colors duration-200"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>

      <Separator className="opacity-60" />

      <Container className="text-muted-foreground flex flex-col items-center justify-between gap-2 py-5 text-xs sm:flex-row">
        <p>
          © {year} {siteConfig.legalName}. All rights reserved.
        </p>
        <p>Made with fire, salt &amp; Next.js.</p>
      </Container>
    </footer>
  );
}
