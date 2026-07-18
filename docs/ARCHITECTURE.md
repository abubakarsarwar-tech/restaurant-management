# Architecture

Feature-Sliced Design on top of the Next.js App Router. The goal: a codebase
that stays navigable at **thousands of products, hundreds of sessions, dozens
of contributors** — where any feature can be understood (or deleted) in
isolation.

## Dependency rule (the one law)

```
app routes ──▶ features ──▶ lib / services / store / hooks / utils ──▶ config
                  │
                  └─────────▶ components (ui / layout / shared)
```

- Dependencies point **down and inward only**. `lib` never imports `features`;
  `components/ui` never imports `features`; features never import each other.
- Anything needed by **two or more features** graduates up into `components/`,
  `hooks/`, `utils/`, `types/` or `services/`.
- Secrets live in modules that start with `import "server-only"`.

## Folder-by-folder

| Folder               | Purpose                                                                                                                                                                                                                          | Examples                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `app/`               | **Routing & composition only.** Pages/layouts assemble feature components; they contain no business logic. Holds global `loading.tsx` / `error.tsx` / `not-found.tsx` / `global-error.tsx` and Route Handlers under `app/api/*`. | `app/layout.tsx`, `app/api/health/route.ts`       |
| `app/fonts/`         | Self-hosted variable fonts (Inter, Playfair Display) consumed by `lib/fonts.ts` via `next/font/local`.                                                                                                                           | `inter-latin-wght-normal.woff2`                   |
| `components/ui/`     | Design-system **primitives** (shadcn/ui pattern, `new-york` style). Styled exclusively with tokens — no hardcoded values. Owned by us: edit freely.                                                                              | `button.tsx`, `dialog.tsx`, `form.tsx`            |
| `components/layout/` | App **chrome**: header/footer and future admin sidebar/shell.                                                                                                                                                                    | `site-header.tsx`, `site-footer.tsx`              |
| `components/shared/` | Reusable **widgets** that know our brand but no business logic: logo, theme toggle, container, error boundary, brand icons.                                                                                                      | `logo.tsx`, `mode-toggle.tsx`                     |
| `features/`          | **Business slices** — the heart of the app. Each feature owns components/hooks/server/schemas/types and exposes ONE public barrel. See `features/README.md`.                                                                     | `features/menu/`, `features/cart/`                |
| `hooks/`             | Cross-cutting generic hooks. Feature hooks stay inside their feature.                                                                                                                                                            | `use-debounce`, `use-media-query`, `use-mounted`  |
| `lib/`               | **Core infrastructure** that every feature relies on: DB, auth crypto, media SDK, fonts, `cn()`. Server libs begin with `server-only`.                                                                                           | `prisma.ts`, `jwt.ts`, `hash.ts`, `cloudinary.ts` |
| `lib/generated/`     | Prisma client output (gitignored; `pnpm db:generate`).                                                                                                                                                                           | —                                                 |
| `providers/`         | Client **context composition root**. Order-sensitive: Theme → Query → Tooltip → Toaster.                                                                                                                                         | `providers/index.tsx`                             |
| `services/`          | Outbound integration layer: the typed `api-client` and (per feature) service entry points that components call instead of raw `fetch`.                                                                                           | `api-client.ts`                                   |
| `store/`             | **Client state** (Zustand): ephemeral UI + persisted cart. Server state never enters here — that's TanStack Query's job.                                                                                                         | `cart.store.ts`, `ui.store.ts`                    |
| `types/`             | Shared **contracts**: API envelope, pagination, domain types. Single import source (`@/types`).                                                                                                                                  | `api.ts`, `domain.ts`                             |
| `utils/`             | Pure, testable helpers (no React, no secrets). Money formatting lives here because rule #1 is _money is integer cents_.                                                                                                          | `format.ts`                                       |
| `config/`            | Read-time configuration: Zod-validated **env** (server + public split), site metadata, navigation registries.                                                                                                                    | `env.ts`, `site.ts`, `navigation.ts`              |
| `middleware/`        | Composable middleware factories consumed by root `middleware.ts` (`chain`, `withSecurityHeaders`, future `withAuthGuard`).                                                                                                       | `chain.ts`                                        |
| `prisma/`            | Schema, CLI config, migrations (future), seed entry.                                                                                                                                                                             | `schema.prisma`, `prisma.config.ts`               |
| `public/`            | Static assets served at `/`. Logos, OG images.                                                                                                                                                                                   | —                                                 |
| `docs/`              | This documentation set.                                                                                                                                                                                                          | —                                                 |

## Route architecture (present & planned)

```
app/
├── layout.tsx            # root shell: Providers + header + footer
├── page.tsx              # (placeholder — real home arrives with Menu part)
├── loading.tsx           # Suspense boundary (skeleton mirrors page shape)
├── error.tsx             # segment error boundary w/ reset()
├── global-error.tsx      # root-layout failure, self-contained
├── not-found.tsx         # branded 404
├── api/
│   └── health/route.ts   # liveness probe, ApiResponse envelope
│
├── (planned) (site)/     # route group: customer pages (menu, dish, cart…)
│   └── menu/page.tsx
├── (planned) (admin)/    # route group: its OWN layout w/ sidebar
│   └── admin/…
└── (planned) (auth)/     # login / register — minimal chrome group
```

Route groups let the customer site and the admin dashboard share providers
while shipping **different chrome and different client bundles**.

## State placement policy

| State kind               | Lives in               | Example                                  |
| ------------------------ | ---------------------- | ---------------------------------------- |
| Server/DB data           | **TanStack Query**     | menu items, orders, analytics            |
| Local UI & session cart  | **Zustand** (`store/`) | cart items (persisted), drawers, sidebar |
| URL-shareable view state | **searchParams**       | `?category=pizza&sort=price`, table page |
| Forms                    | **React Hook Form**    | checkout, product CRUD                   |
| Transient DOM-ish        | **React state**        | input focus, hover                       |

## Scaling playbook (thousands of products)

1. **List endpoints are cursor-paginated** (`Paginated<T>` contract already in
   `types/`) — no OFFSET scans as tables grow.
2. **Menu reads are cache-first**: Server Component + ISR (60–300s) +
   `revalidatePath` on admin writes. Spiky dinner traffic hits CDN, not MySQL.
3. **Search/filters push into the URL** (`searchParams`) → shareable,
   back-button-safe, server-rendered.
4. **Images are CDN-transformed** (Cloudinary) + `next/image` sizes hints →
   no 4 MB dish photos on mobile.
5. **MySQL indexes follow the query patterns** designed in the schema part
   (category + availability + price), with covering indexes for hot lists.
6. **Feature slices keep teams parallel** — admin CRUD work never needs to
   touch customer browsing code.
