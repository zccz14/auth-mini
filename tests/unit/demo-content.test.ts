import { describe, expect, it } from 'vitest';
import { buildDemoContent } from '../../demo/content.js';

const sampleState = {
  currentOrigin: 'https://docs.example.com',
  sdkOrigin: 'https://auth.zccz14.com',
  issuer: 'https://auth.zccz14.com',
  jwksUrl: 'https://auth.zccz14.com/jwks',
  suggestedOrigin: 'https://docs.example.com',
  startupCommand:
    'npx auth-mini origin add ./auth-mini.sqlite --value https://docs.example.com\n' +
    'npx auth-mini start ./auth-mini.sqlite --issuer https://auth.zccz14.com\n' +
    'npx auth-mini smtp add ./auth-mini.sqlite --host smtp.example.com --port 587 --username mailer --password secret --from-email noreply@example.com',
};

describe('demo content builders', () => {
  it('builds browser sdk and jose snippets from the shared setup state', () => {
    const content = buildDemoContent(sampleState);

    expect(content.sdkModuleSnippet).toContain(
      "import { createBrowserSdk } from 'auth-mini/sdk/browser';",
    );
    expect(content.sdkModuleSnippet).toContain(
      "const AuthMini = createBrowserSdk('https://auth.zccz14.com');",
    );
    expect(content.joseSnippet).toContain("new URL('/jwks', issuer)");
    expect(content.joseSnippet).toContain(
      "const issuer = 'https://auth.zccz14.com'",
    );
    expect(content.startupCommand).toContain(
      'npx auth-mini smtp add ./auth-mini.sqlite --host smtp.example.com --port 587 --username mailer --password secret --from-email noreply@example.com',
    );
  });

  it('uses the default auth origin example when sdk-origin is unresolved', () => {
    const content = buildDemoContent({
      ...sampleState,
      sdkOrigin: '',
      issuer: '',
      jwksUrl: '',
    });

    expect(content.joseSnippet).toContain(
      "const issuer = 'https://auth.zccz14.com'",
    );
    expect(content.apiReference[0]?.request).toContain(
      'https://auth.zccz14.com/email/start',
    );
  });

  it('lists the required api reference endpoints', () => {
    const content = buildDemoContent(sampleState);

    const required = [
      'POST /email/start',
      'POST /email/verify',
      'POST /session/refresh',
      'GET /me',
      'POST /session/logout',
      'POST /webauthn/register/options',
      'POST /webauthn/register/verify',
      'POST /webauthn/authenticate/options',
      'POST /webauthn/authenticate/verify',
      'DELETE /webauthn/credentials/cred_123',
      'GET /jwks',
    ];

    for (const key of required) {
      const entry = content.apiReference.find(
        (candidate) => `${candidate.method} ${candidate.path}` === key,
      );

      expect(entry).toEqual(
        expect.objectContaining({
          when: expect.any(String),
          request: expect.any(String),
          response: expect.any(String),
          detailsLabel: expect.any(String),
        }),
      );
    }
  });

  it('updates api example base urls when sdk-origin changes', () => {
    const content = buildDemoContent({
      ...sampleState,
      sdkOrigin: 'https://staging-auth.example.com',
      issuer: 'https://staging-auth.example.com',
      jwksUrl: 'https://staging-auth.example.com/jwks',
    });

    for (const entry of content.apiReference) {
      expect(entry.request).toContain('https://staging-auth.example.com');
    }
  });

  it('includes github pages and custom domain deployment notes', () => {
    const content = buildDemoContent(sampleState);
    const deploymentText = content.deploymentNotes.join('\n');

    expect(deploymentText).toContain('GitHub Pages');
    expect(deploymentText).toContain(
      'publish demo/ together with dist/sdk/browser.js and keep the page import map',
    );
    expect(deploymentText).toContain('auth-mini/sdk/browser');
    expect(deploymentText).toContain('../dist/sdk/browser.js');
    expect(deploymentText).toContain('CNAME');
    expect(deploymentText).toContain('origin add');
    expect(deploymentText).toContain('?sdk-origin=https://your-auth-origin');
  });

  it('keeps api examples aligned with the server auth contracts', () => {
    const content = buildDemoContent(sampleState);
    const byPath = new Map(
      content.apiReference.map((entry) => [entry.path, entry]),
    );

    expect(byPath.get('/me')?.request).toContain('authorization');
    expect(byPath.get('/me')?.response).toContain('user_id');
    expect(byPath.get('/me')?.response).toContain('webauthn_credentials');
    expect(byPath.get('/me')?.response).toContain('active_sessions');
    expect(byPath.get('/email/verify')?.response).toContain('access_token');
    expect(byPath.get('/email/verify')?.response).toContain('refresh_token');
    expect(byPath.get('/session/refresh')?.request).toContain('refresh_token');
    expect(byPath.get('/session/logout')?.request).toContain('authorization');
    expect(byPath.get('/session/logout')?.request).not.toContain(
      'refreshToken',
    );
    expect(byPath.get('/webauthn/register/options')?.request).toContain(
      'authorization',
    );
    expect(byPath.get('/webauthn/register/options')?.request).toContain(
      'rp_id',
    );
    expect(byPath.get('/webauthn/register/options')?.request).not.toContain(
      'user@example.com',
    );
    expect(byPath.get('/webauthn/register/options')?.response).toContain(
      'request_id',
    );
    expect(byPath.get('/webauthn/register/options')?.response).toContain(
      '"id": "example.com"',
    );
    expect(byPath.get('/webauthn/register/options')?.response).toContain(
      'publicKey',
    );
    expect(byPath.get('/webauthn/register/options')?.response).toContain(
      'authenticatorSelection',
    );
    expect(byPath.get('/webauthn/register/verify')?.request).toContain(
      'request_id',
    );
    expect(byPath.get('/webauthn/register/verify')?.request).toContain(
      'authorization',
    );
    expect(byPath.get('/webauthn/register/verify')?.request).toContain(
      'credential',
    );
    expect(byPath.get('/webauthn/authenticate/options')?.response).toContain(
      'request_id',
    );
    expect(byPath.get('/webauthn/authenticate/options')?.request).toContain(
      'rp_id',
    );
    expect(byPath.get('/webauthn/authenticate/options')?.response).toContain(
      'publicKey',
    );
    expect(byPath.get('/webauthn/authenticate/options')?.response).toContain(
      '"rpId": "example.com"',
    );
    expect(byPath.get('/webauthn/authenticate/options')?.response).toContain(
      'rpId',
    );
    expect(
      byPath.get('/webauthn/authenticate/options')?.response,
    ).not.toContain('allowCredentials');
    expect(byPath.get('/webauthn/authenticate/verify')?.request).toContain(
      'request_id',
    );
    expect(byPath.get('/webauthn/authenticate/verify')?.request).toContain(
      'credential',
    );
    expect(byPath.get('/webauthn/credentials/cred_123')?.request).toContain(
      'authorization',
    );
    expect(byPath.get('/webauthn/credentials/cred_123')?.response).toContain(
      'ok',
    );
  });

  it('does not expose a known-issues content block anymore', () => {
    const content = buildDemoContent(sampleState);

    expect(content).not.toHaveProperty('knownIssues');
  });

  it('documents audience validation and /me usage in backend jwt guidance', () => {
    const content = buildDemoContent(sampleState);

    expect(content.backendNotes.join('\n')).toContain('Validate aud');
    expect(content.backendNotes.join('\n')).toContain('GET /me');
    expect(content.backendNotes.join('\n')).toContain(
      'not as the backend per-request auth path',
    );
  });

  it('includes hero and how-it-works copy for the landing-page role', () => {
    const content = buildDemoContent(sampleState);

    expect(content.hero.title).toContain('auth-mini');
    expect(content.hero.valueProp).toContain('small');
    expect(content.hero.audience).toContain('auth');
    expect(content.hero.capabilities).toEqual(
      expect.arrayContaining([
        'email OTP',
        'passkey',
        'JWT',
        'JWKS',
        'SQLite',
        'self-hosted',
      ]),
    );
    expect(content.howItWorks.join('\n')).toContain('module construction');
    expect(content.howItWorks.join('\n')).toContain('origin add');
    expect(content.howItWorks.join('\n')).toContain('import map');
    expect(content.howItWorks.join('\n')).toContain('WebAuthn');
  });

  it('marks long reference sections for progressive disclosure', () => {
    const content = buildDemoContent(sampleState);

    expect(content.apiReference.every((entry) => entry.detailsLabel)).toBe(
      true,
    );
    expect(content.backendNotesDisclosureLabel).toContain('More');
  });

  it('keeps quick start focused on startup and smtp setup only', () => {
    const content = buildDemoContent(sampleState);

    expect(content.startupCommand).toContain('npx auth-mini origin add');
    expect(content.startupCommand).toContain('npx auth-mini start');
    expect(content.startupCommand).toContain('npx auth-mini smtp add');
  });
});
