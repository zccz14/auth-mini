import { describe, expect, it } from 'vitest';
import { getDemoSetupState } from '../../demo/setup.js';

describe('demo WebAuthn setup guidance', () => {
  it('rejects IP-address hosts for passkey setup', () => {
    expect(
      getDemoSetupState({
        origin: 'http://127.0.0.1:8080',
        protocol: 'http:',
        hostname: '127.0.0.1',
      }),
    ).toEqual(
      expect.objectContaining({
        webauthnReady: false,
        suggestedOrigin: 'http://localhost:8080',
        suggestedRpId: 'localhost',
        warning:
          'This demo is running on an IP address. Passkeys require a domain RP ID, so open the demo on localhost or an HTTPS domain instead.',
      }),
    );
  });

  it('accepts localhost for local passkey testing', () => {
    expect(
      getDemoSetupState({
        origin: 'http://localhost:8080',
        protocol: 'http:',
        hostname: 'localhost',
      }),
    ).toEqual(
      expect.objectContaining({
        webauthnReady: true,
        suggestedOrigin: 'http://localhost:8080',
        suggestedRpId: 'localhost',
        warning: '',
      }),
    );
  });
});
