/// <reference types="vitest/config" />

import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: import.meta.dirname,
  envDir: '../..',
  cacheDir: '../../node_modules/.vite/apps/web',
  server: {
    port: 4200,
  },
  preview: {
    port: 4200,
  },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      disableLogging: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    outDir: '../../dist/apps/web',
    emptyOutDir: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  test: {
    name: 'web',
    globals: true,
    environment: 'jsdom',
    env: {
      VITE_API_BASE_URL: 'http://localhost:3000/api',
    },
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:4200',
      },
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
  },
});
