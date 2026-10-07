import { vi } from 'vitest';

export interface MockCachesHandle {
  cache: {
    match: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  restore: () => void;
}

/**
 * Installs an in-memory implementation of the Workers Cache API on globalThis.
 * Each call starts with an empty store; call restore() in afterEach.
 */
export function installMockCaches(): MockCachesHandle {
  const store = new Map<string, Response>();
  const cache = {
    match: vi.fn(async (key: string) => store.get(key)),
    put: vi.fn(async (key: string, response: Response) => {
      store.set(key, response);
    }),
    delete: vi.fn(async (key: string) => store.delete(key)),
  };

  const original = (globalThis as { caches?: unknown }).caches;
  (globalThis as { caches?: unknown }).caches = { default: cache };

  return {
    cache,
    restore: () => {
      if (original === undefined) {
        delete (globalThis as { caches?: unknown }).caches;
      } else {
        (globalThis as { caches?: unknown }).caches = original;
      }
    },
  };
}
