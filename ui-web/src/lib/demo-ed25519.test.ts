import { describe, expect, it } from 'vitest';
import {
  decodeBase64Url32,
  deriveEd25519PublicKey,
  signEd25519Challenge,
} from './demo-ed25519';

describe('demo-ed25519', () => {
  it('decodes a 32-byte base64url seed', () => {
    const bytes = decodeBase64Url32(
      '7rANewlCLceTsUo9feN0DLjnu-ayYsdhkVWvHT4FelM',
    );

    expect(bytes).toHaveLength(32);
  });

  it('rejects non-base64url or wrong-length input', () => {
    expect(() => decodeBase64Url32('not-base64url!')).toThrow(
      'Expected base64url-encoded 32-byte value',
    );
    expect(() => decodeBase64Url32('abcd')).toThrow(
      'Expected base64url-encoded 32-byte value',
    );
  });

  it('derives the expected public key for the known fixture seed', async () => {
    await expect(
      deriveEd25519PublicKey('7rANewlCLceTsUo9feN0DLjnu-ayYsdhkVWvHT4FelM'),
    ).resolves.toBe('jt2HpVJxALeSteTe7QlqBRiOxVeloHMMImehYhZc9Rg');
  });

  it('signs the challenge bytes with the fixture seed', async () => {
    await expect(
      signEd25519Challenge(
        '7rANewlCLceTsUo9feN0DLjnu-ayYsdhkVWvHT4FelM',
        'challenge-value',
      ),
    ).resolves.toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
