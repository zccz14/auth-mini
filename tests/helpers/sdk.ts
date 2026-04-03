import type { PersistedSdkState } from '../../src/sdk/types.js';

type StorageSeed = Partial<PersistedSdkState>;

export function fakeStorage(seed: StorageSeed = {}): Storage {
  const data = new Map<string, string>();

  if (Object.keys(seed).length > 0) {
    data.set('mini-auth.sdk', JSON.stringify(seed));
  }

  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key) {
      return data.get(key) ?? null;
    },
    key(index) {
      return Array.from(data.keys())[index] ?? null;
    },
    removeItem(key) {
      data.delete(key);
    },
    setItem(key, value) {
      data.set(key, value);
    },
  };
}

export function executeServedSdk(
  source: string,
  options: {
    currentScriptSrc?: string | null;
    storage?: Storage;
    storageUnavailable?: boolean;
  } = {},
): Window & typeof globalThis {
  const windowObject = {} as Window & typeof globalThis;
  const document = {
    currentScript:
      options.currentScriptSrc === undefined
        ? { src: 'https://app.example.com/sdk/singleton-iife.js' }
        : options.currentScriptSrc === null
          ? null
          : { src: options.currentScriptSrc },
  };
  if (options.storageUnavailable) {
    Object.defineProperty(windowObject, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('localStorage blocked');
      },
    });
  } else {
    Object.defineProperty(windowObject, 'localStorage', {
      configurable: true,
      value: options.storage ?? fakeStorage(),
    });
  }

  const run = new Function('window', 'document', source);
  run(windowObject, document);
  return windowObject;
}
