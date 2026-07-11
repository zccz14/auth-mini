# fix-passkey-discoverable-contract

## Metadata

- `task-id`: `fix-passkey-discoverable-contract`
- `status`: `active`
- `risk`: `high`
- `schema-version`: `2026-07`
- `historical`: `false`
- `supersedes`: `(none)`
- `superseded-by`: `(none)`

## Outcome Summary

- The implementation now requires discoverable credentials during registration and keeps username-less authentication on the same RP ID without `allowCredentials`.
- Server verification strictly requires the unsigned client report `credProps.rk=true` in addition to complete WebAuthn verification.
- Existing credentials remain untouched across successful, rejected, and duplicate registrations.
- Automated change verification and security review passed.
- The task remains active because Firefox/Bitwarden chooser interoperability has not been exercised in a suitable graphical test environment and blocks merge/release.

## Reusable Decisions

- Keep the safe high-level `webauthn-rs` API and close the outbound extension surface to exact `credProps` rather than adopting the unsafe core API.
- Treat `credProps.rk` as an unsigned policy signal only.
- Keep registration append-only and credential cleanup explicit.
- Separate valid server-ceremony automation from real browser chooser evidence.

## Related Raw Sources

- `plan`: `.legion/tasks/fix-passkey-discoverable-contract/plan.md`
- `log`: `.legion/tasks/fix-passkey-discoverable-contract/log.md`
- `tasks`: `.legion/tasks/fix-passkey-discoverable-contract/tasks.md`
- `research`: `.legion/tasks/fix-passkey-discoverable-contract/docs/research.md`
- `rfc`: `.legion/tasks/fix-passkey-discoverable-contract/docs/rfc.md`
- `design review`: `.legion/tasks/fix-passkey-discoverable-contract/docs/review-rfc.md`
- `verification`: `.legion/tasks/fix-passkey-discoverable-contract/docs/test-report.md`
- `change review`: `.legion/tasks/fix-passkey-discoverable-contract/docs/review-change.md`
- `report`: `.legion/tasks/fix-passkey-discoverable-contract/docs/report-walkthrough.md`
- `PR body`: `.legion/tasks/fix-passkey-discoverable-contract/docs/pr-body.md`

## Notes

- This page is a current summary. Use the linked raw evidence for implementation details and command output.
