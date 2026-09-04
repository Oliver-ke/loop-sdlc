/**
 * Paths a bot-authored pull request may never change. Directory entries end in
 * "/" and match by prefix; the rest match the exact repo-relative path.
 *
 * `tasks/` is deliberately NOT here — the agent must be able to set a status to
 * done and file follow-up tasks. `app/src/` is not here either, including
 * colocated unit tests: the agent needs to write tests for the code it writes.
 * `app/tests/acceptance/` IS here, and that is the anti-cheating net — tests a
 * human wrote that the agent cannot weaken.
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
  'app/vitest.config.mts',
  'app/vitest.setup.ts',
];

/** @param {string} path repo-relative, forward slashes */
export function isProtectedPath(path) {
  const normalised = path.replace(/^\.\//, '');
  return PROTECTED_PATHS.some((entry) =>
    entry.endsWith('/') ? normalised.startsWith(entry) : normalised === entry,
  );
}
