import { createSdkError } from './errors.js';
import type { HttpClient } from './http.js';
import type {
  PersistedSdkState,
  SessionSnapshot,
  SessionResult,
  SessionTokens,
} from './types.js';

type StateStore = {
  getState(): SessionSnapshot;
  onChange(listener: (state: SessionSnapshot) => void): () => void;
  applyPersistedState(next: PersistedSdkState | null): void;
  setAuthenticated(next: SessionResult): void;
  setRecovering(next: {
    sessionId: string | null;
    accessToken: string | null;
    refreshToken: string;
    receivedAt: string;
    expiresAt: string;
    me: SessionSnapshot['me'];
  }): void;
  setAnonymous(): void;
  setAnonymousLocal(): void;
};

export function createSessionController(input: {
  http: HttpClient;
  now: () => number;
  readSharedState?: () => PersistedSdkState | null;
  recoveryTimeoutMs?: number;
  state: StateStore;
  waitForExternalStorage?: (timeoutMs: number) => Promise<void>;
}) {
  let refreshPromise: Promise<SessionResult> | null = null;
  let supersededRecoveryPromise: Promise<void> | null = null;

  return {
    getState: () => input.state.getState(),
    onChange: (listener: (state: SessionSnapshot) => void) =>
      input.state.onChange(listener),
    async acceptSessionResponse(
      response: unknown,
      options: {
        clearOnMeFailure?: 'always' | 'auth-invalidating';
      } = {},
    ): Promise<SessionResult> {
      const session = normalizeTokenResponse(response, input.now);

      input.state.setRecovering({
        ...session,
        me: input.state.getState().me,
      });

      try {
        const me = await fetchMe(session.accessToken);
        const result = { ...session, me };

        input.state.setAuthenticated(result);
        return result;
      } catch (error) {
        if (
          options.clearOnMeFailure !== 'auth-invalidating' ||
          isAuthInvalidatingError(error)
        ) {
          input.state.setAnonymous();
        }
        throw error;
      }
    },
    async refresh(): Promise<SessionResult> {
      if (refreshPromise) {
        return refreshPromise;
      }

      const snapshot = input.state.getState();

      if (!snapshot.refreshToken) {
        throw createSdkError('missing_session', 'Missing refresh token');
      }

      if (!snapshot.sessionId) {
        throw createSdkError('missing_session', 'Missing session id');
      }

      refreshPromise = (async () => {
        try {
          const response = await input.http.postJson<unknown>(
            '/session/refresh',
            {
              session_id: snapshot.sessionId,
              refresh_token: snapshot.refreshToken,
            },
          );

          return await this.acceptSessionResponse(response, {
            clearOnMeFailure: 'auth-invalidating',
          });
        } catch (error) {
          if (isSessionSupersededError(error)) {
            const recoveryPromise = startSupersededRecovery(snapshot);

            supersededRecoveryPromise = recoveryPromise.finally(() => {
              if (supersededRecoveryPromise === recoveryPromise) {
                supersededRecoveryPromise = null;
              }
            });
          } else if (isAuthInvalidatingError(error)) {
            input.state.setAnonymous();
          }
          throw error;
        } finally {
          refreshPromise = null;
        }
      })();

      return refreshPromise;
    },
    async recover(): Promise<void> {
      const snapshot = input.state.getState();

      if (!snapshot.refreshToken) {
        input.state.setAnonymous();
        return;
      }

      try {
        if (!snapshot.sessionId) {
          input.state.setAnonymous();
          return;
        }

        if (!snapshot.accessToken || needsRefresh(snapshot, input.now())) {
          await this.refresh();
          return;
        }

        const me = await fetchMe(snapshot.accessToken);
        input.state.setAuthenticated({
          sessionId: snapshot.sessionId,
          accessToken: snapshot.accessToken,
          refreshToken: snapshot.refreshToken,
          receivedAt:
            snapshot.receivedAt ?? new Date(input.now()).toISOString(),
          expiresAt: snapshot.expiresAt ?? new Date(input.now()).toISOString(),
          me,
        });
      } catch (error) {
        if (isSessionSupersededError(error)) {
          await supersededRecoveryPromise;

          const current = input.state.getState();

          if (isSameRecoveringSession(current, snapshot)) {
            input.state.setAnonymousLocal();
          }

          return;
        }

        if (isAuthInvalidatingError(error)) {
          input.state.setAnonymous();
        }
      }
    },
    async reloadMe(): Promise<SessionSnapshot['me']> {
      const snapshot = input.state.getState();

      if (!snapshot.refreshToken) {
        throw createSdkError('missing_session', 'Missing refresh token');
      }

      if (!snapshot.accessToken || needsRefresh(snapshot, input.now())) {
        return (await this.refresh()).me;
      }

      if (!snapshot.sessionId) {
        throw createSdkError('missing_session', 'Missing session id');
      }

      const me = await fetchMe(snapshot.accessToken);

      input.state.setAuthenticated({
        sessionId: snapshot.sessionId,
        accessToken: snapshot.accessToken,
        refreshToken: snapshot.refreshToken,
        receivedAt: snapshot.receivedAt ?? new Date(input.now()).toISOString(),
        expiresAt: snapshot.expiresAt ?? new Date(input.now()).toISOString(),
        me,
      });

      return me;
    },
    async logout(): Promise<void> {
      const snapshot = input.state.getState();

      if (!snapshot.refreshToken && !snapshot.accessToken) {
        input.state.setAnonymous();
        return;
      }

      try {
        let accessToken = snapshot.accessToken;

        if (
          snapshot.refreshToken &&
          (!accessToken || needsRefresh(snapshot, input.now()))
        ) {
          try {
            accessToken = (await this.refresh()).accessToken;
          } catch {
            accessToken = null;
          }
        }

        if (accessToken) {
          await input.http.postJson('/session/logout', undefined, {
            accessToken,
          });
        }
      } catch {
        // Deterministic local sign-out hides remote failures.
      } finally {
        input.state.setAnonymous();
      }
    },
  };

  async function fetchMe(accessToken: string | null) {
    if (!accessToken) {
      throw createSdkError('missing_session', 'Missing access token');
    }

    return await input.http.getJson<SessionResult['me']>('/me', {
      accessToken,
    });
  }

  async function startSupersededRecovery(snapshot: SessionSnapshot) {
    input.state.setRecovering({
      sessionId: snapshot.sessionId,
      accessToken: snapshot.accessToken,
      refreshToken: snapshot.refreshToken ?? '',
      receivedAt: snapshot.receivedAt ?? new Date(input.now()).toISOString(),
      expiresAt: snapshot.expiresAt ?? new Date(input.now()).toISOString(),
      me: snapshot.me,
    });

    const timeoutMs = input.recoveryTimeoutMs ?? 50;
    const deadline = Date.now() + timeoutMs;

    while (true) {
      const current = input.state.getState();

      if (!isSameRecoveringSession(current, snapshot)) {
        return;
      }

      const adoption = adoptRecoveredSharedState(snapshot);

      if (adoption === 'usable') {
        return;
      }

      const remainingMs = deadline - Date.now();

      if (remainingMs <= 0) {
        break;
      }

      await input.waitForExternalStorage?.(remainingMs);
    }

    input.state.setAnonymousLocal();
  }

  function adoptRecoveredSharedState(
    snapshot: SessionSnapshot,
  ): 'usable' | 'provisional' | 'none' {
    const shared = input.readSharedState?.();

    if (!shared?.sessionId || !shared.refreshToken) {
      return 'none';
    }

    if (!hasSharedSessionChanged(snapshot, shared)) {
      return 'none';
    }

    if (
      shared.accessToken &&
      shared.me &&
      !needsRefresh(
        {
          status: 'recovering',
          authenticated: false,
          sessionId: shared.sessionId,
          accessToken: shared.accessToken,
          refreshToken: shared.refreshToken,
          receivedAt: shared.receivedAt,
          expiresAt: shared.expiresAt,
          me: shared.me,
        },
        input.now(),
      )
    ) {
      input.state.setAuthenticated({
        sessionId: shared.sessionId,
        accessToken: shared.accessToken,
        refreshToken: shared.refreshToken,
        receivedAt: shared.receivedAt ?? new Date(input.now()).toISOString(),
        expiresAt: shared.expiresAt ?? new Date(input.now()).toISOString(),
        me: shared.me,
      });
      return 'usable';
    }

    input.state.applyPersistedState(shared);
    return 'provisional';
  }
}

export function normalizeTokenResponse(
  value: unknown,
  now: () => number,
): SessionTokens {
  if (!value || typeof value !== 'object') {
    throw createSdkError('request_failed', 'Invalid session payload');
  }

  const payload = value as Record<string, unknown>;

  if (
    typeof payload.access_token !== 'string' ||
    typeof payload.session_id !== 'string' ||
    typeof payload.refresh_token !== 'string' ||
    typeof payload.expires_in !== 'number'
  ) {
    throw createSdkError('request_failed', 'Invalid session payload');
  }

  const receivedAtMs = now();

  return {
    accessToken: payload.access_token,
    sessionId: payload.session_id,
    refreshToken: payload.refresh_token,
    receivedAt: new Date(receivedAtMs).toISOString(),
    expiresAt: new Date(receivedAtMs + payload.expires_in * 1000).toISOString(),
  };
}

export function needsRefresh(snapshot: SessionSnapshot, now: number): boolean {
  if (!snapshot.expiresAt || !snapshot.receivedAt) {
    return true;
  }

  const expiresAt = Date.parse(snapshot.expiresAt);
  const receivedAt = Date.parse(snapshot.receivedAt);

  if (!Number.isFinite(expiresAt) || !Number.isFinite(receivedAt)) {
    return true;
  }

  return shouldRefresh(now, expiresAt, receivedAt);
}

export function shouldRefresh(
  now: number,
  expiresAt: number,
  receivedAt: number,
): boolean {
  const lifetimeMs = expiresAt - receivedAt;
  const thresholdMs = lifetimeMs < 10 * 60_000 ? lifetimeMs / 2 : 5 * 60_000;

  return now >= expiresAt - thresholdMs;
}

function isAuthInvalidatingError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    error?: unknown;
    message?: unknown;
    status?: unknown;
  };

  return (
    candidate.error === 'invalid_refresh_token' ||
    candidate.error === 'session_invalidated' ||
    (candidate.status === 401 && candidate.error !== 'session_superseded') ||
    (candidate.code === 'request_failed' &&
      candidate.message === 'request_failed: Invalid session payload')
  );
}

function isSessionSupersededError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === 'object' &&
    (error as { error?: unknown }).error === 'session_superseded'
  );
}

function hasSharedSessionChanged(
  snapshot: SessionSnapshot,
  shared: PersistedSdkState,
): boolean {
  return (
    snapshot.sessionId !== shared.sessionId ||
    snapshot.accessToken !== shared.accessToken ||
    snapshot.refreshToken !== shared.refreshToken ||
    snapshot.receivedAt !== shared.receivedAt ||
    snapshot.expiresAt !== shared.expiresAt
  );
}

function isSameRecoveringSession(
  current: SessionSnapshot,
  snapshot: SessionSnapshot,
): boolean {
  return (
    current.status === 'recovering' && current.sessionId === snapshot.sessionId
  );
}
