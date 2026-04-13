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
        !Array.isArray(record.ed25519_credentials) ||
        !Array.isArray(record.active_sessions)
      ) {
        return undefined;
      }

      const webauthnCredentials = record.webauthn_credentials
        .map(normalizeWebauthnCredential)
        .filter(
          (credential): credential is PersistedWebauthnCredential =>
            credential !== null,
        );
      const ed25519Credentials = record.ed25519_credentials
        .map(normalizeEd25519Credential)
        .filter(
          (
            credential,
          ): credential is NonNullable<
            PersistedSdkState['me']
          >['ed25519_credentials'][number] => credential !== null,
        );
      const activeSessions = record.active_sessions
        .map(normalizeActiveSession)
        .filter(
          (
            session,
          ): session is NonNullable<
            PersistedSdkState['me']
          >['active_sessions'][number] => session !== null,
        );

      if (
        webauthnCredentials.length !== record.webauthn_credentials.length ||
        ed25519Credentials.length !== record.ed25519_credentials.length ||
        activeSessions.length !== record.active_sessions.length
      ) {
        return undefined;
      }

      return {
        user_id: record.user_id,
        email: record.email,
        webauthn_credentials: webauthnCredentials,
        ed25519_credentials: ed25519Credentials,
        active_sessions: activeSessions,
      };
    }
  }

  function normalizeWebauthnCredential(
    value: unknown,
  ): PersistedWebauthnCredential | null {
    if (!isRecord(value)) {
      return null;
    }

    if (
      typeof value.id !== 'string' ||
      typeof value.credential_id !== 'string' ||
      typeof value.created_at !== 'string'
    ) {
      return null;
    }

    return {
      id: value.id,
      credential_id: value.credential_id,
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
      created_at: value.created_at,
    };
  }

  function normalizeEd25519Credential(value: unknown) {
    if (!isRecord(value)) {
      return null;
    }

    if (
      typeof value.id !== 'string' ||
      typeof value.name !== 'string' ||
      typeof value.public_key !== 'string' ||
      typeof value.created_at !== 'string' ||
      !(value.last_used_at === null || typeof value.last_used_at === 'string')
    ) {
      return null;
    }

    return {
      id: value.id,
      name: value.name,
      public_key: value.public_key,
      last_used_at: value.last_used_at,
      created_at: value.created_at,
    };
  }

  function normalizeActiveSession(value: unknown) {
    if (!isRecord(value)) {
      return null;
    }

    if (
      typeof value.id !== 'string' ||
      typeof value.created_at !== 'string' ||
      typeof value.expires_at !== 'string'
    ) {
      return null;
    }

    return {
      id: value.id,
      created_at: value.created_at,
      expires_at: value.expires_at,
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
