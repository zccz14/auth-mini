import * as ed from '@noble/ed25519';

const BASE64URL_32_ERROR = 'Expected base64url-encoded 32-byte value';

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

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function decodeBase64Url32(value: string): Uint8Array {
  const normalized = value.trim();

  if (!/^[A-Za-z0-9_-]+$/.test(normalized)) {
    throw new Error(BASE64URL_32_ERROR);
  }

  try {
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(raw, (char) => char.charCodeAt(0));

    if (bytes.length !== 32) {
      throw new Error(BASE64URL_32_ERROR);
    }

    return bytes;
  } catch {
    throw new Error(BASE64URL_32_ERROR);
  }
}

export function validateBase64Url32(value: string): string {
  if (value.trim() === '') {
    return BASE64URL_32_ERROR;
  }

  try {
    decodeBase64Url32(value);
    return '';
  } catch (cause) {
    return cause instanceof Error ? cause.message : BASE64URL_32_ERROR;
  }
}

export async function deriveEd25519PublicKey(seed: string): Promise<string> {
  const publicKey = await ed.getPublicKeyAsync(decodeBase64Url32(seed));
  return encodeBase64Url(publicKey);
}

export async function signEd25519Challenge(
  seed: string,
  challenge: string,
): Promise<string> {
  const signature = await ed.signAsync(
    new TextEncoder().encode(challenge),
    decodeBase64Url32(seed),
  );

  return encodeBase64Url(signature);
}

export async function generateDemoEd25519Keypair(): Promise<{
  seed: string;
  publicKey: string;
}> {
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const publicKey = await ed.getPublicKeyAsync(seed);

  return {
    seed: encodeBase64Url(seed),
    publicKey: encodeBase64Url(publicKey),
  };
}
