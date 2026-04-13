import { createBrowserSdk } from 'auth-mini/sdk/browser';
import type {
  AuthMiniApi,
  MeResponse,
  SessionSnapshot,
} from 'auth-mini/sdk/browser';

const sdk: AuthMiniApi = createBrowserSdk('https://auth.example.com');

const state: SessionSnapshot = sdk.session.getState();
const emailVerifyResult = await sdk.email.verify({
  email: 'user@example.com',
  code: '123456',
});
const sessionRefreshResult = await sdk.session.refresh();
const webauthnAuthenticateResult = await sdk.webauthn.authenticate();
const passkeyAuthenticateResult = await sdk.passkey.authenticate({
  rpId: 'auth.example.com',
});
// @ts-expect-error session snapshots no longer expose me
void sdk.session.getState().me;
// @ts-expect-error me.get was removed from the public contract
void sdk.me.get();
// @ts-expect-error me.reload was removed from the public contract
void sdk.me.reload();
// @ts-expect-error auth/session results are token-only
void emailVerifyResult.me;
// @ts-expect-error auth/session results are token-only
void sessionRefreshResult.me;
// @ts-expect-error auth/session results are token-only
void webauthnAuthenticateResult.me;
// @ts-expect-error auth/session results are token-only
void passkeyAuthenticateResult.me;
const me: MeResponse = await sdk.me.fetch();

const credentialId: string = me.webauthn_credentials[0].credential_id;
const rpId: string = me.webauthn_credentials[0].rp_id;
const lastUsedAt: string | null = me.webauthn_credentials[0].last_used_at;
const transport: string = me.webauthn_credentials[0].transports[0];
const publicKey: string = me.ed25519_credentials[0].public_key;
const authMethod: string = me.active_sessions[0].auth_method;
const expiresAt: string = me.active_sessions[0].expires_at;
const ip: string | null = me.active_sessions[0].ip;
const userAgent: string | null = me.active_sessions[0].user_agent;

void state;
void state.accessToken;
void emailVerifyResult.accessToken;
void sessionRefreshResult.refreshToken;
void webauthnAuthenticateResult.sessionId;
void passkeyAuthenticateResult.accessToken;
void credentialId;
void rpId;
void lastUsedAt;
void transport;
void publicKey;
void authMethod;
void expiresAt;
void ip;
void userAgent;
void me;
