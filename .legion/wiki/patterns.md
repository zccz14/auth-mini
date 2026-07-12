# Reusable Patterns

## Narrowing High-Level WebAuthn Options

When a locked high-level WebAuthn API has safer verification behavior but emits an incompatible client hint:

1. Keep the high-level registration and finish APIs rather than taking ownership of an unsafe core API.
2. Mutate accessible typed fields first.
3. Clear library-owned outbound extensions before entering one small, fail-closed JSON projection boundary.
4. Emit and test an exact extension allowlist rather than forwarding the library's complete map.
5. Preserve the original server-side ceremony state and prove the intentional state/wire difference with a valid cryptographic ceremony.
6. Re-audit defaults, state handling, extension parsing, and persistence whenever the locked WebAuthn dependency changes.

Current application: `webauthn-rs 0.5.5` registration keeps its high-level state while auth-mini emits only required resident-key fields and `credProps`.

## Testing Registration Policy Without Weakening WebAuthn

- Build a cryptographically valid registration response, then vary only the unsigned client extension result for true, false, and missing cases.
- Trigger duplicate rollback with a valid response for a new challenge and an existing credential ID.
- Compare complete existing credential rows, not only row counts.
- Keep browser chooser interoperability as a separate manual gate; a helper that explicitly selects a test key proves server ceremony behavior, not discoverability.

Source: [verification report](../tasks/fix-passkey-discoverable-contract/docs/test-report.md).
