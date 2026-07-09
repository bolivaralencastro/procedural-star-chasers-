import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts on purpose: the game core is pure TypeScript,
// so tests run in a plain node environment without the Solid plugin or jsdom.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/game/**/*.test.ts'],
  },
});
