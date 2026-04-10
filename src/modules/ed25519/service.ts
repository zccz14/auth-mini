import { createPublicKey, verify } from 'node:crypto';
import type { DatabaseClient } from '../../infra/db/client.js';
import { decodeBase64Url, generateOpaqueToken } from '../../shared/crypto.js';
import type { AppLogger } from '../../shared/logger.js';
import { TTLS } from '../../shared/time.js';
import { mintSessionTokens, type TokenPair } from '../session/service.js';
import {
  consumeChallenge,
  createChallenge,
  createCredential as createStoredCredential,
  deleteCredentialById,
  getChallengeByRequestId,
  getCredentialById,
  listCredentialsByUserId,
  updateCredentialName,
  updateCredentialLastUsedAt,
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

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

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

export function startAuthentication(
  db: DatabaseClient,
  input: { credentialId: string; logger?: AppLogger },
): { request_id: string; challenge: string } {
  const credential = getCredentialById(db, input.credentialId);

  if (!credential) {
    throw new InvalidEd25519AuthenticationError();
  }

  const challenge = createChallenge(db, {
    credentialId: credential.id,
    challenge: generateOpaqueToken(),
    expiresAt: new Date(
      Date.now() + TTLS.webauthnChallengeSeconds * 1000,
    ).toISOString(),
  });

  input.logger?.info(
    {
      event: 'ed25519.authenticate.started',
      credential_id: credential.id,
      request_id: challenge.requestId,
      user_id: credential.userId,
    },
    'ED25519 authentication challenge created',
  );

  return {
    request_id: challenge.requestId,
    challenge: challenge.challenge,
  };
}

export async function verifyAuthentication(
  db: DatabaseClient,
  input: {
    requestId: string;
    signature: string;
    issuer: string;
    logger?: AppLogger;
  },
): Promise<TokenPair> {
  try {
    const now = new Date().toISOString();
    const challenge = getChallengeByRequestId(db, input.requestId);

    if (!challenge || challenge.consumedAt || challenge.expiresAt <= now) {
      throw new InvalidEd25519AuthenticationError();
    }

    const credential = getCredentialById(db, challenge.credentialId);

    if (!credential) {
      throw new InvalidEd25519AuthenticationError();
    }

    const signature = decodeBase64Url(input.signature);
    const publicKey = createPublicKey({
      key: Buffer.concat([
        ED25519_SPKI_PREFIX,
        decodeBase64Url(credential.publicKey),
      ]),
      format: 'der',
      type: 'spki',
    });
    const verified = verify(
      null,
      Buffer.from(challenge.challenge, 'utf8'),
      publicKey,
      signature,
    );

    if (!verified || !consumeChallenge(db, challenge.requestId, now)) {
      throw new InvalidEd25519AuthenticationError();
    }

    updateCredentialLastUsedAt(db, {
      id: credential.id,
      lastUsedAt: now,
    });

    const tokens = await mintSessionTokens(db, {
      userId: credential.userId,
      authMethod: 'ed25519',
      issuer: input.issuer,
      logger: input.logger,
    });

    input.logger?.info(
      {
        event: 'ed25519.authenticate.succeeded',
        credential_id: credential.id,
        request_id: challenge.requestId,
        session_id: tokens.session.id,
        user_id: credential.userId,
      },
      'ED25519 authentication verified',
    );

    return {
      session_id: tokens.session_id,
      access_token: tokens.access_token,
      token_type: tokens.token_type,
      expires_in: tokens.expires_in,
      refresh_token: tokens.refresh_token,
    };
  } catch (error) {
    input.logger?.warn(
      {
        event: 'ed25519.authenticate.failed',
        request_id: input.requestId,
      },
      'ED25519 authentication failed',
    );

    if (error instanceof InvalidEd25519AuthenticationError) {
      throw error;
    }

    throw new InvalidEd25519AuthenticationError();
  }
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
