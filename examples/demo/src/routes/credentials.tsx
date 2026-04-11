import { useEffect, useState } from 'react';
import { FlowCard } from '@/components/app/flow-card';
import { Button } from '@/components/ui/button';
import { useDemo } from '@/app/providers/demo-provider';

type PasskeyRow = {
  id: string;
  credential_id: string;
  created_at: string;
};

type Ed25519Row = {
  id: string;
  name: string;
  public_key: string;
  last_used_at: string | null;
  created_at: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asPasskeyRows(value: unknown): PasskeyRow[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((row) => {
    const record = asRecord(row);
    if (
      record &&
      typeof record.id === 'string' &&
      typeof record.credential_id === 'string' &&
      typeof record.created_at === 'string'
    ) {
      return [record as PasskeyRow];
    }

    return [];
  });
}

function asEd25519Rows(value: unknown): Ed25519Row[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((row) => {
    const record = asRecord(row);
    if (
      record &&
      typeof record.id === 'string' &&
      typeof record.name === 'string' &&
      typeof record.public_key === 'string' &&
      (typeof record.last_used_at === 'string' || record.last_used_at === null) &&
      typeof record.created_at === 'string'
    ) {
      return [record as Ed25519Row];
    }

    return [];
  });
}

function truncateMiddle(value: string, edge = 20) {
  return value.length <= edge * 2 + 1
    ? value
    : `${value.slice(0, edge)}…${value.slice(-edge)}`;
}

function getUserEmail(user: unknown) {
  const record = asRecord(user);
  return record && typeof record.email === 'string' ? record.email : '';
}

function getUserPasskeys(user: unknown) {
  return asPasskeyRows(asRecord(user)?.webauthn_credentials);
}

function getUserEd25519Credentials(user: unknown) {
  return asEd25519Rows(asRecord(user)?.ed25519_credentials);
}

export function CredentialsRoute() {
  const { config, sdk, session, user } = useDemo();
  const [currentUser, setCurrentUser] = useState(user);
  const [pendingSections, setPendingSections] = useState({
    passkey: false,
    ed25519: false,
  });
  const [passkeyError, setPasskeyError] = useState('');
  const [ed25519Error, setEd25519Error] = useState('');

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  const authenticated =
    config.status === 'ready' &&
    Boolean(sdk) &&
    session.authenticated &&
    typeof session.accessToken === 'string' &&
    session.accessToken.length > 0;

  const email = getUserEmail(currentUser);
  const passkeys = getUserPasskeys(currentUser);
  const ed25519Credentials = getUserEd25519Credentials(currentUser);

  async function deleteCredential(input: {
    section: 'passkey' | 'ed25519';
    confirmMessage: string;
    path: string;
  }) {
    if (
      !authenticated ||
      !sdk ||
      pendingSections[input.section] ||
      !window.confirm(input.confirmMessage)
    ) {
      return;
    }

    const setError =
      input.section === 'passkey' ? setPasskeyError : setEd25519Error;

    setPendingSections((current) => ({
      ...current,
      [input.section]: true,
    }));
    setError('');

    try {
      const response = await fetch(new URL(input.path, config.authOrigin), {
        method: 'DELETE',
        headers: {
          authorization: `Bearer ${session.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Delete failed with status ${response.status}`);
      }

      setCurrentUser(await sdk.me.reload());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Delete failed');
    } finally {
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
                      <td className="py-3 pr-4">{row.created_at}</td>
                      <td className="py-3">
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
                    <th className="py-2 font-medium">Action</th>
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
