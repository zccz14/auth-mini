import type { DatabaseClient } from '../../infra/db/client.js';
import { decodeBase64Url } from '../../shared/crypto.js';
import type { AppLogger } from '../../shared/logger.js';
import {
  createCredential as createStoredCredential,
  deleteCredentialById,
  listCredentialsByUserId,
  updateCredentialName,
} from './repo.js';

export class InvalidEd25519CredentialError extends Error {
  constructor() {
    super('invalid_ed25519_credential');
  }
}

export class InvalidEd25519AuthenticationError extends Error {
  constructor() {
    super('invalid_ed25519_authentication');
  }
}

export class Ed25519CredentialNotFoundError extends Error {
  constructor() {
    super('credential_not_found');
  }
}

type CredentialResponse = {
  id: string;
  name: string;
  public_key: string;
  last_used_at: string | null;
  created_at: string;
};

export function createCredential(
  db: DatabaseClient,
  input: {
    userId: string;
    name: string;
    publicKey: string;
    logger?: AppLogger;
  },
): CredentialResponse {
  validateEd25519PublicKey(input.publicKey);

  const credential = createStoredCredential(db, {
    userId: input.userId,
    name: input.name,
    publicKey: input.publicKey,
  });

  input.logger?.info(
    {
      event: 'ed25519.credential.created',
      credential_id: credential.id,
      user_id: input.userId,
    },
    'ED25519 credential created',
  );

  return mapCredential(credential);
}

export function listCredentials(
  db: DatabaseClient,
  userId: string,
): CredentialResponse[] {
  return listCredentialsByUserId(db, userId).map(mapCredential);
}

export function updateCredential(
  db: DatabaseClient,
  input: {
    credentialId: string;
    userId: string;
    name: string;
    logger?: AppLogger;
  },
): CredentialResponse {
  const credential = updateCredentialName(db, {
    id: input.credentialId,
    userId: input.userId,
    name: input.name,
  });

  if (!credential) {
    throw new Ed25519CredentialNotFoundError();
  }

  input.logger?.info(
    {
      event: 'ed25519.credential.updated',
      credential_id: credential.id,
      user_id: input.userId,
    },
    'ED25519 credential updated',
  );

  return mapCredential(credential);
}

export function deleteCredential(
  db: DatabaseClient,
  input: {
    credentialId: string;
    userId: string;
    logger?: AppLogger;
  },
): { ok: true } {
  if (
    !deleteCredentialById(db, { id: input.credentialId, userId: input.userId })
  ) {
    throw new Ed25519CredentialNotFoundError();
  }

  input.logger?.info(
    {
      event: 'ed25519.credential.deleted',
      credential_id: input.credentialId,
      user_id: input.userId,
    },
    'ED25519 credential deleted',
  );

  return { ok: true };
}

function validateEd25519PublicKey(publicKey: string) {
  let decoded: Buffer;

  try {
    decoded = decodeBase64Url(publicKey);
  } catch {
    throw new InvalidEd25519CredentialError();
  }

  if (decoded.length !== 32) {
    throw new InvalidEd25519CredentialError();
  }
}

function mapCredential(credential: {
  id: string;
  name: string;
  publicKey: string;
  lastUsedAt: string | null;
  createdAt: string;
}): CredentialResponse {
  return {
    id: credential.id,
    name: credential.name,
    public_key: credential.publicKey,
    last_used_at: credential.lastUsedAt,
    created_at: credential.createdAt,
  };
}
