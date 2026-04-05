import {
  generateAuthenticationOptions as generateSimpleWebAuthnAuthenticationOptions,
  generateRegistrationOptions as generateSimpleWebAuthnRegistrationOptions,
  verifyAuthenticationResponse as verifySimpleWebAuthnAuthenticationResponse,
  verifyRegistrationResponse as verifySimpleWebAuthnRegistrationResponse,
} from '@simplewebauthn/server';
import type { DatabaseClient } from '../../infra/db/client.js';
import { normalizeAllowedOrigin } from '../../infra/origins/repo.js';
import { decodeBase64Url, encodeBase64Url } from '../../shared/crypto.js';
import type { AppLogger } from '../../shared/logger.js';
import { TTLS } from '../../shared/time.js';
import { mintSessionTokens } from '../session/service.js';
import {
  consumeChallengeAndUpdateCredentialCounter,
  consumeChallenge,
  consumeUnusedRegistrationChallengesForUser,
  createChallenge,
  createCredential,
  deleteCredentialById,
  getChallengeByRequestId,
  getCredentialByCredentialIdAndRpId,
} from './repo.js';

type ParsedCredential = {
  id: string;
  rawId: string;
  type: 'public-key';
};

type RegistrationCredential = ParsedCredential & {
  clientExtensionResults?: Record<string, unknown>;
  response: {
    clientDataJSON: string;
    attestationObject: string;
    transports?: string[];
  };
};

type AuthenticationCredential = ParsedCredential & {
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle?: string | null;
  };
};

export class InvalidWebauthnRegistrationError extends Error {
  constructor() {
    super('invalid_webauthn_registration');
  }
}

export class InvalidWebauthnAuthenticationError extends Error {
  constructor() {
    super('invalid_webauthn_authentication');
  }
}

export class DuplicateCredentialError extends Error {
  constructor() {
    super('duplicate_credential');
  }
}

export class WebauthnCredentialNotFoundError extends Error {
  constructor() {
    super('credential_not_found');
  }
}

export async function generateRegistrationOptions(
  db: DatabaseClient,
  input: {
    userId: string;
    email: string;
    rpId?: string;
    origin?: string;
    logger?: AppLogger;
  },
): Promise<{
  request_id: string;
  publicKey: {
    challenge: string;
    rp: { name: 'auth-mini'; id: string };
    user: { id: string; name: string; displayName: string };
    pubKeyCredParams: Array<{ type: 'public-key'; alg: -7 | -257 }>;
    timeout: number;
    authenticatorSelection: {
      residentKey: 'required';
      userVerification: 'preferred';
    };
  };
}> {
  const resolvedOptions = resolveWebauthnRegistrationOptionsInput(input);
  const options = await generateSimpleWebAuthnRegistrationOptions({
    rpName: 'auth-mini',
    rpID: resolvedOptions.rpId,
    userName: input.email,
    userID: Buffer.from(input.userId, 'utf8'),
    userDisplayName: input.email,
    timeout: 300000,
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'preferred',
    },
    supportedAlgorithmIDs: [-7, -257],
  });

  consumeUnusedRegistrationChallengesForUser(
    db,
    input.userId,
    new Date().toISOString(),
  );
  const expiresAt = new Date(
    Date.now() + TTLS.webauthnChallengeSeconds * 1000,
  ).toISOString();
  const record = createChallenge(db, {
    type: 'register',
    challenge: options.challenge,
    userId: input.userId,
    expiresAt,
    rpId: resolvedOptions.rpId,
    origin: resolvedOptions.origin,
  });

  const response: {
    request_id: string;
    publicKey: {
      challenge: string;
      rp: { name: 'auth-mini'; id: string };
      user: { id: string; name: string; displayName: string };
      pubKeyCredParams: Array<{ type: 'public-key'; alg: -7 | -257 }>;
      timeout: number;
      authenticatorSelection: {
        residentKey: 'required';
        userVerification: 'preferred';
      };
    };
  } = {
    request_id: record.requestId,
    publicKey: {
      challenge: options.challenge,
      rp: {
        name: 'auth-mini',
        id: resolvedOptions.rpId,
      },
      user: {
        id: options.user.id,
        name: input.email,
        displayName: input.email,
      },
      pubKeyCredParams: options.pubKeyCredParams as Array<{
        type: 'public-key';
        alg: -7 | -257;
      }>,
      timeout: 300000,
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
    },
  };

  input.logger?.info(
    {
      event: 'webauthn.register.options.created',
      request_id: record.requestId,
      user_id: input.userId,
    },
    'WebAuthn registration options created',
  );

  return response;
}

export async function verifyRegistration(
  db: DatabaseClient,
  input: {
    userId: string;
    requestId: string;
    credential: RegistrationCredential;
    origin: string;
    logger?: AppLogger;
  },
): Promise<{ ok: true }> {
  try {
    const challenge = getValidChallenge(db, input.requestId, 'register');

    if (challenge.userId !== input.userId) {
      throw new InvalidWebauthnRegistrationError();
    }

    const credential = {
      ...input.credential,
      clientExtensionResults: input.credential.clientExtensionResults ?? {},
    };
    const clientDataOrigin = getClientDataOriginOrThrow(
      credential.response.clientDataJSON,
      new InvalidWebauthnRegistrationError(),
    );

    assertExpectedOrigin({
      requestOrigin: input.origin,
      challengeOrigin: challenge.origin,
      clientDataOrigin,
      invalidError: new InvalidWebauthnRegistrationError(),
    });

    const verification = await verifyRegistrationResponse({
      credential,
      expectedChallenge: challenge.challenge,
      expectedOrigin: [challenge.origin],
      expectedRPID: challenge.rpId,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new InvalidWebauthnRegistrationError();
    }

    const { credential: registrationCredential } =
      verification.registrationInfo;

    const now = new Date().toISOString();

    if (!consumeChallenge(db, challenge.requestId, now)) {
      throw new InvalidWebauthnRegistrationError();
    }

    createCredential(db, {
      userId: input.userId,
      credentialId: registrationCredential.id,
      publicKey: encodeBase64Url(Buffer.from(registrationCredential.publicKey)),
      counter: registrationCredential.counter,
      transports: registrationCredential.transports ?? [],
      rpId: challenge.rpId,
    });
    input.logger?.info(
      {
        event: 'webauthn.register.verify.succeeded',
        request_id: input.requestId,
        user_id: input.userId,
        credential_id: registrationCredential.id,
      },
      'WebAuthn registration verified',
    );
  } catch (error) {
    input.logger?.warn(
      {
        event: 'webauthn.register.verify.failed',
        request_id: input.requestId,
        user_id: input.userId,
      },
      'WebAuthn registration failed',
    );
    if (isSqliteUniqueConstraint(error)) {
      throw new DuplicateCredentialError();
    }

    if (error instanceof InvalidWebauthnRegistrationError) {
      throw error;
    }

    throw error;
  }

  return { ok: true };
}

export async function generateAuthenticationOptions(
  db: DatabaseClient,
  input: { rpId?: string; origin?: string; logger?: AppLogger },
): Promise<{
  request_id: string;
  publicKey: {
    challenge: string;
    rpId: string;
    timeout: number;
    userVerification: 'preferred';
  };
}> {
  const resolvedOptions = resolveWebauthnAuthenticationOptionsInput(input);
  const options = await generateSimpleWebAuthnAuthenticationOptions({
    rpID: resolvedOptions.rpId,
    timeout: 300000,
    userVerification: 'preferred',
  });

  const expiresAt = new Date(
    Date.now() + TTLS.webauthnChallengeSeconds * 1000,
  ).toISOString();
  const record = createChallenge(db, {
    type: 'authenticate',
    challenge: options.challenge,
    userId: null,
    expiresAt,
    rpId: resolvedOptions.rpId,
    origin: resolvedOptions.origin,
  });

  const response: {
    request_id: string;
    publicKey: {
      challenge: string;
      rpId: string;
      timeout: number;
      userVerification: 'preferred';
    };
  } = {
    request_id: record.requestId,
    publicKey: {
      challenge: options.challenge,
      rpId: resolvedOptions.rpId,
      timeout: 300000,
      userVerification: 'preferred',
    },
  };

  input.logger?.info(
    {
      event: 'webauthn.authenticate.options.created',
      request_id: record.requestId,
    },
    'WebAuthn authentication options created',
  );

  return response;
}

export async function verifyAuthentication(
  db: DatabaseClient,
  input: {
    requestId: string;
    credential: AuthenticationCredential;
    origin: string;
    issuer: string;
    logger?: AppLogger;
  },
) {
  try {
    const challenge = getValidChallenge(db, input.requestId, 'authenticate');
    const clientDataOrigin = getClientDataOriginOrThrow(
      input.credential.response.clientDataJSON,
      new InvalidWebauthnAuthenticationError(),
    );

    assertExpectedOrigin({
      requestOrigin: input.origin,
      challengeOrigin: challenge.origin,
      clientDataOrigin,
      invalidError: new InvalidWebauthnAuthenticationError(),
    });

    const storedCredential = getCredentialByCredentialIdAndRpId(
      db,
      input.credential.id,
      challenge.rpId,
    );

    if (!storedCredential) {
      throw new InvalidWebauthnAuthenticationError();
    }

    if (storedCredential.rpId !== challenge.rpId) {
      throw new InvalidWebauthnAuthenticationError();
    }

    const verification = await verifyAuthenticationResponse({
      credential: input.credential,
      expectedChallenge: challenge.challenge,
      expectedOrigin: [challenge.origin],
      expectedRPID: challenge.rpId,
      storedCredential,
    });

    if (!verification.verified) {
      throw new InvalidWebauthnAuthenticationError();
    }

    if (
      !consumeChallengeAndUpdateCredentialCounter(db, {
        requestId: challenge.requestId,
        credentialId: storedCredential.id,
        expectedCounter: storedCredential.counter,
        nextCounter: verification.authenticationInfo.newCounter,
        now: new Date().toISOString(),
      })
    ) {
      throw new InvalidWebauthnAuthenticationError();
    }

    const tokens = await mintSessionTokens(db, {
      userId: storedCredential.userId,
      issuer: input.issuer,
      logger: input.logger,
    });

    input.logger?.info(
      {
        event: 'webauthn.authenticate.verify.succeeded',
        request_id: input.requestId,
        user_id: storedCredential.userId,
        credential_id: storedCredential.credentialId,
        session_id: tokens.session.id,
      },
      'WebAuthn authentication verified',
    );

    return tokens;
  } catch (error) {
    input.logger?.warn(
      {
        event: 'webauthn.authenticate.verify.failed',
        request_id: input.requestId,
        credential_id: input.credential.id,
      },
      'WebAuthn authentication failed',
    );

    if (error instanceof InvalidWebauthnAuthenticationError) {
      throw error;
    }

    throw error;
  }
}

async function verifyRegistrationResponse(input: {
  credential: RegistrationCredential & {
    clientExtensionResults: Record<string, unknown>;
  };
  expectedChallenge: string;
  expectedOrigin: string[];
  expectedRPID: string;
}) {
  try {
    return await verifySimpleWebAuthnRegistrationResponse({
      response: input.credential as Parameters<
        typeof verifySimpleWebAuthnRegistrationResponse
      >[0]['response'],
      expectedChallenge: input.expectedChallenge,
      expectedOrigin: input.expectedOrigin,
      expectedRPID: input.expectedRPID,
      requireUserVerification: false,
    });
  } catch (error) {
    if (!isSimpleWebAuthnValidationError(error)) {
      throw error;
    }

    throw new InvalidWebauthnRegistrationError();
  }
}

async function verifyAuthenticationResponse(input: {
  credential: AuthenticationCredential;
  expectedChallenge: string;
  expectedOrigin: string[];
  expectedRPID: string;
  storedCredential: NonNullable<
    ReturnType<typeof getCredentialByCredentialIdAndRpId>
  >;
}) {
  const response = {
    ...input.credential,
    response: {
      ...input.credential.response,
      userHandle: input.credential.response.userHandle ?? undefined,
    },
    clientExtensionResults: {},
  } as Parameters<
    typeof verifySimpleWebAuthnAuthenticationResponse
  >[0]['response'];
  const credential = {
    id: input.storedCredential.credentialId,
    publicKey: Uint8Array.from(
      decodeBase64Url(input.storedCredential.publicKey),
    ),
    counter: input.storedCredential.counter,
    transports: input.storedCredential.transports as Parameters<
      typeof verifySimpleWebAuthnAuthenticationResponse
    >[0]['credential']['transports'],
  };

  try {
    return await verifySimpleWebAuthnAuthenticationResponse({
      response,
      expectedChallenge: input.expectedChallenge,
      expectedOrigin: input.expectedOrigin,
      expectedRPID: input.expectedRPID,
      credential,
      requireUserVerification: false,
    });
  } catch (error) {
    if (!isSimpleWebAuthnValidationError(error)) {
      throw error;
    }

    throw new InvalidWebauthnAuthenticationError();
  }
}

function isSimpleWebAuthnValidationError(error: unknown): error is Error {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === 'UnexpectedRPIDHash' ||
    error.name === 'InvalidBackupFlags' ||
    SIMPLE_WEBAUTHN_VALIDATION_ERROR_PREFIXES.some((prefix) =>
      error.message.startsWith(prefix),
    )
  );
}

function resolveWebauthnRegistrationOptionsInput(input: {
  rpId?: string;
  origin?: string;
}) {
  try {
    return resolveWebauthnOptionsInput(input);
  } catch {
    throw new InvalidWebauthnRegistrationError();
  }
}

function resolveWebauthnAuthenticationOptionsInput(input: {
  rpId?: string;
  origin?: string;
}) {
  try {
    return resolveWebauthnOptionsInput(input);
  } catch {
    throw new InvalidWebauthnAuthenticationError();
  }
}

function resolveWebauthnOptionsInput(input: {
  rpId?: string;
  origin?: string;
}) {
  const origin = normalizeAllowedOrigin(input.origin ?? 'https://example.com');
  const originHostname = new URL(origin).hostname;
  const rpId = normalizeRpId(input.rpId ?? originHostname);

  if (!isRpIdAllowedForOrigin(originHostname, rpId)) {
    throw new Error('invalid_rp_id');
  }

  return {
    origin,
    rpId,
  };
}

function normalizeRpId(input: string): string {
  const trimmed = input.trim().toLowerCase().replace(/\.+$/, '');

  if (!trimmed) {
    throw new Error('invalid_rp_id');
  }

  const hostname = new URL(`https://${trimmed}`).hostname
    .toLowerCase()
    .replace(/\.+$/, '');

  if (hostname !== trimmed) {
    throw new Error('invalid_rp_id');
  }

  return hostname;
}

function isRpIdAllowedForOrigin(originHostname: string, rpId: string): boolean {
  if (originHostname === rpId) {
    return true;
  }

  if (
    isIpAddress(originHostname) ||
    isIpAddress(rpId) ||
    originHostname === 'localhost' ||
    rpId === 'localhost'
  ) {
    return false;
  }

  return originHostname.endsWith(`.${rpId}`);
}

function isIpAddress(value: string): boolean {
  return value.includes(':') || /^\d+(?:\.\d+){3}$/.test(value);
}

function getClientDataOriginOrThrow(
  clientDataJSON: string,
  invalidError:
    | InvalidWebauthnRegistrationError
    | InvalidWebauthnAuthenticationError,
): string {
  let parsed: unknown;

  try {
    parsed = JSON.parse(decodeBase64Url(clientDataJSON).toString('utf8'));
  } catch {
    throw invalidError;
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof (parsed as { origin?: unknown }).origin !== 'string'
  ) {
    throw invalidError;
  }

  try {
    return normalizeAllowedOrigin((parsed as { origin: string }).origin);
  } catch {
    throw invalidError;
  }
}

function assertExpectedOrigin(input: {
  requestOrigin: string;
  challengeOrigin: string;
  clientDataOrigin: string;
  invalidError:
    | InvalidWebauthnRegistrationError
    | InvalidWebauthnAuthenticationError;
}) {
  const requestOrigin = normalizeAllowedOrigin(input.requestOrigin);

  if (
    requestOrigin !== input.challengeOrigin ||
    input.clientDataOrigin !== input.challengeOrigin
  ) {
    throw input.invalidError;
  }
}

const SIMPLE_WEBAUTHN_VALIDATION_ERROR_PREFIXES = [
  'Missing credential ID',
  'Credential ID was not base64url-encoded',
  'Credential missing response',
  'Credential response ',
  'Unexpected credential type',
  'Unexpected registration response',
  'Unexpected authentication response',
  'Unexpected tokenBinding',
  'Unexpected value for TokenBinding',
  'Custom challenge verifier returned false',
  'User not present during authentication',
  'User presence was required, but user was not present',
  'User verification required, but user could not be verified',
  'User verification was required, but user could not be verified',
  'No credential ID was provided by authenticator',
  'No public key was provided by authenticator',
  'No AAGUID was present during registration',
  'Credential public key was missing numeric alg',
  'Unexpected public key alg',
] as const;

export function deleteCredential(
  db: DatabaseClient,
  input: { credentialId: string; userId: string },
): { ok: true } {
  if (!deleteCredentialById(db, input.credentialId, input.userId)) {
    throw new WebauthnCredentialNotFoundError();
  }

  return { ok: true };
}

function getValidChallenge(
  db: DatabaseClient,
  requestId: string,
  type: 'register' | 'authenticate',
) {
  const challenge = getChallengeByRequestId(db, requestId);
  const now = new Date().toISOString();

  if (
    !challenge ||
    challenge.type !== type ||
    challenge.consumedAt ||
    challenge.expiresAt <= now
  ) {
    if (type === 'register') {
      throw new InvalidWebauthnRegistrationError();
    }

    throw new InvalidWebauthnAuthenticationError();
  }

  return challenge;
}

function isSqliteUniqueConstraint(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes(
      'UNIQUE constraint failed: webauthn_credentials.credential_id',
    )
  );
}
