import {
  clearPersistedSdkState,
  readPersistedSdkState,
  writePersistedSdkState,
} from './storage.js';
import type {
  AuthenticatedStateInput,
  Listener,
  MeResponse,
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
      me: snapshot.me ? cloneMeResponse(snapshot.me) : null,
    });
  }

  function freezeSnapshot(snapshot: SessionSnapshot): SessionSnapshot {
    if (snapshot.me) {
      for (const credential of snapshot.me.webauthn_credentials) {
        Object.freeze(credential.transports);
        Object.freeze(credential);
      }
      for (const credential of snapshot.me.ed25519_credentials) {
        Object.freeze(credential);
      }
      for (const session of snapshot.me.active_sessions) {
        Object.freeze(session);
      }
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
      me: currentState.me ? cloneMeResponse(currentState.me) : null,
    };
  }

  function cloneMeResponse(me: MeResponse): MeResponse {
    return {
      user_id: me.user_id,
      email: me.email,
      webauthn_credentials: me.webauthn_credentials.map((credential) => ({
        id: credential.id,
        credential_id: credential.credential_id,
        transports: [...credential.transports],
        created_at: credential.created_at,
      })),
      ed25519_credentials: me.ed25519_credentials.map((credential) => ({
        id: credential.id,
        name: credential.name,
        public_key: credential.public_key,
        last_used_at: credential.last_used_at,
        created_at: credential.created_at,
      })),
      active_sessions: me.active_sessions.map((session) => ({
        id: session.id,
        created_at: session.created_at,
        expires_at: session.expires_at,
      })),
    };
  }
}
