const API_DETAILS_LABEL = 'Show request and response';
const DEMO_SDK_MODULE_PATH = 'auth-mini/sdk/browser';
const DEMO_SDK_IMPORT_MAP_TARGET = '../dist/sdk/browser.js';

export function buildDemoContent(setupState) {
  const { currentOrigin, issuer, jwksUrl, sdkOrigin, startupCommand } =
    setupState;
  const placeholderOrigin = 'https://auth.zccz14.com';
  const resolvedSdkOrigin = sdkOrigin || placeholderOrigin;
  const resolvedIssuer = issuer || placeholderOrigin;
  const resolvedJwksUrl = jwksUrl || `${placeholderOrigin}/jwks`;

  return {
    sdkModuleSnippet: sdkOrigin
      ? [
          `import { createBrowserSdk } from '${DEMO_SDK_MODULE_PATH}';`,
          '',
          `const AuthMini = createBrowserSdk('${sdkOrigin}');`,
        ].join('\n')
      : '// Add ?sdk-origin=https://your-auth-origin to render the exact browser SDK snippet.',
    startupCommand,
    hero: {
      title: 'auth-mini',
      valueProp:
        'A small, self-hosted auth server for apps that just need auth.',
      audience:
        'For teams that want auth with email OTP, passkeys, JWTs, JWKS, and SQLite without adopting a larger platform.',
      capabilities: [
        'email OTP',
        'passkey',
        'JWT',
        'JWKS',
        'SQLite',
        'self-hosted',
      ],
    },
    howItWorks: [
      'The page origin is the value you store with npx auth-mini origin add.',
      `Import the browser SDK from ${DEMO_SDK_MODULE_PATH} in demo/main.js, then let the /demo/ page's import map resolve it to ${DEMO_SDK_IMPORT_MAP_TARGET} from the sibling /dist/ directory in the same static site.`,
      'module construction keeps the auth origin explicit instead of inferring it from a served singleton script URL.',
      'WebAuthn and CORS both depend on the page origin being allowlisted and the auth server issuer matching the auth origin.',
    ],
    joseSnippet: [
      "import { createRemoteJWKSet, jwtVerify } from 'jose';",
      '',
      `const issuer = '${resolvedIssuer}';`,
      "const jwks = createRemoteJWKSet(new URL('/jwks', issuer));",
      '// Validate aud when your backend defines an audience boundary.',
      'await jwtVerify(token, jwks, { issuer });',
    ].join('\n'),
    apiReference: [
      makeApiEntry({
        sdkOrigin: resolvedSdkOrigin,
        method: 'POST',
        path: '/email/start',
        when: 'Start email sign-in with an email OTP.',
        body: { email: 'user@example.com' },
        response: '{ "ok": true }',
      }),
      makeApiEntry({
        sdkOrigin: resolvedSdkOrigin,
        method: 'POST',
        path: '/email/verify',
        when: 'Exchange the email OTP for a signed-in session.',
        body: { email: 'user@example.com', code: '123456' },
        response:
          '{ "session_id": "sess_123", "access_token": "<jwt>", "token_type": "Bearer", "expires_in": 3600, "refresh_token": "<refresh-token>" }',
      }),
      makeApiEntry({
        sdkOrigin: resolvedSdkOrigin,
        method: 'POST',
        path: '/session/refresh',
        when: 'Rotate a refresh token into a fresh access token.',
        body: { session_id: 'sess_123', refresh_token: '<refresh-token>' },
        response:
          '{ "session_id": "sess_123", "access_token": "<jwt>", "token_type": "Bearer", "expires_in": 3600, "refresh_token": "<refresh-token>" }',
      }),
      makeApiEntry({
        sdkOrigin: resolvedSdkOrigin,
        method: 'GET',
        path: '/me',
        when: 'Hydrate frontend user/session state after sign-in or refresh.',
        headers: { authorization: 'Bearer <access_token>' },
        response:
          '{ "user_id": "user_123", "email": "user@example.com", "webauthn_credentials": [{ "credential_id": "cred_123", "public_key": "<base64url>", "counter": 1, "transports": "internal" }], "active_sessions": [{ "id": "sess_123", "created_at": "2026-04-04T00:00:00.000Z", "expires_at": "2026-04-05T00:00:00.000Z" }] }',
      }),
      makeApiEntry({
        sdkOrigin: resolvedSdkOrigin,
        method: 'POST',
        path: '/session/logout',
        when: 'Invalidate the active session and clear refresh credentials.',
        headers: { authorization: 'Bearer <access_token>' },
        response: '{ "ok": true }',
      }),
      makeApiEntry({
        sdkOrigin: resolvedSdkOrigin,
        method: 'POST',
        path: '/webauthn/register/options',
        when: 'Request registration options before creating a passkey.',
        headers: { authorization: 'Bearer <access_token>' },
        body: { rp_id: 'example.com' },
        response:
          '{ "request_id": "550e8400-e29b-41d4-a716-446655440000", "publicKey": { "challenge": "...", "rp": { "id": "example.com", "name": "auth-mini" }, "user": { "id": "<base64url>", "name": "user@example.com", "displayName": "user@example.com" }, "pubKeyCredParams": [{ "type": "public-key", "alg": -7 }, { "type": "public-key", "alg": -257 }], "timeout": 300000, "authenticatorSelection": { "residentKey": "required", "userVerification": "preferred" } } }',
      }),
      makeApiEntry({
        sdkOrigin: resolvedSdkOrigin,
        method: 'POST',
        path: '/webauthn/register/verify',
        when: 'Verify the completed passkey registration ceremony.',
        headers: { authorization: 'Bearer <access_token>' },
        body: {
          request_id: '550e8400-e29b-41d4-a716-446655440000',
          credential: {
            id: 'cred_123',
            rawId: '<base64url>',
            type: 'public-key',
            authenticatorAttachment: 'platform',
            clientExtensionResults: {},
            response: {
              clientDataJSON: '<base64url>',
              attestationObject: '<base64url>',
              transports: ['internal'],
            },
          },
        },
        response: '{ "ok": true }',
      }),
      makeApiEntry({
        sdkOrigin: resolvedSdkOrigin,
        method: 'POST',
        path: '/webauthn/authenticate/options',
        when: 'Request authentication options for username-less passkey sign-in.',
        body: { rp_id: 'example.com' },
        response:
          '{ "request_id": "550e8400-e29b-41d4-a716-446655440000", "publicKey": { "challenge": "...", "rpId": "example.com", "timeout": 300000, "userVerification": "preferred" } }',
      }),
      makeApiEntry({
        sdkOrigin: resolvedSdkOrigin,
        method: 'POST',
        path: '/webauthn/authenticate/verify',
        when: 'Verify the passkey assertion and create a session.',
        body: {
          request_id: '550e8400-e29b-41d4-a716-446655440000',
          credential: {
            id: 'cred_123',
            rawId: '<base64url>',
            type: 'public-key',
            authenticatorAttachment: 'platform',
            clientExtensionResults: {},
            response: {
              authenticatorData: '<base64url>',
              clientDataJSON: '<base64url>',
              signature: '<base64url>',
              userHandle: '<base64url-or-null>',
            },
          },
        },
        response:
          '{ "session_id": "sess_123", "access_token": "<jwt>", "token_type": "Bearer", "expires_in": 3600, "refresh_token": "<refresh-token>" }',
      }),
      makeApiEntry({
        sdkOrigin: resolvedSdkOrigin,
        method: 'DELETE',
        path: '/webauthn/credentials/cred_123',
        when: 'Delete a saved passkey credential for the signed-in user.',
        headers: { authorization: 'Bearer <access_token>' },
        response: '{ "ok": true }',
      }),
      makeApiEntry({
        sdkOrigin: resolvedSdkOrigin,
        method: 'GET',
        path: '/jwks',
        when: 'Publish the JWKS used to verify JWT signatures.',
        response:
          '{ "keys": [{ "kid": "current-key-id", "kty": "OKP", "alg": "EdDSA", "use": "sig", "crv": "Ed25519", "x": "..." }, { "kid": "standby-key-id", "kty": "OKP", "alg": "EdDSA", "use": "sig", "crv": "Ed25519", "x": "..." }] }',
      }),
    ],
    backendNotes: [
      `Validate iss on every backend token check against ${resolvedIssuer}.`,
      'Validate aud whenever your backend uses audience boundaries between services.',
      'Use GET /me for frontend user-state hydration, not as the backend per-request auth path.',
      `Cache the remote JWKS from ${resolvedJwksUrl} and keep backend verifier config aligned with your issuer.`,
      'Because the previous CURRENT key is not retained after rotation, refreshing JWKS after rotation may break verification for still-valid older access tokens.',
    ],
    backendNotesDisclosureLabel: 'More backend JWT notes',
    deploymentNotes: [
      `For GitHub Pages or any static host, publish a static site root that keeps sibling demo/ and dist/ directories, then serve this page from /demo/ with the import map still pointing ${DEMO_SDK_MODULE_PATH} at ${DEMO_SDK_IMPORT_MAP_TARGET}.`,
      `After publish, run npx auth-mini origin add ./auth-mini.sqlite --value ${currentOrigin} (or whatever final page origin you actually deployed) because the stored origin must match the browser page origin, not the auth server origin.`,
      'If docs and auth live on different origins, keep the page URL on the docs host and append ?sdk-origin=https://your-auth-origin so createBrowserSdk(...) still points at the auth host.',
      'If you use a custom GitHub Pages domain, publish a matching CNAME file and keep that domain stable; update the stored allowed origin whenever the docs host changes enough to alter window.location.origin.',
    ],
  };
}

function makeApiEntry({
  body,
  headers,
  method,
  path,
  response,
  sdkOrigin,
  when,
}) {
  return {
    method,
    path,
    when,
    detailsLabel: API_DETAILS_LABEL,
    request: buildRequestSnippet({ body, headers, method, path, sdkOrigin }),
    response,
  };
}

function buildRequestSnippet({ body, headers = {}, method, path, sdkOrigin }) {
  const url = `${sdkOrigin}${path}`;
  const requestHeaders = { ...headers };

  if (method === 'GET' || method === 'DELETE') {
    const lines = [`fetch('${url}', {`, `  method: '${method}',`];

    if (Object.keys(requestHeaders).length > 0) {
      lines.push(
        `  headers: ${JSON.stringify(requestHeaders, null, 2).replaceAll('\n', '\n  ')},`,
      );
    }

    lines.push('})');

    return lines.join('\n');
  }

  if (body !== undefined) {
    requestHeaders['content-type'] = 'application/json';
  }

  const lines = [`fetch('${url}', {`, `  method: '${method}',`];

  if (Object.keys(requestHeaders).length > 0) {
    lines.push(
      `  headers: ${JSON.stringify(requestHeaders, null, 2).replaceAll('\n', '\n  ')},`,
    );
  }

  if (body !== undefined) {
    lines.push(`  body: JSON.stringify(${JSON.stringify(body, null, 2)}),`);
  }

  lines.push('})');

  return lines.join('\n');
}
