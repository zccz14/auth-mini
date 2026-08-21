import * as ed from '@noble/ed25519';

const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_32_ERROR = 'Expected canonical base58-encoded 32-byte public key';
const SOLANA_PRIVATE_KEY_ERROR =
  'Expected canonical base58-encoded 64-byte Solana-compatible private key';
const LEGACY_SEED_ERROR =
  'Expected base64url-encoded 32-byte legacy private key seed';

// Use an explicit browser digest bridge so jsdom/browser environments hand
// @noble/ed25519 a compatible BufferSource for async hashing.
ed.hashes.sha512Async = async (message) => {
  const digest = await crypto.subtle.digest(
    'SHA-512',
    Uint8Array.from(message),
  );
  return new Uint8Array(digest);
};

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeBase64Url32(value: string): Uint8Array {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9_-]+$/.test(normalized)) throw new Error(LEGACY_SEED_ERROR);
  try {
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(raw, (char) => char.charCodeAt(0));
    if (bytes.length !== 32 || encodeBase64Url(bytes) !== normalized)
      throw new Error(LEGACY_SEED_ERROR);
    return bytes;
  } catch {
    throw new Error(LEGACY_SEED_ERROR);
  }
}

export function encodeBase58(bytes: Uint8Array): string {
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

export function decodeCanonicalBase58(
  value: string,
  expectedLength: number,
  error: string,
): Uint8Array {
  const normalized = value.trim();
  if (normalized === '') throw new Error(error);
  const bytes = [0];
  for (const character of normalized) {
    const digit = BASE58_ALPHABET.indexOf(character);
    if (digit < 0) throw new Error(error);
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
  while (leading < normalized.length - 1 && normalized[leading] === '1')
    leading += 1;
  const decoded = new Uint8Array(leading + bytes.length);
  for (let index = 0; index < bytes.length; index += 1)
    decoded[decoded.length - 1 - index] = bytes[index];
  if (decoded.length !== expectedLength || encodeBase58(decoded) !== normalized)
    throw new Error(error);
  return decoded;
}

export function validateSolanaPublicKey(value: string): string {
  try {
    decodeCanonicalBase58(value, 32, BASE58_32_ERROR);
    return '';
  } catch (cause) {
    return cause instanceof Error ? cause.message : BASE58_32_ERROR;
  }
}

export async function parseEd25519PrivateKey(
  value: string,
): Promise<Uint8Array> {
  let secretKey: Uint8Array | null = null;
  try {
    secretKey = decodeCanonicalBase58(value, 64, SOLANA_PRIVATE_KEY_ERROR);
  } catch {
    // COMPATIBILITY: Auth Mini <=0.4.5 generated base64url 32-byte seeds.
    // Keep this login-only input path until published device clients using privateKeySeed
    // are no longer supported; new generation and docs use Solana-compatible base58 keys.
    return decodeBase64Url32(value);
  }
  const derivedPublicKey = await ed.getPublicKeyAsync(secretKey.slice(0, 32));
  if (
    !secretKey
      .slice(32)
      .every((byte, index) => byte === derivedPublicKey[index])
  ) {
    throw new Error(SOLANA_PRIVATE_KEY_ERROR);
  }
  return secretKey.slice(0, 32);
}

export function validateEd25519PrivateKey(value: string): string {
  try {
    decodeCanonicalBase58(value, 64, SOLANA_PRIVATE_KEY_ERROR);
    return '';
  } catch {
    try {
      decodeBase64Url32(value);
      return '';
    } catch (cause) {
      return cause instanceof Error ? cause.message : SOLANA_PRIVATE_KEY_ERROR;
    }
  }
}

export async function deriveEd25519PublicKey(
  privateKey: string,
): Promise<string> {
  return encodeBase58(
    await ed.getPublicKeyAsync(await parseEd25519PrivateKey(privateKey)),
  );
}

export async function signEd25519Challenge(
  privateKey: string,
  challenge: string,
): Promise<string> {
  const signature = await ed.signAsync(
    new TextEncoder().encode(challenge),
    await parseEd25519PrivateKey(privateKey),
  );
  return encodeBase64Url(signature);
}

export async function generateDemoEd25519Keypair(): Promise<{
  privateKey: string;
  publicKey: string;
}> {
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const publicKey = await ed.getPublicKeyAsync(seed);
  const secretKey = new Uint8Array(64);
  secretKey.set(seed);
  secretKey.set(publicKey, 32);
  return {
    privateKey: encodeBase58(secretKey),
    publicKey: encodeBase58(publicKey),
  };
}
