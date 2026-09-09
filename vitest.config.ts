import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * The suite covers the pure logic under `src/lib` — the derivations the app
 * presents as fact. Those are the parts where a quiet mistake stays invisible
 * in the UI: a streak that skips a day, a sleep total that loses an hour over
 * midnight, a search that silently drops a whole content type.
 *
 * `node` rather than a DOM environment on purpose. Nothing here touches the
 * document, and keeping it that way is useful pressure to hold the derivations
 * apart from the components that render them.
 *
 * The `@` alias is spelled out rather than read from tsconfig by a plugin:
 * this project is CommonJS, and the plugin that does that is ESM-only.
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Deterministic by construction: anything date-dependent takes the date as
    // an argument rather than reading the clock, so there is nothing to retry.
    retry: 0,
  },
});
