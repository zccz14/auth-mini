import {
  createPrivateKey,
  createPublicKey,
  sign,
  type KeyObject,
} from 'node:crypto';
import { encodeBase64Url } from '../shared/crypto.js';
import { createSdkError } from './errors.js';
import type { HttpClient } from './http.js';

const DEVICE_SEED_ERROR =
  'privateKeySeed must be a base64url-encoded 32-byte string';
const ED25519_PKCS8_SEED_PREFIX = Buffer.from(
  '302e020100300506032b657004220420',
  'hex',
);
const ED25519_SPKI_PUBLIC_KEY_PREFIX = Buffer.from(
  '302a300506032b6570032100',
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

  if (seed.length !== 32 || encodeBase64Url(seed) !== privateKeySeed) {
    throw createSdkError('sdk_init_failed', DEVICE_SEED_ERROR);
  }

  return createPrivateKey({
    format: 'der',
    type: 'pkcs8',
    key: Buffer.concat([ED25519_PKCS8_SEED_PREFIX, seed]),
  });
}

export function deriveDevicePublicKey(privateKey: KeyObject): string {
  const spki = createPublicKey(privateKey).export({
    format: 'der',
    type: 'spki',
  });
  return encodeBase64Url(spki.subarray(ED25519_SPKI_PUBLIC_KEY_PREFIX.length));
}

export async function authenticateDevice(input: {
  http: HttpClient;
  privateKey: KeyObject;
  session: DeviceAuthSession;
}): Promise<void> {
  const publicKey = deriveDevicePublicKey(input.privateKey);
  const start = await input.http.postJson<{
    request_id: string;
    challenge: string;
  }>('/ed25519/start', {
    public_key: publicKey,
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
