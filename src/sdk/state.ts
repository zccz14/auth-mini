import {
  clearPersistedSdkState,
  readPersistedSdkState,
  writePersistedSdkState,
} from './storage.js';
import type {
  AuthenticatedStateInput,
  Listener,
  PersistedSdkState,
  SessionSnapshot,
  SdkStatus,
} from './types.js';

export function createStateStore(storage: Storage) {
  const listeners = new Set<Listener>();
  let state = hydrateState(storage);

  return {
    getState(): SessionSnapshot {
      return cloneSnapshot(state);
    },
    onChange(listener: Listener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setAuthenticated(next: AuthenticatedStateInput): void {
      updatePersistedState({
        status: 'authenticated',
        authenticated: true,
        ...next,
      });
    },
    setRecovering(next: AuthenticatedStateInput): void {
      updatePersistedState({
        status: 'recovering',
        authenticated: false,
        ...next,
      });
    },
    setAnonymous(): void {
      clearPersistedSdkState(storage);
      updateState(createSnapshot('anonymous'));
    },
    applyPersistedState(next: PersistedSdkState | null): void {
      updateState(hydrateSnapshot(next));
    },
    setAnonymousLocal(): void {
      updateState(createSnapshot('anonymous'));
    },
  };

  function updatePersistedState(next: SessionSnapshot): void {
    const persisted = clonePersistedState(next);

    writePersistedSdkState(storage, persisted);
    updateState({
      status: next.status,
      authenticated: next.authenticated,
      ...persisted,
    });
  }

  function updateState(next: SessionSnapshot): void {
    state = freezeSnapshot(next);

    for (const listener of listeners) {
      listener(cloneSnapshot(state));
    }
  }

  function hydrateState(currentStorage: Storage): SessionSnapshot {
    return hydrateSnapshot(readPersistedSdkState(currentStorage));
  }

  function hydrateSnapshot(
    persisted: PersistedSdkState | null,
  ): SessionSnapshot {
    if (!persisted?.refreshToken || !persisted.sessionId) {
      return createSnapshot('anonymous');
    }

    return freezeSnapshot({
      status: 'recovering',
      authenticated: false,
      sessionId: persisted.sessionId,
      accessToken: persisted.accessToken,
      refreshToken: persisted.refreshToken,
      receivedAt: persisted.receivedAt,
      expiresAt: persisted.expiresAt,
      me: persisted.me,
    });
  }

  function createSnapshot(status: SdkStatus): SessionSnapshot {
    return freezeSnapshot({
      status,
      authenticated: status === 'authenticated',
      sessionId: null,
      accessToken: null,
      refreshToken: null,
      receivedAt: null,
      expiresAt: null,
      me: null,
    });
  }

  function cloneSnapshot(snapshot: SessionSnapshot): SessionSnapshot {
    return freezeSnapshot({
      status: snapshot.status,
      authenticated: snapshot.authenticated,
      sessionId: snapshot.sessionId,
      accessToken: snapshot.accessToken,
      refreshToken: snapshot.refreshToken,
      receivedAt: snapshot.receivedAt,
      expiresAt: snapshot.expiresAt,
      me: snapshot.me
        ? {
            user_id: snapshot.me.user_id,
            email: snapshot.me.email,
            webauthn_credentials: [...snapshot.me.webauthn_credentials],
            ed25519_credentials: Array.isArray(snapshot.me.ed25519_credentials)
              ? [...snapshot.me.ed25519_credentials]
              : [],
            active_sessions: [...snapshot.me.active_sessions],
          }
        : null,
    });
  }

  function freezeSnapshot(snapshot: SessionSnapshot): SessionSnapshot {
    if (snapshot.me) {
      Object.freeze(snapshot.me.webauthn_credentials);
      Object.freeze(snapshot.me.ed25519_credentials);
      Object.freeze(snapshot.me.active_sessions);
      Object.freeze(snapshot.me);
    }

    return Object.freeze(snapshot);
  }

  function clonePersistedState(
    currentState: AuthenticatedStateInput,
  ): AuthenticatedStateInput {
    return {
      accessToken: currentState.accessToken,
      sessionId: currentState.sessionId,
      refreshToken: currentState.refreshToken,
      receivedAt: currentState.receivedAt,
      expiresAt: currentState.expiresAt,
      me: currentState.me
        ? {
            user_id: currentState.me.user_id,
            email: currentState.me.email,
            webauthn_credentials: [...currentState.me.webauthn_credentials],
            ed25519_credentials: Array.isArray(
              currentState.me.ed25519_credentials,
            )
              ? [...currentState.me.ed25519_credentials]
              : [],
            active_sessions: [...currentState.me.active_sessions],
          }
        : null,
    };
  }
}
