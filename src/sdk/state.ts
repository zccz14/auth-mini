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

export type SdkStatePersistence = {
  clear(): void;
  read(): PersistedSdkState | null;
  write(state: PersistedSdkState): void;
};

export function createStateStore(input: Storage | SdkStatePersistence) {
  const persistence = resolvePersistence(input);
  const listeners = new Set<Listener>();
  let state = hydrateSnapshot(persistence.read());

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
      persistence.clear();
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

    persistence.write(persisted);
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
}

function resolvePersistence(
  input: Storage | SdkStatePersistence,
): SdkStatePersistence {
  if (isSdkStatePersistence(input)) {
    return input;
  }

  return {
    clear() {
      clearPersistedSdkState(input);
    },
    read() {
      return readPersistedSdkState(input);
    },
    write(state) {
      writePersistedSdkState(input, state);
    },
  };
}

function isSdkStatePersistence(
  input: Storage | SdkStatePersistence,
): input is SdkStatePersistence {
  return (
    'read' in input &&
    typeof input.read === 'function' &&
    'write' in input &&
    typeof input.write === 'function' &&
    'clear' in input &&
    typeof input.clear === 'function'
  );
}

function hydrateSnapshot(persisted: PersistedSdkState | null): SessionSnapshot {
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
  });
}

function freezeSnapshot(snapshot: SessionSnapshot): SessionSnapshot {
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
  };
}
