/**
 * Commitlint — enforces Conventional Commits on every commit.
 *   type(scope): subject        e.g.  feat(cart): persist items to localStorage
 * See docs/GIT-WORKFLOW.md for the full convention.
 */
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat", // new user-facing capability
        "fix", // bug fix
        "perf", // performance improvement
        "refactor", // code change, no behavior change
        "style", // formatting/whitespace
        "docs", // documentation only
        "test", // tests only
        "build", // build system / deps
        "ci", // CI configuration
        "chore", // maintenance
        "revert", // reverts a commit
      ],
    ],
    "subject-case": [2, "never", ["upper-case"]],
    "header-max-length": [2, "always", 100],
  },
};

export default config;
