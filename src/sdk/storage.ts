import { parseMeResponse } from './me.js';
import type { PersistedSdkState } from './types.js';

type PersistedWebauthnCredential = NonNullable<
  PersistedSdkState['me']
>['webauthn_credentials'][number];

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

    try {
      return parseMeResponse(value);
    } catch {
      const record = isRecord(value) ? value : null;

      if (
        !record ||
        typeof record.user_id !== 'string' ||
        typeof record.email !== 'string' ||
        !Array.isArray(record.webauthn_credentials) ||
        !Array.isArray(record.active_sessions)
      ) {
        return undefined;
      }

      return {
        user_id: record.user_id,
        email: record.email,
        webauthn_credentials: record.webauthn_credentials.map(
          normalizeWebauthnCredential,
        ),
        ed25519_credentials: Array.isArray(record.ed25519_credentials)
          ? [...record.ed25519_credentials]
          : [],
        active_sessions: [...record.active_sessions],
      };
    }
  }

  function normalizeWebauthnCredential(
    value: unknown,
  ): PersistedWebauthnCredential {
    if (!isRecord(value)) {
      return {
        id: '',
        credential_id: '',
        transports: [],
        rp_id: '',
        last_used_at: null,
        created_at: '',
      };
    }

    return {
      id: typeof value.id === 'string' ? value.id : '',
      credential_id:
        typeof value.credential_id === 'string' ? value.credential_id : '',
      transports: Array.isArray(value.transports)
        ? value.transports.filter(
            (transport): transport is string => typeof transport === 'string',
          )
        : [],
      rp_id: typeof value.rp_id === 'string' ? value.rp_id : '',
      last_used_at:
        value.last_used_at === null || typeof value.last_used_at === 'string'
          ? value.last_used_at
          : null,
      created_at: typeof value.created_at === 'string' ? value.created_at : '',
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
