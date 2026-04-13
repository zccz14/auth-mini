import type {
  MeActiveSession,
  MeEd25519Credential,
  MeResponse,
  MeWebauthnCredential,
} from './types.js';

export function createMeResponseParser() {
  function createInvalidMeError() {
    const error = new Error('request_failed: Invalid /me payload') as Error & {
      code: 'request_failed';
      error: 'request_failed';
    };

    error.name = 'AuthMiniSdkError';
    error.code = 'request_failed';
    error.error = 'request_failed';

    return error;
  }

  function asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : null;
  }

  function requireString(value: unknown): string {
    if (typeof value !== 'string') {
      throw createInvalidMeError();
    }

    return value;
  }

  function requireNullableString(value: unknown): string | null {
    if (value === null) {
      return null;
    }

    return requireString(value);
  }

  function requireStringArray(value: unknown): string[] {
    return requireArray(value).map((item) => requireString(item));
  }

  function requireArray(value: unknown): unknown[] {
    if (!Array.isArray(value)) {
      throw createInvalidMeError();
    }

    return value;
  }

  function parseWebauthnCredential(value: unknown): MeWebauthnCredential {
    const record = asRecord(value);

    if (!record) {
      throw createInvalidMeError();
    }

    return {
      id: requireString(record.id),
      credential_id: requireString(record.credential_id),
      transports: requireStringArray(record.transports),
      rp_id: requireString(record.rp_id),
      last_used_at: requireNullableString(record.last_used_at),
      created_at: requireString(record.created_at),
    };
  }

  function parseEd25519Credential(value: unknown): MeEd25519Credential {
    const record = asRecord(value);

    if (!record) {
      throw createInvalidMeError();
    }

    return {
      id: requireString(record.id),
      name: requireString(record.name),
      public_key: requireString(record.public_key),
      last_used_at: requireNullableString(record.last_used_at),
      created_at: requireString(record.created_at),
    };
  }

  function parseActiveSession(value: unknown): MeActiveSession {
    const record = asRecord(value);

    if (!record) {
      throw createInvalidMeError();
    }

    return {
      id: requireString(record.id),
      created_at: requireString(record.created_at),
      expires_at: requireString(record.expires_at),
    };
  }

  function parseMeResponse(value: unknown): MeResponse {
    const record = asRecord(value);

    if (!record) {
      throw createInvalidMeError();
    }

    return {
      user_id: requireString(record.user_id),
      email: requireString(record.email),
      webauthn_credentials: requireArray(record.webauthn_credentials).map(
        parseWebauthnCredential,
      ),
      ed25519_credentials: requireArray(record.ed25519_credentials).map(
        parseEd25519Credential,
      ),
      active_sessions: requireArray(record.active_sessions).map(
        parseActiveSession,
      ),
    };
  }

  return { parseMeResponse };
}

export const { parseMeResponse } = createMeResponseParser();

export function renderMeParserSource(): string {
  return `const { parseMeResponse } = (${createMeResponseParser.toString()})();`;
}
