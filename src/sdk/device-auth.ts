import { createPrivateKey, sign } from 'node:crypto';
import { encodeBase64Url } from '../shared/crypto.js';
import type { HttpClient } from './http.js';
import type { DevicePrivateKeyJwk } from './types.js';

type DeviceAuthSession = {
  acceptSessionResponse(response: unknown): Promise<unknown>;
};

export async function authenticateDevice(input: {
  credentialId: string;
  http: HttpClient;
  privateKey: DevicePrivateKeyJwk;
  session: DeviceAuthSession;
}): Promise<void> {
  const start = await input.http.postJson<{
    request_id: string;
    challenge: string;
  }>('/ed25519/start', {
    credential_id: input.credentialId,
  });

  const signature = encodeBase64Url(
    sign(
      null,
      Buffer.from(start.challenge, 'utf8'),
      createPrivateKey({
        format: 'jwk',
        key: input.privateKey,
      }),
    ),
  );

  const response = await input.http.postJson('/ed25519/verify', {
    request_id: start.request_id,
    signature,
  });

  await input.session.acceptSessionResponse(response);
}
