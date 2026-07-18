"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FolderTree, Loader2, Search, ShoppingBag, Users } from "lucide-react";

import { api } from "@/services/api-client";
import { useDebounce } from "@/hooks/use-debounce";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Global admin search (⌘K). Debounced → /api/admin/search, grouped results,
 * keyboard-first (Escape closes, Enter goes to the first hit).
 */
type SearchResults = {
  products: { id: string; name: string; slug: string; isActive: boolean }[];
  categories: { id: string; name: string; slug: string }[];
  orders: { id: string; orderNumber: number; status: string; customerName: string }[];
  customers: { id: string; fullName: string; phone: string }[];
};

const EMPTY: SearchResults = { products: [], categories: [], orders: [], customers: [] };

export function CommandSearch() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const debounced = useDebounce(query, 250);
  const router = useRouter();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data = EMPTY, isFetching } = useQuery({
    queryKey: ["admin", "search", debounced],
    queryFn: () => api.get<SearchResults>("/admin/search", { params: { q: debounced } }),
    enabled: open && debounced.trim().length >= 2,
    staleTime: 15_000,
  });

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const hasAny =
    data.products.length +
      data.categories.length +
      data.orders.length +
      data.customers.length >
    0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Search (⌘K)"
        className="group border-border bg-background text-muted-foreground hover:text-foreground flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-200 md:h-9 md:w-56 md:justify-start md:gap-2 md:px-3 lg:w-64"
      >
        <Search className="size-4" />
        <span className="hidden text-sm md:block">Search…</span>
        <kbd className="border-border bg-muted text-muted-foreground ml-auto hidden rounded-md border px-1.5 py-0.5 text-[10px] font-medium md:block">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-[15%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl"
        >
          <DialogTitle className="sr-only">Global search</DialogTitle>
          <div className="border-border flex items-center gap-3 border-b px-4">
            {isFetching ? (
              <Loader2 className="text-muted-foreground size-4 animate-spin" />
            ) : (
              <Search className="text-muted-foreground size-4" />
            )}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search orders, products, customers…"
              autoFocus
              className="placeholder:text-muted-foreground/60 h-12 w-full bg-transparent text-sm outline-none"
            />
            <kbd className="border-border bg-muted text-muted-foreground rounded-md border px-1.5 py-0.5 text-[10px]">
              ESC
            </kbd>
          </div>

          <div className="max-h-[50vh] overflow-y-auto p-2">
            {debounced.trim().length < 2 ? (
              <p className="text-muted-foreground p-6 text-center text-sm">
                Type at least 2 characters to search across the restaurant.
              </p>
            ) : !hasAny && !isFetching ? (
              <p className="text-muted-foreground p-6 text-center text-sm">
                No matches for “{debounced}”.
              </p>
            ) : (
              <div className="space-y-2">
                {isFetching && !hasAny && (
                  <div className="space-y-2 p-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-9 w-full rounded-lg" />
                    ))}
                  </div>
                )}

                {data.orders.length > 0 && (
                  <Group label="Orders">
                    {data.orders.map((o) => (
                      <ResultRow
                        key={o.id}
                        icon={ShoppingBag}
                        title={`#${o.orderNumber}`}
                        subtitle={`${o.customerName} · ${o.status}`}
                        onClick={() => go(`/admin/orders?focus=${o.id}`)}
                      />
                    ))}
                  </Group>
                )}
                {data.products.length > 0 && (
                  <Group label="Products">
                    {data.products.map((p) => (
                      <ResultRow
                        key={p.id}
                        icon={FolderTree}
                        title={p.name}
                        subtitle={p.isActive ? p.slug : `${p.slug} · inactive`}
                        onClick={() => go(`/admin/products?focus=${p.id}`)}
                      />
                    ))}
                  </Group>
                )}
                {data.customers.length > 0 && (
                  <Group label="Customers">
                    {data.customers.map((c) => (
                      <ResultRow
                        key={c.id}
                        icon={Users}
                        title={c.fullName}
                        subtitle={c.phone}
                        onClick={() => go(`/admin/customers?focus=${c.id}`)}
                      />
                    ))}
                  </Group>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-wider uppercase">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ResultRow({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
        "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
      )}
    >
      <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="text-foreground block truncate text-sm font-medium">
          {title}
        </span>
        <span className="text-muted-foreground block truncate text-xs">{subtitle}</span>
      </span>
    </button>
  );
}
