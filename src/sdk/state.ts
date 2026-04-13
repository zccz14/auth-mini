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
    me: persisted.me ? cloneMeResponse(persisted.me) : null,
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
      rp_id: typeof credential.rp_id === 'string' ? credential.rp_id : '',
      last_used_at:
        credential.last_used_at === null ||
        typeof credential.last_used_at === 'string'
          ? credential.last_used_at
          : null,
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
