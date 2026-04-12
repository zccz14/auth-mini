import { createPrivateKey, sign, type KeyObject } from 'node:crypto';
import { encodeBase64Url } from '../shared/crypto.js';
import { createSdkError } from './errors.js';
import type { HttpClient } from './http.js';

const DEVICE_SEED_ERROR =
  'privateKeySeed must be a base64url-encoded 32-byte string';
const ED25519_PKCS8_SEED_PREFIX = Buffer.from(
  '302e020100300506032b657004220420',
  'hex',
);

type DeviceAuthSession = {
  acceptSessionResponse(response: unknown): Promise<unknown>;
};

export function deriveDevicePrivateKey(privateKeySeed: string): KeyObject {
  if (typeof privateKeySeed !== 'string') {
    throw createSdkError('sdk_init_failed', DEVICE_SEED_ERROR);
  }

  if (!/^[A-Za-z0-9_-]+$/.test(privateKeySeed)) {
    throw createSdkError('sdk_init_failed', DEVICE_SEED_ERROR);
  }

  const seed = Buffer.from(privateKeySeed, 'base64url');

  if (seed.length !== 32) {
    throw createSdkError('sdk_init_failed', DEVICE_SEED_ERROR);
  }

  return createPrivateKey({
    format: 'der',
    type: 'pkcs8',
    key: Buffer.concat([ED25519_PKCS8_SEED_PREFIX, seed]),
  });
}

export async function authenticateDevice(input: {
  credentialId: string;
  http: HttpClient;
  privateKey: KeyObject;
  session: DeviceAuthSession;
}): Promise<void> {
  const start = await input.http.postJson<{
    request_id: string;
    challenge: string;
  }>('/ed25519/start', {
    credential_id: input.credentialId,
  });

  const signature = encodeBase64Url(
    sign(null, Buffer.from(start.challenge, 'utf8'), input.privateKey),
  );

  const response = await input.http.postJson('/ed25519/verify', {
    request_id: start.request_id,
    signature,
  });

  await input.session.acceptSessionResponse(response);
}
