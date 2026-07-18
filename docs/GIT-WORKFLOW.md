# Git Workflow

## Commit strategy — Conventional Commits (enforced)

commitlint blocks non-conforming messages; lint-staged auto-formats and
lints staged files on every commit. `git commit` is the quality gate.

```
<type>(<scope>): <imperative subject ≤ 100 chars>

[optional body — what & why, not how]
[optional footer — BREAKING CHANGE:, Closes #123]
```

| Type       | When                            |
| ---------- | ------------------------------- |
| `feat`     | new user-facing capability      |
| `fix`      | bug fix                         |
| `perf`     | performance only                |
| `refactor` | behavior-preserving restructure |
| `style`    | whitespace/format only          |
| `docs`     | documentation only              |
| `test`     | tests only                      |
| `build`    | deps/build system               |
| `ci`       | workflows/pipelines             |
| `chore`    | maintenance (hooks, configs)    |
| `revert`   | reverting a commit              |

**Scope** = feature slice or area: `menu`, `cart`, `checkout`, `orders`,
`admin`, `auth`, `design-system`, `deps`, `db`, `config`, …

```
feat(menu): add cursor-paginated product list endpoint
fix(cart): merge duplicate lines when adding same option set
chore(deps): bump prisma to 7.8
docs(architecture): document state placement policy
```

Practices: commit **early and atomically** (one concern per commit); never
commit secrets (`.env` is gitignored — keep it that way); prefer `pnpm` so
`pnpm-lock.yaml` stays the single lockfile.

## Branch naming

```
main                        # production — protected, tagged releases
├── develop                 # (optional) integration for long programs
├── feat/<scope>-<slug>     # features        feat/menu-crud
├── fix/<scope>-<slug>      # bug fixes       fix/cart-dupe-lines
├── hotfix/<slug>           # prod emergencies hotfix/jwt-expiry-loop
├── chore/<slug>            # maintenance     chore/upgrade-tailwind
└── docs/<slug>             # documentation   docs/api-contracts
```

kebab-case, one task per branch, delete after merge.

## Commit & PR cadence

1. Branch from latest `main`.
2. Atomic Conventional Commits; hooks keep them clean.
3. Push and open a PR — template asks for _what / why / screenshots / risk_.
4. CI must pass: typecheck, lint, build.
5. Squash-merge `feat/*` (clean history); merge-commit for release PRs.

## Hooks installed

| Hook         | Runs                                                        |
| ------------ | ----------------------------------------------------------- |
| `pre-commit` | `pnpm lint-staged` → prettier + eslint on staged files only |
| `commit-msg` | `pnpm commitlint --edit` → Conventional Commits validation  |

(Installed via Husky on `pnpm install` through the `prepare` script.)
