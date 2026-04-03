import { describe, expect, it } from 'vitest';
import { getDemoSetupState } from '../../demo/setup.js';

describe('demo WebAuthn setup guidance', () => {
  it('derives the auth server origin recommendation from window.location.origin', () => {
    expect(
      getDemoSetupState({
        origin: 'http://localhost:8080',
        protocol: 'http:',
        hostname: 'localhost',
      }),
    ).toEqual(
      expect.objectContaining({
        currentOrigin: 'http://localhost:8080',
        suggestedOrigin: 'http://localhost:8080',
        corsWarning:
          'Start mini-auth with --origin set to this page origin so the browser can call the auth server cross-origin.',
      }),
    );
  });

  it('includes the resolved auth server origin as issuer in the startup command', () => {
    expect(
      getDemoSetupState({
        origin: 'http://localhost:8080',
        protocol: 'http:',
        hostname: 'localhost',
        sdkUrl: 'http://127.0.0.1:7777/sdk/singleton-iife.js',
      }),
    ).toEqual(
      expect.objectContaining({
        startupCommand:
          'mini-auth start ./mini-auth.sqlite --issuer http://127.0.0.1:7777 --origin http://localhost:8080 --rp-id localhost',
      }),
    );
  });

  it('falls back to a placeholder issuer when sdk url derivation fails', () => {
    expect(
      getDemoSetupState({
        origin: 'http://localhost:8080',
        protocol: 'http:',
        hostname: 'localhost',
        sdkUrl: 'not-a-valid-url',
      }),
    ).toEqual(
      expect.objectContaining({
        startupCommand:
          'mini-auth start ./mini-auth.sqlite --issuer <auth-server-origin> --origin http://localhost:8080 --rp-id localhost',
      }),
    );
  });

  it('does not return a proxy command anymore', () => {
    expect(
      getDemoSetupState({
        origin: 'http://localhost:8080',
        protocol: 'http:',
        hostname: 'localhost',
      }),
    ).not.toHaveProperty('proxyCommand');
  });

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
        suggestedOrigin: 'http://127.0.0.1:8080',
        suggestedRpId: 'localhost',
        corsWarning:
          'Start mini-auth with --origin set to this page origin so the browser can call the auth server cross-origin.',
        passkeyWarning:
          'This demo is running on an IP address. Passkeys require a domain RP ID, so open the demo on localhost or an HTTPS domain instead.',
      }),
    );
  });

  it('rejects https ipv4 hosts for passkey setup and falls back to localhost guidance', () => {
    expect(
      getDemoSetupState({
        origin: 'https://127.0.0.1:8443',
        protocol: 'https:',
        hostname: '127.0.0.1',
      }),
    ).toEqual(
      expect.objectContaining({
        webauthnReady: false,
        suggestedOrigin: 'https://127.0.0.1:8443',
        suggestedRpId: 'localhost',
        passkeyWarning:
          'This demo is running on an IP address. Passkeys require a domain RP ID, so open the demo on localhost or an HTTPS domain instead.',
      }),
    );
  });

  it('rejects bracketed https ipv6 hosts for passkey setup and falls back to localhost guidance', () => {
    expect(
      getDemoSetupState({
        origin: 'https://[::1]:8443',
        protocol: 'https:',
        hostname: '[::1]',
      }),
    ).toEqual(
      expect.objectContaining({
        webauthnReady: false,
        suggestedOrigin: 'https://[::1]:8443',
        suggestedRpId: 'localhost',
        passkeyWarning:
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
        passkeyWarning: '',
      }),
    );
  });
});
