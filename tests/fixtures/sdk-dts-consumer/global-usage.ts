window.AuthMini.session.onChange((state) => {
  const status = state.status;
  const email = state.me?.email;
  const credentialId = state.me?.webauthn_credentials[0].credential_id;
  const rpId = state.me?.webauthn_credentials[0].rp_id;
  const lastUsedAt = state.me?.webauthn_credentials[0].last_used_at;
  const publicKey = state.me?.ed25519_credentials[0].public_key;
  const expiresAt = state.me?.active_sessions[0].expires_at;

  void status;
  void email;
  void credentialId;
  void rpId;
  void lastUsedAt;
  void publicKey;
  void expiresAt;
});

window.AuthMini.email.start({ email: 'user@example.com' });
window.AuthMini.email.verify({ email: 'user@example.com', code: '123456' });
window.AuthMini.passkey.authenticate({ rpId: 'auth.example.com' });
window.AuthMini.webauthn.register();
window.AuthMini.me.get();
window.AuthMini.me.reload();
window.AuthMini.session.getState();
window.AuthMini.session.refresh();
window.AuthMini.session.logout();
