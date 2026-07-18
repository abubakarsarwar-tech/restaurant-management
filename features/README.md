# features/ — Feature-Sliced Modules

Every business capability lives here as a **vertical slice** with its own
components, hooks, server logic, schemas and API route surface. Nothing
cross-imports between features — shared things move up to `components/`,
`hooks/`, `lib/`, `services/` or `types/`.

## Anatomy of a feature

```
features/menu/
├── components/     # UI only used by this feature (ProductCard, MenuGrid)
├── hooks/          # TanStack Query hooks (useMenuQuery, useProductQuery)
├── server/         # Server-only code (queries.ts → Prisma, actions.ts)
├── schemas.ts      # Zod schemas shared client↔server (filters, forms)
├── types.ts        # Feature-local types (or extend types/domain.ts)
└── index.ts        # PUBLIC API — the only file other code may import from
```

## Rules

1. **Import through the barrel.** `@/features/menu`, never
   `@/features/menu/server/queries` from outside the feature.
2. **One-way dependencies.** App routes → features → lib. Never the reverse.
3. **Server vs client is explicit.** `server/` files import `server-only`;
   components stay client-agnostic until they need interactivity.
4. **Delete-aware design.** A feature folder can be deleted without
   breaking siblings (only routes that use it) — that's the architecture
   working.

## Current slices (Part 1: scaffolding only)

| Slice        | Will own                                                      | Part   |
| ------------ | ------------------------------------------------------------- | ------ |
| `auth`       | register/login/logout, session guard, role checks             | Auth   |
| `menu`       | product browsing, search, filters, dish detail                | Menu   |
| `categories` | category browsing + admin CRUD                                | Menu   |
| `cart`       | cart drawer, quantity controls, cart page                     | Cart   |
| `checkout`   | address, payment method, place-order flow                     | Orders |
| `orders`     | order history, live status tracking, reorder                  | Orders |
| `admin`      | dashboard CRUD for products/categories/orders, analytics, KDS | Admin  |
| `settings`   | restaurant profile, hours, delivery zones, tax config         | Admin  |
