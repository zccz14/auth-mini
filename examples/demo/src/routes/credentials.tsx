import { useCallback, useEffect, useRef, useState } from 'react';
import { FlowCard } from '@/components/app/flow-card';
import { Button } from '@/components/ui/button';
import { useDemo } from '@/app/providers/demo-provider';

type CredentialCapability = 'manageable' | 'not-manageable' | 'legacy-token';

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function truncateMiddle(value: string, edge = 20) {
  return value.length <= edge * 2 + 1
    ? value
    : `${value.slice(0, edge)}…${value.slice(-edge)}`;
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4)) % 4;
  return atob(`${normalized}${'='.repeat(padding)}`);
}

function getAccessTokenPayload(accessToken: string) {
  const [, payloadSegment] = accessToken.split('.');
  if (!payloadSegment) return null;

  try {
    return asRecord(JSON.parse(decodeBase64Url(payloadSegment)));
  } catch {
    return null;
  }
}

function getCredentialCapability(accessToken: string): CredentialCapability {
  const payload = getAccessTokenPayload(accessToken);
  if (!payload) {
    return 'not-manageable';
  }

  if (!('amr' in payload)) {
    return 'legacy-token';
  }

  const amr = Array.isArray(payload.amr)
    ? payload.amr.filter((value: unknown): value is string => typeof value === 'string')
    : [];

  if (amr.length === 0) {
    return 'not-manageable';
  }

  return amr.includes('email_otp') || amr.includes('webauthn')
    ? 'manageable'
    : 'not-manageable';
}

type DemoMe = Awaited<
  ReturnType<NonNullable<ReturnType<typeof useDemo>['sdk']>['me']['fetch']>
>;

export function CredentialsRoute() {
  const { config, sdk, session } = useDemo();
  const [me, setMe] = useState<DemoMe | null>(null);
  const [loadingMe, setLoadingMe] = useState(false);
  const [meError, setMeError] = useState('');
  const loadMeRequestIdRef = useRef(0);
  const [pendingSections, setPendingSections] = useState({
    passkey: false,
    ed25519: false,
  });
  const pendingSectionsRef = useRef({
    passkey: false,
    ed25519: false,
  });
  const [passkeyError, setPasskeyError] = useState('');
  const [ed25519Error, setEd25519Error] = useState('');
  const [accessTokenOverride, setAccessTokenOverride] = useState<string | null>(null);

  useEffect(() => {
    setAccessTokenOverride(null);
  }, [session.accessToken]);

  const authenticated =
    config.status === 'ready' &&
    Boolean(sdk) &&
    session.authenticated &&
    typeof session.accessToken === 'string' &&
    session.accessToken.length > 0;
  const accessToken = typeof session.accessToken === 'string' ? session.accessToken : '';
  const effectiveAccessToken = accessTokenOverride ?? accessToken;
  const credentialCapability = authenticated
    ? getCredentialCapability(effectiveAccessToken)
    : 'not-manageable';
  const credentialManageable = credentialCapability === 'manageable';

  const loadMe = useCallback(async () => {
    const requestId = loadMeRequestIdRef.current + 1;
    loadMeRequestIdRef.current = requestId;

    if (!authenticated || !sdk || config.status !== 'ready') {
      setMe(null);
      setMeError('');
      setLoadingMe(false);
      return;
    }

    setLoadingMe(true);
    setMeError('');

    try {
      const nextMe = await sdk.me.fetch();
      if (loadMeRequestIdRef.current !== requestId) {
        return;
      }

      setMe(nextMe);
    } catch (cause) {
      if (loadMeRequestIdRef.current !== requestId) {
        return;
      }

      setMe(null);
      setMeError(
        cause instanceof Error ? cause.message : 'Unable to load current account.',
      );
    } finally {
      if (loadMeRequestIdRef.current === requestId) {
        setLoadingMe(false);
      }
    }
  }, [authenticated, config.status, sdk, session.sessionId]);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  useEffect(() => {
    if (
      !authenticated ||
      !sdk ||
      credentialCapability !== 'legacy-token' ||
      !session.refreshToken ||
      accessTokenOverride
    ) {
      return;
    }

    let cancelled = false;

    void sdk.session
      .refresh()
      .then((refreshed) => {
        if (!cancelled && typeof refreshed.accessToken === 'string') {
          setAccessTokenOverride(refreshed.accessToken);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [
    accessTokenOverride,
    authenticated,
    credentialCapability,
    sdk,
    session.refreshToken,
  ]);

  const email = me?.email ?? '';
  const passkeys = me?.webauthn_credentials ?? [];
  const ed25519Credentials = me?.ed25519_credentials ?? [];

  async function deleteCredential(input: {
    section: 'passkey' | 'ed25519';
    confirmMessage: string;
    path: string;
  }) {
    if (
      !credentialManageable ||
      !sdk ||
      pendingSectionsRef.current[input.section] ||
      !window.confirm(input.confirmMessage)
    ) {
      return;
    }

    const setError =
      input.section === 'passkey' ? setPasskeyError : setEd25519Error;

    pendingSectionsRef.current[input.section] = true;
    setPendingSections((current) => ({
      ...current,
      [input.section]: true,
    }));
    setError('');

    try {
      const response = await fetch(new URL(input.path, config.authOrigin), {
        method: 'DELETE',
        headers: {
          authorization: `Bearer ${effectiveAccessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Delete failed with status ${response.status}`);
      }

      await loadMe();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Delete failed');
    } finally {
      pendingSectionsRef.current[input.section] = false;
      setPendingSections((current) => ({
        ...current,
        [input.section]: false,
      }));
    }
  }

  return (
    <FlowCard
      title="Credentials"
      description="Inspect the current account credentials and remove bound authenticators when needed."
    >
      <div className="space-y-6">
        {loadingMe ? (
          <p className="text-sm text-slate-600">Loading current account…</p>
        ) : null}
        {meError ? <p className="text-sm text-rose-600">{meError}</p> : null}

        <section
          aria-labelledby="credentials-email-heading"
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <h2
            id="credentials-email-heading"
            className="text-sm font-semibold text-slate-950"
          >
            Email
          </h2>
          <p className="text-sm text-slate-600">Managed via email OTP sign-in</p>
          {!authenticated ? (
            <p className="text-sm text-slate-600">
              Sign in to inspect the current account email.
            </p>
          ) : email ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4 font-medium">Email</th>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-4">{email}</td>
                    <td className="py-3 pr-4">Primary email</td>
                    <td className="py-3">Read-only</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              This account does not currently have a bound email.
            </p>
          )}
        </section>

        <section
          aria-labelledby="credentials-passkey-heading"
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <h2
            id="credentials-passkey-heading"
            className="text-sm font-semibold text-slate-950"
          >
            Passkey
          </h2>
          <p className="text-sm text-slate-600">
            Review the passkeys currently bound to this account.
          </p>
          {passkeyError ? <p className="text-sm text-rose-600">{passkeyError}</p> : null}
          {!authenticated ? (
            <p className="text-sm text-slate-600">Sign in to inspect current passkeys.</p>
          ) : passkeys.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4 font-medium">Credential ID</th>
                    <th className="py-2 pr-4 font-medium">RP ID</th>
                    <th className="py-2 pr-4 font-medium">Last Used</th>
                    <th className="py-2 pr-4 font-medium">Created At</th>
                    <th className="py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {passkeys.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 pr-4" title={row.credential_id}>
                        {truncateMiddle(row.credential_id)}
                      </td>
                      <td className="py-3 pr-4">{row.rp_id}</td>
                      <td className="py-3 pr-4">{row.last_used_at ?? 'Never'}</td>
                      <td className="py-3 pr-4">{row.created_at}</td>
                      <td className="py-3">
                        {credentialManageable ? (
                          <Button
                            disabled={pendingSections.passkey}
                            aria-label={`Delete passkey ${row.credential_id}`}
                            onClick={() =>
                              void deleteCredential({
                                section: 'passkey',
                                confirmMessage: `Delete passkey ${row.credential_id} from the current account? This cannot be undone.`,
                                path: `/webauthn/credentials/${row.id}`,
                              })
                            }
                          >
                            {pendingSections.passkey ? 'Deleting…' : 'Delete'}
                          </Button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              No passkeys are currently bound to this account.
            </p>
          )}
        </section>

        <section
          aria-labelledby="credentials-ed25519-heading"
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <h2
            id="credentials-ed25519-heading"
            className="text-sm font-semibold text-slate-950"
          >
            Ed25519
          </h2>
          <p className="text-sm text-slate-600">
            Review the device keys currently bound to this account.
          </p>
          {ed25519Error ? (
            <p className="text-sm text-rose-600">{ed25519Error}</p>
          ) : null}
          {!authenticated ? (
            <p className="text-sm text-slate-600">
              Sign in to inspect current Ed25519 credentials.
            </p>
          ) : ed25519Credentials.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Public Key</th>
                    <th className="py-2 pr-4 font-medium">Last Used</th>
                    <th className="py-2 pr-4 font-medium">Created At</th>
                    {credentialManageable ? (
                      <th className="py-2 font-medium">Action</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {ed25519Credentials.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 pr-4">{row.name}</td>
                      <td className="py-3 pr-4" title={row.public_key}>
                        {truncateMiddle(row.public_key)}
                      </td>
                      <td className="py-3 pr-4">{row.last_used_at ?? 'Never'}</td>
                      <td className="py-3 pr-4">{row.created_at}</td>
                      {credentialManageable ? (
                        <td className="py-3">
                          <Button
                            disabled={pendingSections.ed25519}
                            aria-label={`Delete device key ${row.name}`}
                            onClick={() =>
                              void deleteCredential({
                                section: 'ed25519',
                                confirmMessage: `Delete Ed25519 credential ${row.name} from the current account? This cannot be undone.`,
                                path: `/ed25519/credentials/${row.id}`,
                              })
                            }
                          >
                            {pendingSections.ed25519 ? 'Deleting…' : 'Delete'}
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              No Ed25519 credentials are currently bound to this account.
            </p>
          )}
        </section>
      </div>
    </FlowCard>
  );
}
