import {
  createEd25519Credential,
  createWebauthnAuthenticationOptions,
  createWebauthnRegistrationOptions,
  deleteEd25519Credential,
  deleteWebauthnCredential,
  getCurrentUser,
  listEd25519Credentials,
  listJwks,
  logoutCurrentSession,
  logoutPeerSession,
  refreshSession,
  startEd25519Authentication,
  startEmailAuth,
  updateEd25519Credential,
  verifyEd25519Authentication,
  verifyEmailAuth,
  verifyWebauthnAuthentication,
  verifyWebauthnRegistration,
} from '../generated/api/index.js';
import { createClient } from '../generated/api/client/index.js';
import type { Config as GeneratedApiClientConfig } from '../generated/api/client/index.js';
import { createSdkError } from './errors.js';

export type * from '../generated/api/index.js';
export type { Auth } from '../generated/api/client/index.js';

export type CreateApiSdkOptions = {
  baseUrl: string;
  fetch?: typeof fetch;
  auth?: GeneratedApiClientConfig['auth'];
};

export function createApiSdk(options: CreateApiSdkOptions) {
  if (!options.baseUrl) {
    throw createSdkError('sdk_init_failed', 'Missing API base URL');
  }

  const client = createClient({
    auth: options.auth,
    baseUrl: options.baseUrl,
    fetch: options.fetch,
  });

  return {
    email: {
      start: (request: Parameters<typeof startEmailAuth>[0]) =>
        startEmailAuth({ ...request, client }),
      verify: (request: Parameters<typeof verifyEmailAuth>[0]) =>
        verifyEmailAuth({ ...request, client }),
    },
    me: {
      get: (request?: Parameters<typeof getCurrentUser>[0]) =>
        getCurrentUser({ ...(request ?? {}), client }),
    },
    session: {
      refresh: (request: Parameters<typeof refreshSession>[0]) =>
        refreshSession({ ...request, client }),
      logoutCurrent: (request?: Parameters<typeof logoutCurrentSession>[0]) =>
        logoutCurrentSession({ ...(request ?? {}), client }),
      logoutPeer: (request: Parameters<typeof logoutPeerSession>[0]) =>
        logoutPeerSession({ ...request, client }),
    },
    ed25519: {
      startAuthentication: (
        request: Parameters<typeof startEd25519Authentication>[0],
      ) => startEd25519Authentication({ ...request, client }),
      verifyAuthentication: (
        request: Parameters<typeof verifyEd25519Authentication>[0],
      ) => verifyEd25519Authentication({ ...request, client }),
      listCredentials: (
        request?: Parameters<typeof listEd25519Credentials>[0],
      ) => listEd25519Credentials({ ...(request ?? {}), client }),
      createCredential: (
        request: Parameters<typeof createEd25519Credential>[0],
      ) => createEd25519Credential({ ...request, client }),
      deleteCredential: (
        request: Parameters<typeof deleteEd25519Credential>[0],
      ) => deleteEd25519Credential({ ...request, client }),
      updateCredential: (
        request: Parameters<typeof updateEd25519Credential>[0],
      ) => updateEd25519Credential({ ...request, client }),
    },
    webauthn: {
      createRegistrationOptions: (
        request: Parameters<typeof createWebauthnRegistrationOptions>[0],
      ) => createWebauthnRegistrationOptions({ ...request, client }),
      verifyRegistration: (
        request: Parameters<typeof verifyWebauthnRegistration>[0],
      ) => verifyWebauthnRegistration({ ...request, client }),
      createAuthenticationOptions: (
        request: Parameters<typeof createWebauthnAuthenticationOptions>[0],
      ) => createWebauthnAuthenticationOptions({ ...request, client }),
      verifyAuthentication: (
        request: Parameters<typeof verifyWebauthnAuthentication>[0],
      ) => verifyWebauthnAuthentication({ ...request, client }),
      deleteCredential: (
        request: Parameters<typeof deleteWebauthnCredential>[0],
      ) => deleteWebauthnCredential({ ...request, client }),
    },
    jwks: {
      list: (request?: Parameters<typeof listJwks>[0]) =>
        listJwks({ ...(request ?? {}), client }),
    },
  };
}

export type ApiSdk = ReturnType<typeof createApiSdk>;
