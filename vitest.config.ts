import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // Prevent `import 'server-only'` from throwing in test environments.
      'server-only': fileURLToPath(
        new URL('./src/__mocks__/server-only.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'node',
    // Scoped to `src/` rather than the whole tree: a git worktree checked out
    // under `.claude/worktrees/` carries its own copy of every test file, and
    // the default `**/*.test.ts` glob counts them all, so a run reports several
    // hundred passing tests while an agent's branch is checked out.
    include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
});
