import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { i18n, initializeI18n } from '@/shared/i18n/i18n';
import { queryClient } from '@/shared/query/query-client';
import { server } from './server';

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: (query: string): MediaQueryList => ({
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn(),
  }),
});
Object.defineProperty(window, 'scrollTo', {
  configurable: true,
  value: vi.fn(),
});
Object.defineProperty(URL, 'createObjectURL', {
  configurable: true,
  value: vi.fn(),
});
Object.defineProperty(URL, 'revokeObjectURL', {
  configurable: true,
  value: vi.fn(),
});

beforeAll(async () => {
  await initializeI18n();
  server.listen({ onUnhandledRequest: 'error' });
});

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

afterAll(() => server.close());
