import { createBrowserSdk } from 'auth-mini/sdk/browser';
import type {
  AuthenticationTargetInput,
  AuthMiniApi,
  SessionSnapshot,
} from 'auth-mini/sdk/browser';

const sdk: AuthMiniApi = createBrowserSdk('https://auth.example.com');

const state: SessionSnapshot = sdk.session.getState();
const emailVerifyResult = await sdk.email.verify({
  email: 'user@example.com',
  code: '123456',
  redirect_uri: 'https://app.example.com/callback',
});
const sessionRefreshResult = await sdk.session.refresh();
const webauthnAuthenticateResult = await sdk.webauthn.authenticate();
const localTarget: AuthenticationTargetInput = {
  redirect_uri: 'http://localhost:5173/callback',
  aud: 'app.example.com',
};
const passkeyAuthenticateResult = await sdk.passkey.authenticate(localTarget);
sdk.session.clearLocal();
// @ts-expect-error session snapshots no longer expose me
void sdk.session.getState().me;
// @ts-expect-error auth/session results are token-only
void emailVerifyResult.me;
// @ts-expect-error auth/session results are token-only
void sessionRefreshResult.me;
// @ts-expect-error auth/session results are token-only
void webauthnAuthenticateResult.me;
// @ts-expect-error auth/session results are token-only
void passkeyAuthenticateResult.me;

void state;
void state.accessToken;
void emailVerifyResult.accessToken;
void sessionRefreshResult.refreshToken;
void webauthnAuthenticateResult.sessionId;
void passkeyAuthenticateResult.accessToken;
