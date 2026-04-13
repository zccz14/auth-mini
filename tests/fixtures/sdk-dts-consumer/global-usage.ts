window.AuthMini.session.onChange((state) => {
  const status = state.status;
  // @ts-expect-error session snapshots no longer expose me
  void state.me;

  void status;
});

async function readMe() {
  const emailVerifyResult = await window.AuthMini.email.verify({
    email: 'user@example.com',
    code: '123456',
  });
  const sessionRefreshResult = await window.AuthMini.session.refresh();
  const webauthnAuthenticateResult =
    await window.AuthMini.webauthn.authenticate();
  const passkeyAuthenticateResult = await window.AuthMini.passkey.authenticate({
    rpId: 'auth.example.com',
  });
  const me = await window.AuthMini.me.fetch();
  // @ts-expect-error auth/session results are token-only
  void emailVerifyResult.me;
  // @ts-expect-error auth/session results are token-only
  void sessionRefreshResult.me;
  // @ts-expect-error auth/session results are token-only
  void webauthnAuthenticateResult.me;
  // @ts-expect-error auth/session results are token-only
  void passkeyAuthenticateResult.me;
  const email = me.email;
  const credentialId = me.webauthn_credentials[0].credential_id;
  const rpId = me.webauthn_credentials[0].rp_id;
  const lastUsedAt = me.webauthn_credentials[0].last_used_at;
  const publicKey = me.ed25519_credentials[0].public_key;
  const expiresAt = me.active_sessions[0].expires_at;

  void email;
  void emailVerifyResult.accessToken;
  void sessionRefreshResult.refreshToken;
  void webauthnAuthenticateResult.sessionId;
  void passkeyAuthenticateResult.accessToken;
  void credentialId;
  void rpId;
  void lastUsedAt;
  void publicKey;
  void expiresAt;
}

window.AuthMini.email.start({ email: 'user@example.com' });
window.AuthMini.email.verify({ email: 'user@example.com', code: '123456' });
window.AuthMini.passkey.authenticate({ rpId: 'auth.example.com' });
window.AuthMini.webauthn.register();
void readMe();
// @ts-expect-error me.get was removed from the public contract
window.AuthMini.me.get();
// @ts-expect-error me.reload was removed from the public contract
window.AuthMini.me.reload();
window.AuthMini.session.getState();
window.AuthMini.session.refresh();
window.AuthMini.session.logout();
