import type { PersistedSdkState } from './types.js';

export const SDK_STORAGE_KEY = 'auth-mini.sdk';

export function readPersistedSdkState(
  storage: Storage,
): PersistedSdkState | null {
  const raw = storage.getItem(SDK_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return toPersistedSdkState(JSON.parse(raw));
  } catch {
    return null;
  }

  function toPersistedSdkState(value: unknown): PersistedSdkState | null {
    if (!isRecord(value)) {
      return null;
    }

    const accessToken = toNullableString(value.accessToken);
    const sessionId = toNullableString(value.sessionId);
    const refreshToken = toNullableString(value.refreshToken);
    const receivedAt = toNullableString(value.receivedAt);
    const expiresAt = toNullableString(value.expiresAt);
    const me = toMeResponse(value.me);

    if (
      accessToken === undefined ||
      sessionId === undefined ||
      refreshToken === undefined ||
      receivedAt === undefined ||
      expiresAt === undefined ||
      me === undefined
    ) {
      return null;
    }

    if (refreshToken && !sessionId) {
      return null;
    }

    return {
      accessToken,
      sessionId,
      refreshToken,
      receivedAt,
      expiresAt,
      me,
    };
  }

  function toNullableString(value: unknown): string | null | undefined {
    if (value === undefined || value === null) {
      return null;
    }

    return typeof value === 'string' ? value : undefined;
  }

  function toMeResponse(value: unknown): PersistedSdkState['me'] | undefined {
    if (value === undefined || value === null) {
      return null;
    }

    if (!isRecord(value)) {
      return undefined;
    }

    if (
      typeof value.user_id !== 'string' ||
      typeof value.email !== 'string' ||
      !Array.isArray(value.webauthn_credentials) ||
      !Array.isArray(value.active_sessions)
    ) {
      return undefined;
    }

    return {
      user_id: value.user_id,
      email: value.email,
      webauthn_credentials: [...value.webauthn_credentials],
      active_sessions: [...value.active_sessions],
    };
  }

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
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
