import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
      // lcov is read by the local quality gate (scripts/quality-gate.mjs)
      coverage: {
        provider: 'v8',
        reporter: ['text-summary', 'lcov'],
        reportOnFailure: true,
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
      },
    },
  })
);
