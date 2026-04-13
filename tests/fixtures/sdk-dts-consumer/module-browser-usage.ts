import { createBrowserSdk } from 'auth-mini/sdk/browser';
import type {
  AuthMiniApi,
  MeResponse,
  SessionSnapshot,
} from 'auth-mini/sdk/browser';

const sdk: AuthMiniApi = createBrowserSdk('https://auth.example.com');

const state: SessionSnapshot = sdk.session.getState();
// @ts-expect-error session snapshots no longer expose me
void sdk.session.getState().me;
// @ts-expect-error me.get was removed from the public contract
void sdk.me.get();
// @ts-expect-error me.reload was removed from the public contract
void sdk.me.reload();
const me: MeResponse = await sdk.me.fetch();

const credentialId: string = me.webauthn_credentials[0].credential_id;
const rpId: string = me.webauthn_credentials[0].rp_id;
const lastUsedAt: string | null = me.webauthn_credentials[0].last_used_at;
const transport: string = me.webauthn_credentials[0].transports[0];
const publicKey: string = me.ed25519_credentials[0].public_key;
const expiresAt: string = me.active_sessions[0].expires_at;

void state;
void state.accessToken;
void credentialId;
void rpId;
void lastUsedAt;
void transport;
void publicKey;
void expiresAt;
void me;
