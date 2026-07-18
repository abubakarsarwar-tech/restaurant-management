# 🍽️ Saffron Table — Restaurant Ordering Platform

A production-grade restaurant ordering web application (customer website +
admin dashboard + MySQL), engineered in the spirit of Uber Eats / FoodPanda /
modern restaurant POS systems.

> **Status: Part 1 — Foundation.** Architecture, toolchain, design system,
> providers, design tokens and conventions are done and verified
> (typecheck ✓ lint ✓ build ✓). Features land in subsequent parts.

---

## 1 · Why this stack

Every choice below had to answer three questions: _does it make us faster
today, safer at scale tomorrow, and easier to hire for always?_

### Framework & language

| Choice                      | Why                                                                                                                                                                                                                                                                                   | Scalability & future expansion                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js 15 (App Router)** | One framework for the customer site (SEO-critical, server-rendered), the admin dashboard (interactive), AND the API (Route Handlers). Server Components cut client JS drastically; Turbopack makes dev instant; `next/image` + route streaming are table stakes for food-delivery UX. | Grows from single server → edge middleware, ISR menu pages, on-demand revalidation after admin edits, per-route caching strategies — without an architectural rewrite. |
| **React 19**                | Actions, `use`, improved hydration & concurrent features; the entire ecosystem (RHF, Radix, Query) is React-19-ready.                                                                                                                                                                 | Server Actions give us mutation endpoints without writing API boilerplate for admin CRUD.                                                                              |
| **TypeScript (strict)**     | Refactor confidence across a codebase that will hold thousands of products, order flows and reports. One `types/` contract shared client↔server.                                                                                                                                      | Zod schemas infer TS types → runtime validation and compile-time types never drift.                                                                                    |

### Data & state

| Choice                 | Why                                                                                                                                                                                                                                             | Scalability & future expansion                                                                                                                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MySQL 8 + Prisma 7** | Relational integrity is non-negotiable for orders/payments (ACID transactions, FKs, reporting joins). Prisma gives a fully-typed client, migrations, and Studio. Prisma 7's Rust-free client + driver adapters lightens serverless cold starts. | Indexing/cursors scale browsing into the millions of rows; driver adapters let us switch pooling strategy (proxy, read replicas) by config, not code. Horizontal read scaling and Pg-compatible warehouses stay open. |
| **TanStack Query 5**   | Server state (menu, orders, analytics) needs caching, invalidation, retries, optimistic updates — not hand-rolled fetches. Devtools included.                                                                                                   | Query key conventions scale to hundreds of endpoints; infinite queries handle "thousands of products" browsing without OFFSET pain.                                                                                   |
| **Zustand 5**          | Client state (cart, UI toggles) should be tiny, fast and framework-agnostic — no Provider pyramid. Selectors prevent rerenders; `persist` middleware saves the cart to localStorage for free.                                                   | Cart items are cents-integers today; multi-vendor/multi-tenant carts later are just another slice + selector.                                                                                                         |

### Forms, media & motion

| Choice                    | Why                                                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **React Hook Form + Zod** | Uncontrolled inputs = no per-keystroke rerenders in checkout; the same Zod schema validates on the server → one source of truth.                      |
| **Tailwind CSS v4**       | CSS-first `@theme` config: the design system IS design tokens. Zero runtime, tiny bundles, dead-simple dark mode via `.dark`.                         |
| **shadcn/ui**             | Components are **copied into the repo**, not a dependency — full control of a11y, styling and upgrades. Radix primitives give WAI-ARIA behavior free. |
| **Framer Motion**         | Physics-based micro-interactions (add-to-cart, drawer, page transitions) that CSS keyframes can't express, tree-shakeable.                            |
| **Swiper**                | Battle-tested touch carousels (hero promos, category rails, dish galleries) with lazy loading.                                                        |
| **Lucide**                | 1500+ consistent SVG icons, tree-shaken, stroke-matched to our UI.                                                                                    |
| **Cloudinary**            | Dish photos → on-the-fly resize/format/focal crop via CDN; signed uploads from admin. Keeps image ops off our server.                                 |
| **JWT + bcrypt**          | Stateless sessions that fit App Router middleware; bcrypt cost factor is env-tunable as hardware improves.                                            |
| **next-themes + Sonner**  | Flash-free dark mode; accessible global toasts mounted once.                                                                                          |

### Package manager: **pnpm**

| Criteria                | npm                  | pnpm ✅                             | bun            |
| ----------------------- | -------------------- | ----------------------------------- | -------------- |
| Disk/install efficiency | duplicates           | content-addressed store, hard links | fast but young |
| Dependency strictness   | loose (phantom deps) | strict by default                   | loose-ish      |
| Monorepo path           | workspaces           | best-in-class                       | okay           |
| Ecosystem maturity      | ✅                   | ✅                                  | evolving       |

Strict node-resolution kills an entire bug class ("works because some other
package hoisted it"), hard-linked installs are the fastest on CI, and
workspaces future-proof a `apps/web + packages/ui` split if we ever need it.

---

## 2 · Quick start

```bash
# 1. prerequisites: Node ≥ 20.9, pnpm 10 (corepack enable), Docker (for MySQL)
corepack enable

# 2. install + env
pnpm install
cp .env.example .env      # fill in values (see docs/ENVIRONMENT.md)

# 3. start MySQL 8 (Docker) — or point DATABASE_URL at your own instance
pnpm db:up

# 4. generate the Prisma client (required once, and after schema changes)
pnpm db:generate

# 5. run
pnpm dev                  # http://localhost:3000
```

Quality gates (all wired, zero config):

```bash
pnpm typecheck            # tsc --noEmit
pnpm lint                 # eslint (next/core-web-vitals + ts + prettier)
pnpm format               # prettier incl. tailwind class sorting
pnpm build                # production build
```

`/api/health` exposes a liveness probe returning the shared `ApiResponse`
envelope.

## 3 · Repository map

| Area          | Purpose                                                                           |
| ------------- | --------------------------------------------------------------------------------- |
| `app/`        | App Router: routes, layouts, loading/error boundaries, API handlers               |
| `components/` | Shared UI — `ui/` primitives (shadcn), `layout/` chrome, `shared/` widgets        |
| `features/`   | Business slices (menu, cart, checkout, orders, admin…) — see `features/README.md` |
| `hooks/`      | Cross-feature React hooks (`use-debounce`, `use-media-query`, …)                  |
| `lib/`        | Core infrastructure: prisma, jwt, hashing, cloudinary, fonts, `cn`                |
| `providers/`  | Client context composition root (theme, query, toaster)                           |
| `services/`   | Typed API client + feature service entry points                                   |
| `store/`      | Zustand client state (cart w/ persistence, UI)                                    |
| `types/`      | Shared contracts: `ApiResponse`, pagination, domain models                        |
| `utils/`      | Pure formatters/helpers (money is CENTS, always)                                  |
| `config/`     | Zod-validated env, site + navigation registries                                   |
| `middleware/` | Composable middleware factories (`chain`)                                         |
| `prisma/`     | Schema (empty in Part 1), config, future migrations & seed                        |

➡️ Deep dives: [Architecture](docs/ARCHITECTURE.md) ·
[Design System](docs/DESIGN-SYSTEM.md) ·
[Environment](docs/ENVIRONMENT.md) ·
[Git Workflow](docs/GIT-WORKFLOW.md)

## 4 · Conventions that keep us fast

- **Imports:** absolute via `@/` (`@/components/ui/button`). ESLint rejects
  deep relative imports.
- **Server/client split:** anything touching secrets imports `server-only`;
  public config goes through `config/env.public.ts`.
- **Money:** integer **cents** everywhere; format with `formatPrice` at the edge.
- **API shape:** every route returns `ApiResponse<T>`; the typed
  `services/api-client.ts` unwraps it and throws `ApiError`.
- **Commits:** Conventional Commits enforced by commitlint; staged files are
  linted+formatted by lint-staged on every commit.
- **Theming:** never hardcode colors — use tokens (`bg-primary`,
  `text-muted-foreground`, `shadow-lift`, `container-app`).

## 5 · Roadmap (Parts 2+)

Auth (JWT sessions, roles) → Menu/Categories (models + CRUD + Cloudinary
uploads) → Cart & Checkout (drawer, order placement) → Orders (tracking,
status pipeline) → Admin Dashboard (KDS, analytics, settings) → hardening
(rate limiting, observability, E2E).
