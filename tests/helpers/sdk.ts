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
