import { createApiSdk } from 'auth-mini/sdk/api';
import type {
  ApiSdk,
  ApiSdkOptions,
  Auth,
  EmailStartRequest,
  MeResponse,
  RefreshRequest,
} from 'auth-mini/sdk/api';

const auth: Auth = {
  scheme: 'bearer',
  type: 'http',
};
const emailStartRequest: EmailStartRequest = {
  email: 'user@example.com',
};
const refreshRequest: RefreshRequest = {
  refresh_token: 'refresh-token',
  session_id: 'session-1',
};
const options: ApiSdkOptions = {
  auth: () => 'access-token',
  baseUrl: 'https://auth.example.com',
};
const sdk: ApiSdk = createApiSdk(options);
const meResponse = await sdk.me.get();
const me: MeResponse = meResponse.data as MeResponse;

const credentialId: string = me.webauthn_credentials[0].credential_id;
const rpId: string = me.webauthn_credentials[0].rp_id;
const lastUsedAt: string | null = me.webauthn_credentials[0].last_used_at;
const transport: string = me.webauthn_credentials[0].transports[0];
const publicKey: string = me.ed25519_credentials[0].public_key;
const authMethod: string = me.active_sessions[0].auth_method;
const audience: string = me.active_sessions[0].aud;
const expiresAt: string = me.active_sessions[0].expires_at;
const ip: string | null = me.active_sessions[0].ip;
const userAgent: string | null = me.active_sessions[0].user_agent;

type IsAny<T> = 0 extends 1 & T ? true : false;
type AssertNotAny<T extends false> = T;
type ActiveSession = (typeof me.active_sessions)[number];
type AuthMethodIsNotAny = AssertNotAny<IsAny<ActiveSession['auth_method']>>;
type IpIsNotAny = AssertNotAny<IsAny<ActiveSession['ip']>>;
type UserAgentIsNotAny = AssertNotAny<IsAny<ActiveSession['user_agent']>>;
const authMethodIsNotAny: AuthMethodIsNotAny = false;
const ipIsNotAny: IpIsNotAny = false;
const userAgentIsNotAny: UserAgentIsNotAny = false;

void auth;
void me;
void options;
void sdk.email.start({ body: emailStartRequest });
void sdk.session.refresh({ body: refreshRequest });
void sdk.jwks.list();
void credentialId;
void rpId;
void lastUsedAt;
void transport;
void publicKey;
void authMethod;
void audience;
void expiresAt;
void ip;
void userAgent;
void authMethodIsNotAny;
void ipIsNotAny;
void userAgentIsNotAny;
