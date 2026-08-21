import {
  createPrivateKey,
  createPublicKey,
  sign,
  type KeyObject,
} from 'node:crypto';
import { encodeBase64Url } from '../shared/crypto.js';
import { createSdkError } from './errors.js';
import type { HttpClient } from './http.js';

const SOLANA_PRIVATE_KEY_ERROR =
  'privateKey must be a canonical base58-encoded 64-byte Solana-compatible private key';
const LEGACY_DEVICE_SEED_ERROR =
  'privateKeySeed must be a base64url-encoded 32-byte string';
const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const ED25519_PKCS8_SEED_PREFIX = Buffer.from(
  '302e020100300506032b657004220420',
  'hex',
);
const ED25519_SPKI_PUBLIC_KEY_PREFIX = Buffer.from(
  '302a300506032b6570032100',
  'hex',
);

function encodeBase58(bytes: Buffer): string {
  if (bytes.length === 0) return '';
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let index = 0; index < digits.length; index += 1) {
      carry += digits[index] << 8;
      digits[index] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let output = '';
  for (const byte of bytes) {
    if (byte !== 0) break;
    output += '1';
  }
  if (bytes.some((byte) => byte !== 0)) {
    for (let index = digits.length - 1; index >= 0; index -= 1) {
      output += BASE58_ALPHABET[digits[index]];
    }
  }
  return output;
}

function decodeCanonicalBase58(
  value: string,
  expectedLength: number,
): Buffer | null {
  if (value === '') return null;
  const bytes = [0];
  for (const character of value) {
    const digit = BASE58_ALPHABET.indexOf(character);
    if (digit < 0) return null;
    let carry = digit;
    for (let index = 0; index < bytes.length; index += 1) {
      carry += bytes[index] * 58;
      bytes[index] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  let leading = 0;
  while (leading < value.length - 1 && value[leading] === '1') leading += 1;
  const decoded = Buffer.alloc(leading + bytes.length);
  for (let index = 0; index < bytes.length; index += 1)
    decoded[decoded.length - 1 - index] = bytes[index];
  return decoded.length === expectedLength && encodeBase58(decoded) === value
    ? decoded
    : null;
}

type DeviceAuthSession = {
  acceptSessionResponse(response: unknown): Promise<unknown>;
};

export function deriveDevicePrivateKey(privateKey: string): KeyObject {
  if (typeof privateKey !== 'string') {
    throw createSdkError('sdk_init_failed', SOLANA_PRIVATE_KEY_ERROR);
  }
  const extended = decodeCanonicalBase58(privateKey, 64);
  if (!extended) {
    // COMPATIBILITY: accept the legacy base64url seed for direct callers of
    // deriveDevicePrivateKey while createDeviceSdk keeps the legacy option explicit.
    return deriveLegacyDevicePrivateKey(privateKey);
  }
  const key = createPrivateKey({
    format: 'der',
    type: 'pkcs8',
    key: Buffer.concat([ED25519_PKCS8_SEED_PREFIX, extended.subarray(0, 32)]),
  });
  const publicKey = createPublicKey(key).export({
    format: 'der',
    type: 'spki',
  }) as Buffer;
  if (
    !publicKey
      .subarray(ED25519_SPKI_PUBLIC_KEY_PREFIX.length)
      .equals(extended.subarray(32))
  ) {
    throw createSdkError('sdk_init_failed', SOLANA_PRIVATE_KEY_ERROR);
  }
  return key;
}

export function deriveLegacyDevicePrivateKey(
  privateKeySeed: string,
): KeyObject {
  if (
    typeof privateKeySeed !== 'string' ||
    !/^[A-Za-z0-9_-]+$/.test(privateKeySeed)
  ) {
    throw createSdkError('sdk_init_failed', LEGACY_DEVICE_SEED_ERROR);
  }
  const seed = Buffer.from(privateKeySeed, 'base64url');
  if (seed.length !== 32 || encodeBase64Url(seed) !== privateKeySeed) {
    throw createSdkError('sdk_init_failed', LEGACY_DEVICE_SEED_ERROR);
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
  return encodeBase58(spki.subarray(ED25519_SPKI_PUBLIC_KEY_PREFIX.length));
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
