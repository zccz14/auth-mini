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
      return state;
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
    state = next;

    for (const listener of listeners) {
      listener(state);
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
  return {
    status,
    authenticated: status === 'authenticated',
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    me: null,
  };
}
