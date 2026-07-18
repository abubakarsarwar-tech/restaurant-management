/**
 * lint-staged — runs ONLY on staged files inside the pre-commit hook,
 * keeping commits fast while guaranteeing nothing unformatted/unlinted
 * ever reaches the repository.
 */
const config = {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{js,mjs,cjs,json,css,md,yml,yaml}": ["prettier --write"],
};

export default config;
