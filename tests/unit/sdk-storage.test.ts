import { describe, expect, it } from 'vitest';
import {
  readPersistedSdkState,
  SDK_STORAGE_KEY,
} from '../../src/sdk/storage.js';

function createStorage(raw: unknown): Storage {
  const value = raw === null ? null : JSON.stringify(raw);

  return {
    getItem: (key) => (key === SDK_STORAGE_KEY ? value : null),
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    get length() {
      return value ? 1 : 0;
    },
  } as Storage;
}

describe('readPersistedSdkState', () => {
  it('ignores legacy persisted me fields and returns only session tokens', () => {
    expect(
      readPersistedSdkState(
        createStorage({
          sessionId: 'session-1',
          accessToken: 'access-1',
          refreshToken: 'refresh-1',
          receivedAt: '2026-04-13T00:00:00.000Z',
          expiresAt: '2026-04-13T01:00:00.000Z',
          me: {
            user_id: 'user-1',
            email: 'user@example.com',
            webauthn_credentials: [],
            active_sessions: [],
          },
        }),
      ),
    ).toEqual({
      sessionId: 'session-1',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      receivedAt: '2026-04-13T00:00:00.000Z',
      expiresAt: '2026-04-13T01:00:00.000Z',
    });
  });

  it('ignores malformed legacy persisted me payloads', () => {
    expect(
      readPersistedSdkState(
        createStorage({
          sessionId: 'session-1',
          accessToken: 'access-1',
          refreshToken: 'refresh-1',
          receivedAt: '2026-04-13T00:00:00.000Z',
          expiresAt: '2026-04-13T01:00:00.000Z',
          me: {
            user_id: 'user-1',
            email: 'user@example.com',
            webauthn_credentials: [],
            ed25519_credentials: [
              {
                id: 'cred-1',
                public_key: 'public-key',
                created_at: '2026-04-13T00:00:00.000Z',
                last_used_at: null,
              },
            ],
            active_sessions: [],
          },
        }),
      ),
    ).toEqual({
      sessionId: 'session-1',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      receivedAt: '2026-04-13T00:00:00.000Z',
      expiresAt: '2026-04-13T01:00:00.000Z',
    });
  });

  it('rejects invalid session token fields', () => {
    expect(
      readPersistedSdkState(
        createStorage({
          sessionId: 'session-1',
          accessToken: { value: 'access-1' },
          refreshToken: 'refresh-1',
          receivedAt: '2026-04-13T00:00:00.000Z',
          expiresAt: '2026-04-13T01:00:00.000Z',
          me: {
            user_id: 'user-1',
          },
        }),
      ),
    ).toBeNull();
  });
});
