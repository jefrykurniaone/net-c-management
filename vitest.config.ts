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
  },
});
