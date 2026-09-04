/**
 * Paths a bot-authored pull request may never change. Directory entries end in
 * "/" and match by prefix; the rest match the exact repo-relative path.
 *
 * `tasks/` is deliberately NOT here — the agent must be able to set a status to
 * done and file follow-up tasks. `app/src/` is not here either, including
 * colocated unit tests: the agent needs to write tests for the code it writes.
 * `app/tests/acceptance/` IS here, and that is the anti-cheating net — tests a
 * human wrote that the agent cannot weaken.
 *
 * ## Why every extension is listed, not just the one in use
 *
 * Protecting a config by its exact current path is one-extension-deep and can
 * be *shadowed*: a config the agent is allowed to ADD is a config it can use to
 * override the one it is not allowed to EDIT. Vitest, ESLint, Next and PostCSS
 * all resolve their config by trying a list of extensions, so leaving
 * `app/vitest.config.mts` protected while `app/vitest.config.ts` is writable
 * lets the agent commit a second Vitest config that drops `tests/**` from
 * `include` — `app/tests/acceptance/` then never runs and `verify` stays green
 * forever. So this list must cover **every extension a tool would resolve**,
 * present in the repo or not.
 *
 * `app/tsconfig.json` and the ESLint config are CI configuration in the same
 * sense: `"strict": false` or `export default []` neuters two of the four legs
 * of `npm run verify`. `.nvmrc` selects the Node version both CI jobs run on.
 *
 * When adding a tool, add every extension it resolves at once. This file is the
 * authoritative list; CLAUDE.md, README.md and CODEOWNERS mirror it for humans.
 */
export const PROTECTED_PATHS = [
  '.github/',
  'infra/',
  'harness/',
  'app/tests/acceptance/',
  'CLAUDE.md',
  'CODEOWNERS',
  'app/CLAUDE.md',
  'app/AGENTS.md',
  'package.json',
  'package-lock.json',
  'app/package.json',
  // Vitest config — every extension Vitest resolves.
  'app/vitest.config.mts',
  'app/vitest.config.ts',
  'app/vitest.config.cts',
  'app/vitest.config.js',
  'app/vitest.config.cjs',
  'app/vitest.config.mjs',
  // Vitest setup file, likewise.
  'app/vitest.setup.ts',
  'app/vitest.setup.mts',
  'app/vitest.setup.js',
  'app/vitest.setup.mjs',
  // Typecheck configuration.
  'app/tsconfig.json',
  // ESLint flat config — every extension eslint resolves.
  'app/eslint.config.mjs',
  'app/eslint.config.ts',
  'app/eslint.config.js',
  'app/eslint.config.cjs',
  'app/eslint.config.mts',
  'app/eslint.config.cts',
  // Build configuration.
  'app/next.config.ts',
  'app/next.config.js',
  'app/next.config.mjs',
  'app/postcss.config.mjs',
  'app/postcss.config.js',
  // The Node version both CI jobs run on.
  '.nvmrc',
];

/** @param {string} path repo-relative, forward slashes */
export function isProtectedPath(path) {
  const normalised = path.replace(/^\.\//, '');
  return PROTECTED_PATHS.some((entry) =>
    entry.endsWith('/') ? normalised.startsWith(entry) : normalised === entry,
  );
}
