import type { PersistedSdkState } from './types.js';

export const SDK_STORAGE_KEY = 'mini-auth.sdk';

export function readPersistedSdkState(
  storage: Storage,
): PersistedSdkState | null {
  const raw = storage.getItem(SDK_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PersistedSdkState;
  } catch {
    return null;
  }
}

export function writePersistedSdkState(
  storage: Storage,
  state: PersistedSdkState,
): void {
  storage.setItem(SDK_STORAGE_KEY, JSON.stringify(state));
}

export function clearPersistedSdkState(storage: Storage): void {
  storage.removeItem(SDK_STORAGE_KEY);
}
