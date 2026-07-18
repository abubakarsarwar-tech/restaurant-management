# Design System — "Warm & Premium"

Single source of truth: **`app/globals.css`** (Tailwind v4 `@theme` tokens).
Rule #1: components consume tokens (`bg-primary`, `rounded-xl`, `shadow-lift`)
— never hardcoded hex/px values. Dark mode exposes the _same token names_ via
the `.dark` class (next-themes), so every component themes automatically.

## 1 · Color

### Brand

| Token             | Light                            | Dark                | Use                                                                                                                    |
| ----------------- | -------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `primary`         | `hsl(22 93% 50%)` — flame orange | `hsl(22 95% 54%)`   | Primary CTAs, add-to-cart, active states, focus rings. Appetite psychology: warm orange stimulates hunger and urgency. |
| `secondary`       | `hsl(152 58% 27%)` — deep basil  | `hsl(152 48% 34%)`  | Secondary CTAs, "veg" trust signals. Natural contrast partner of the primary.                                          |
| `accent`          | `hsl(36 72% 93%)` — warm cream   | `hsl(24 18% 17%)`   | Chips, hover surfaces, subtle highlight behind promos.                                                                 |
| `neutral / muted` | warm paper scale, not cold gray  | warm charcoal scale | Backgrounds, borders, secondary text. The "warmth" is what makes it feel like food, not fintech.                       |

### Semantic

| Token         | Light              | Dark               | Use                                              |
| ------------- | ------------------ | ------------------ | ------------------------------------------------ |
| `success`     | `hsl(152 62% 32%)` | `hsl(152 58% 45%)` | Order delivered, payment confirmed, save success |
| `warning`     | `hsl(38 92% 42%)`  | `hsl(38 92% 52%)`  | Low stock, kitchen closing soon, spicy indicator |
| `destructive` | `hsl(0 74% 50%)`   | `hsl(0 74% 58%)`   | Delete, order failed, form errors                |
| `info`        | `hsl(210 82% 48%)` | `hsl(210 82% 58%)` | Neutral notices, prep-time hints                 |

### Surfaces & chrome

`background` / `card` / `popover` (+`-foreground` pairs), `border`, `input`,
`ring` (= primary), plus `sidebar*` (admin) and `chart-1..5` (analytics) —
all defined in both color schemes.

**Accessibility:** every foreground/background pair targets WCAG AA ≥ 4.5:1
for text, and semantic variants adjust lightness in dark mode to preserve it.

## 2 · Radius

| Token                     | Value                   | Use                                                                                |
| ------------------------- | ----------------------- | ---------------------------------------------------------------------------------- |
| `--radius` (base)         | **12px**                | friendly, modern, not toy-like                                                     |
| `sm / md / lg / xl / 2xl` | 8 / 10 / 12 / 16 / 20px | buttons `lg`, inputs `lg`, cards `2xl` (+ explicit `rounded-full` for chips/pills) |

## 3 · Elevation (shadow levels)

Warm-tinted layered shadows — elevation reads as "lifted paper on a wooden
table", not black drop-shadows:

| Token             | Character           | Use                         |
| ----------------- | ------------------- | --------------------------- |
| `shadow-2xs / xs` | hairline definition | inputs, tiny chips          |
| `shadow-sm`       | resting state       | buttons, cards at rest      |
| `shadow-md`       | hovered/active card | dish card hover             |
| `shadow-lg`       | floating            | dropdowns, cart drawer edge |
| `shadow-xl`       | modal/dialog        | dialogs, sheets             |
| `shadow-2xl`      | hero/spotlight      | promo hero cards            |

Utility `shadow-lift` = `sm → lg` + `-translate-y-0.5` on hover (200 ms) —
the default "interactive card" affordance.

## 4 · Spacing scale

Tailwind's 4px base scale (`p-4` = 16px). Rhythm rules:

- **8px grid** for component internals; **16/24/32px** between cards;
  **48/64/96px** between page sections (`py-12/16/24`).
- Touch targets ≥ **44px** (`h-11` inputs/buttons on mobile).
- Density ladder: marketing airy (≥ `gap-6`), admin dense (`gap-2..3`).

## 5 · Typography

| Role             | Font                            | Notes                                                                                      |
| ---------------- | ------------------------------- | ------------------------------------------------------------------------------------------ |
| Body/UI          | **Inter** (variable 100–900)    | `--font-sans`                                                                              |
| Display/headings | **Playfair Display** (variable) | `--font-display` — editorial, restaurant warmth; used on `h1/h2`, `CardTitle`, prices-hero |

Self-hosted via `next/font/local` (no external CDN, zero CLS, GDPR-safe).

Scale (Tailwind steps, tightened tracking on display):

| Step             | Size      | Use                                                   |
| ---------------- | --------- | ----------------------------------------------------- |
| `text-xs`        | 12px      | badges, captions, legal                               |
| `text-sm`        | 14px      | body-dense, forms, admin                              |
| `text-base`      | 16px      | body copy                                             |
| `text-lg / xl`   | 18 / 20px | section leads, card titles                            |
| `text-2xl..4xl`  | 24–36px   | page titles (display font)                            |
| `text-5xl / 6xl` | 48 / 60px | hero (display font, `tracking-tight`, `text-balance`) |

## 6 · Animation rules

| Token                           | Value                                                     |
| ------------------------------- | --------------------------------------------------------- |
| `--duration-fast / base / slow` | 150 / 200 / 300ms                                         |
| `--ease-standard`               | `cubic-bezier(.2,0,0,1)` — exits & state changes          |
| `--ease-decelerate`             | `cubic-bezier(0,0,.2,1)` — anything entering              |
| `--ease-spring`                 | `cubic-bezier(.175,.885,.32,1.275)` — playful add-to-cart |

Rules: entrances **fade+rise ≤ 300ms**; hovers ≤ 200ms; nothing essential
animates longer than 400ms; respect `prefers-reduced-motion` (Tailwind's
`motion-safe:` when we add motion to content-bearing surfaces).
Available utilities: `animate-fade-up`, `animate-scale-in`, plus the full
`tw-animate-css` set used by dialogs/sheets/menus. Framer Motion is reserved
for layout/list physics (cart quantity bumps, drawer drag).

## 7 · Component styles (contract)

- **Buttons** (`components/ui/button.tsx`): variants `default(=primary)`,
  `secondary(basil)`, `accent`, `destructive`, `success`, `warning`,
  `outline`, `ghost`, `link` × sizes `sm(32) default(40) lg(44) xl(48)
icon*`. All share: 200ms ease, `active:scale-[0.98]`, visible focus ring,
  disabled opacity-50.
- **Inputs**: `h-11`, `rounded-lg`, hover border warm-up, focus ring
  `ring/25`, `aria-invalid` auto-error styling; `Form*` wires labels +
  describedby + messages accessibly.
- **Cards**: `rounded-2xl`, `border/60`, `shadow-sm`, interactive variant
  uses `shadow-lift`.
- **Modals (Dialog)**: `rounded-2xl`, `shadow-xl`, blurred dim backdrop,
  200ms zoom-fade entrance; side **Sheets** for the cart drawer (300ms slide).
- **Toasts (Sonner)**: top-center, rich colors, token-matched surface,
  mounted once in Providers.

## 8 · Layout: containers & breakpoints

| Breakpoint | ≥ width | Notes                                     |
| ---------- | ------- | ----------------------------------------- |
| `sm`       | 640px   | large phones landscape                    |
| `md`       | 768px   | tablets — header switches to full nav     |
| `lg`       | 1024px  | desktop — admin sidebar appears           |
| `xl`       | 1280px  | customer container caps (`container-app`) |
| `2xl`      | 1536px  | admin container caps (`container-admin`)  |

`container-app` (max **1280px**, gutters 16→24→32px) for the customer site;
`container-admin` (max **1440px**). Mobile-first always. Header height is the
`--header-height` token (72px).

## 9 · Icons

**Lucide** everywhere (`size-4` inline, `size-5` standalone, stroke inherits
`currentColor`). Brand glyphs (Instagram/Facebook/X) are inline SVGs in
`components/shared/brand-icons.tsx` — lucide v1 intentionally dropped brands.
