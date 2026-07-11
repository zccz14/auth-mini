# Current Decisions

## Discoverable Passkey Contract

- Passkey registration and username-less authentication must use the same configured RP ID.
- Registration options must require a discoverable credential with `residentKey="required"`, `requireResidentKey=true`, and an exact outbound extension object `{ "credProps": true }`.
- Registration verification accepts only the JSON boolean `clientExtensionResults.credProps.rk=true`. Missing, false, or malformed values fail with the existing generic registration error.
- Authentication remains username-less and intentionally omits `allowCredentials`; auth-mini does not add a username-first fallback for legacy non-discoverable credentials.
- `credProps.rk` is an unsigned client policy signal, not cryptographic proof and not an authorization or migration attribute.

## Credential Data Safety

- Registration is append-only. Existing WebAuthn credentials are never automatically migrated, replaced, rewritten, or deleted.
- A failed or duplicate registration must leave the challenge unconsumed through transaction rollback and preserve all existing credential fields.
- Credential deletion remains an explicit authenticated management action.

Sources: [task summary](./tasks/fix-passkey-discoverable-contract.md), [RFC](../tasks/fix-passkey-discoverable-contract/docs/rfc.md).
