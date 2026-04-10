import { createPrivateKey, sign } from 'node:crypto';
import { encodeBase64Url } from '../../src/shared/crypto.js';

const FIXTURES = {
  default: {
    publicKey: 'jt2HpVJxALeSteTe7QlqBRiOxVeloHMMImehYhZc9Rg',
    privateJwk: {
      crv: 'Ed25519',
      d: '7rANewlCLceTsUo9feN0DLjnu-ayYsdhkVWvHT4FelM',
      x: 'jt2HpVJxALeSteTe7QlqBRiOxVeloHMMImehYhZc9Rg',
      kty: 'OKP',
    },
  },
  alternate: {
    publicKey: 'SRCRzoCPb2EoiIhZLDATWYHeo9xPYiZh6rkoDfocHuY',
    privateJwk: {
      crv: 'Ed25519',
      d: 'vM_36GgPQ57cHRKv_KM9r4JnejllPus0jPuupS-tJak',
      x: 'SRCRzoCPb2EoiIhZLDATWYHeo9xPYiZh6rkoDfocHuY',
      kty: 'OKP',
    },
  },
} as const;

export function createTestEd25519Keypair(seed: string) {
  const fixture = seed === 'alternate' ? FIXTURES.alternate : FIXTURES.default;
  const privateKey = createPrivateKey({
    format: 'jwk',
    key: fixture.privateJwk,
  });

  return {
    publicKey: fixture.publicKey,
    signChallenge(challenge: string) {
      return encodeBase64Url(
        sign(null, Buffer.from(challenge, 'utf8'), privateKey),
      );
    },
  };
}
