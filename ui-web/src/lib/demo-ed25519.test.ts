import { describe, expect, it } from 'vitest';
import {
  deriveEd25519PublicKey,
  generateDemoEd25519Keypair,
  parseEd25519PrivateKey,
  validateEd25519PrivateKey,
  validateSolanaPublicKey,
} from './demo-ed25519';

describe('demo-ed25519', () => {
  it('generates a Solana-compatible base58 private key containing its public key', async () => {
    const keypair = await generateDemoEd25519Keypair();
    expect(validateSolanaPublicKey(keypair.publicKey)).toBe('');
    expect(validateEd25519PrivateKey(keypair.privateKey)).toBe('');
    await expect(deriveEd25519PublicKey(keypair.privateKey)).resolves.toBe(
      keypair.publicKey,
    );
  });

  it('rejects extended private keys whose public-key suffix does not match the seed', async () => {
    const keypair = await generateDemoEd25519Keypair();
    const last = keypair.privateKey.at(-1)!;
    const tampered =
      keypair.privateKey.slice(0, -1) + (last === '1' ? '2' : '1');
    await expect(parseEd25519PrivateKey(tampered)).rejects.toThrow(
      /Solana-compatible private key/,
    );
  });

  it('accepts a legacy base64url 32-byte seed only as a compatibility input', async () => {
    await expect(
      deriveEd25519PublicKey('7rANewlCLceTsUo9feN0DLjnu-ayYsdhkVWvHT4FelM'),
    ).resolves.toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/);
  });
});
