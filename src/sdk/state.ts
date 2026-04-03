import {
  clearPersistedSdkState,
  readPersistedSdkState,
  writePersistedSdkState,
} from './storage.js';
import type {
  AuthenticatedStateInput,
  SessionSnapshot,
  SdkStatus,
} from './types.js';

type Listener = (state: SessionSnapshot) => void;

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
      writePersistedSdkState(storage, next);
      updateState({
        status: 'authenticated',
        authenticated: true,
        accessToken: next.accessToken,
        refreshToken: next.refreshToken,
        expiresAt: next.expiresAt,
        me: next.me,
      });
    },
    setAnonymous(): void {
      clearPersistedSdkState(storage);
      updateState(createSnapshot('anonymous'));
    },
  };

  function updateState(next: SessionSnapshot) {
    state = freezeSnapshot(next);

    for (const listener of listeners) {
      listener(cloneSnapshot(state));
    }
  }
}

function hydrateState(storage: Storage): SessionSnapshot {
  const persisted = readPersistedSdkState(storage);

  if (!persisted?.refreshToken) {
    return createSnapshot('anonymous');
  }

  return {
    status: 'recovering',
    authenticated: false,
    accessToken: persisted.accessToken,
    refreshToken: persisted.refreshToken,
    expiresAt: persisted.expiresAt,
    me: persisted.me,
  };
}

function createSnapshot(status: SdkStatus): SessionSnapshot {
  return freezeSnapshot({
    status,
    authenticated: status === 'authenticated',
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    me: null,
  });
}

function cloneSnapshot(snapshot: SessionSnapshot): SessionSnapshot {
  return freezeSnapshot({
    status: snapshot.status,
    authenticated: snapshot.authenticated,
    accessToken: snapshot.accessToken,
    refreshToken: snapshot.refreshToken,
    expiresAt: snapshot.expiresAt,
    me: snapshot.me
      ? {
          user_id: snapshot.me.user_id,
          email: snapshot.me.email,
          webauthn_credentials: [...snapshot.me.webauthn_credentials],
          active_sessions: [...snapshot.me.active_sessions],
        }
      : null,
  });
}

function freezeSnapshot(snapshot: SessionSnapshot): SessionSnapshot {
  if (snapshot.me) {
    Object.freeze(snapshot.me.webauthn_credentials);
    Object.freeze(snapshot.me.active_sessions);
    Object.freeze(snapshot.me);
  }

  return Object.freeze(snapshot);
}
