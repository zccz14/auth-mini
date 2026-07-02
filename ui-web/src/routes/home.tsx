import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useDemo } from '@/app/providers/demo-provider';
import {
  generateDemoEd25519Keypair,
  validateBase64Url32,
} from '@/lib/demo-ed25519';

type Me = Awaited<
  ReturnType<NonNullable<ReturnType<typeof useDemo>['sdk']>['me']['fetch']>
>;
type SessionCapability = 'manageable' | 'not-manageable' | 'legacy-token';
type ActiveSession = {
  id: string;
  auth_method: string;
  created_at: string;
  expires_at: string;
  ip?: string | null;
  user_agent?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4)) % 4;
  return atob(normalized + '='.repeat(padding));
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

function getSessionCapability(accessToken: string): SessionCapability {
  const payload = getAccessTokenPayload(accessToken);
  if (!payload) {
    return 'not-manageable';
  }

  if (!('amr' in payload)) {
    return 'legacy-token';
  }

  const amr = Array.isArray(payload.amr)
    ? payload.amr.filter(
        (value: unknown): value is string => typeof value === 'string',
      )
    : [];

  if (amr.length === 0) {
    return 'not-manageable';
  }

  return amr.includes('email_otp') || amr.includes('webauthn')
    ? 'manageable'
    : 'not-manageable';
}

function formatNullable(value: string | null | undefined) {
  if (value == null || value.trim() === '') {
    return 'Unavailable';
  }

  return value;
}

function truncateUserAgent(value: string | null | undefined) {
  if (value == null || value.trim() === '') {
    return 'Unavailable';
  }

  return value.length > 48 ? value.slice(0, 45) + '...' : value;
}

export function HomeRoute() {
  const { config, sdk, session } = useDemo();
  const [me, setMe] = useState<Me | null>(null);
  const [loadingMe, setLoadingMe] = useState(false);
  const [meError, setMeError] = useState('');
  const [meWarning, setMeWarning] = useState('');
  const loadMeRequestIdRef = useRef(0);
  const [ed25519Name, setEd25519Name] = useState('ED25519 key');
  const [privateKey, setPrivateKey] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [pendingCredential, setPendingCredential] = useState<string | null>(
    null,
  );
  const [credentialError, setCredentialError] = useState('');
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState('');

  const loadMe = useCallback(
    async (options?: { warningMessage?: string }) => {
      const requestId = loadMeRequestIdRef.current + 1;
      loadMeRequestIdRef.current = requestId;

      if (!sdk || config.status !== 'ready' || !session.authenticated) {
        setMe(null);
        setMeError('');
        setMeWarning('');
        setLoadingMe(false);
        return;
      }

      setLoadingMe(true);
      setMeError('');
      if (!options?.warningMessage) {
        setMeWarning('');
      }

      try {
        const nextMe = await sdk.me.fetch();
        if (loadMeRequestIdRef.current !== requestId) {
          return;
        }

        setMe(nextMe);
        setMeWarning('');
      } catch (cause) {
        if (loadMeRequestIdRef.current !== requestId) {
          return;
        }

        if (options?.warningMessage) {
          setMeWarning(options.warningMessage);
          return;
        }

        setMe(null);
        setMeError(
          cause instanceof Error ? cause.message : 'Unable to load account.',
        );
      } finally {
        if (loadMeRequestIdRef.current === requestId) {
          setLoadingMe(false);
        }
      }
    },
    [config.status, sdk, session.authenticated, session.sessionId],
  );

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  async function registerPasskey() {
    if (!sdk) return;
    setPendingCredential('passkey');
    setCredentialError('');

    try {
      await sdk.passkey.register();
      await loadMe();
    } catch (cause) {
      setCredentialError(
        cause instanceof Error ? cause.message : 'Unable to register passkey.',
      );
    } finally {
      setPendingCredential(null);
    }
  }

  async function generateEd25519() {
    setPendingCredential('generate-ed25519');
    setCredentialError('');

    try {
      const keypair = await generateDemoEd25519Keypair();
      setPrivateKey(keypair.seed);
      setPublicKey(keypair.publicKey);
    } catch (cause) {
      setCredentialError(
        cause instanceof Error
          ? cause.message
          : 'Unable to generate ED25519 key.',
      );
    } finally {
      setPendingCredential(null);
    }
  }

  async function registerEd25519(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sdk || validateBase64Url32(publicKey) || !ed25519Name.trim()) return;
    setPendingCredential('register-ed25519');
    setCredentialError('');

    try {
      await sdk.ed25519.register({
        name: ed25519Name.trim(),
        public_key: publicKey.trim(),
      });
      await loadMe();
    } catch (cause) {
      setCredentialError(
        cause instanceof Error
          ? cause.message
          : 'Unable to register ED25519 key.',
      );
    } finally {
      setPendingCredential(null);
    }
  }

  async function deleteCredential(path: string) {
    if (!session.accessToken || !window.confirm('Remove this credential?'))
      return;
    setPendingCredential(path);
    setCredentialError('');

    try {
      const response = await fetch(
        new URL(path, config.resolvedServerBaseUrl),
        {
          method: 'DELETE',
          headers: { authorization: 'Bearer ' + session.accessToken },
        },
      );
      if (!response.ok) {
        throw new Error('Delete failed.');
      }
      await loadMe();
    } catch (cause) {
      setCredentialError(
        cause instanceof Error ? cause.message : 'Unable to delete credential.',
      );
    } finally {
      setPendingCredential(null);
    }
  }

  async function kickSession(sessionId: string) {
    if (pendingSessionId !== null) {
      return;
    }

    if (!sdk || !session.accessToken || config.status !== 'ready') {
      setSessionError('Unable to kick session.');
      return;
    }

    setSessionError('');
    setPendingSessionId(sessionId);

    try {
      let accessToken = session.accessToken;
      const capability = getSessionCapability(accessToken);

      if (capability === 'legacy-token' && session.refreshToken) {
        const refreshed = await sdk.session.refresh();
        if (typeof refreshed.accessToken === 'string') {
          accessToken = refreshed.accessToken;
        }
      }

      if (getSessionCapability(accessToken) !== 'manageable') {
        throw new Error('Unable to kick session.');
      }

      const response = await fetch(
        new URL(
          '/session/' + sessionId + '/logout',
          config.resolvedServerBaseUrl,
        ),
        {
          method: 'POST',
          headers: { authorization: 'Bearer ' + accessToken },
        },
      );

      if (!response.ok) {
        throw new Error('Unable to kick session.');
      }

      await loadMe({
        warningMessage:
          'Session updated, but account data could not be refreshed.',
      });
    } catch {
      setSessionError('Unable to kick session.');
    } finally {
      setPendingSessionId(null);
    }
  }

  const passkeys = me?.webauthn_credentials ?? [];
  const ed25519Credentials = me?.ed25519_credentials ?? [];
  const activeSessions = (me?.active_sessions ?? []) as ActiveSession[];

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your current authentication state.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-slate-700">
          <div>
            User ID:{' '}
            <span className="font-mono">{me?.user_id ?? 'Loading...'}</span>
          </div>
          <div>Email: {me?.email ?? 'No verified email'}</div>
          <div>
            Session ID: <span className="font-mono">{session.sessionId}</span>
          </div>
          {loadingMe ? (
            <p className="text-slate-600">Loading account...</p>
          ) : null}
          {meError ? <p className="text-rose-600">{meError}</p> : null}
          {meWarning ? <p className="text-amber-700">{meWarning}</p> : null}
        </CardContent>
      </Card>

      {credentialError ? (
        <p className="text-sm text-rose-600">{credentialError}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
          <CardDescription>
            Email OTP sign-in is managed from the login page.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
          {me?.email
            ? 'Verified email is active.'
            : 'No verified email on this account.'}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PassKey</CardTitle>
          <CardDescription>
            Register browser passkeys and remove old authenticators.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            disabled={pendingCredential !== null}
            onClick={() => void registerPasskey()}
          >
            {pendingCredential === 'passkey'
              ? 'Registering...'
              : 'Register passkey'}
          </Button>
          <CredentialList
            deletePath={(id) => '/webauthn/credentials/' + id}
            idKey="credential_id"
            items={passkeys}
            onDelete={deleteCredential}
            pending={pendingCredential}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ED25519</CardTitle>
          <CardDescription>
            Generate a key, save the private key, then register the public key.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-3" onSubmit={registerEd25519}>
            <Input
              value={ed25519Name}
              onChange={(event) => setEd25519Name(event.currentTarget.value)}
            />
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                disabled={pendingCredential !== null}
                onClick={() => void generateEd25519()}
              >
                {pendingCredential === 'generate-ed25519'
                  ? 'Generating...'
                  : 'Generate key'}
              </Button>
              <Button
                type="submit"
                disabled={
                  !publicKey ||
                  Boolean(validateBase64Url32(publicKey)) ||
                  pendingCredential !== null
                }
              >
                {pendingCredential === 'register-ed25519'
                  ? 'Registering...'
                  : 'Register public key'}
              </Button>
            </div>
            {privateKey ? (
              <textarea
                readOnly
                className="min-h-20 rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-sm"
                value={privateKey}
              />
            ) : null}
            <Input
              aria-label="ED25519 public key"
              placeholder="Public key"
              value={publicKey}
              onChange={(event) => setPublicKey(event.currentTarget.value)}
            />
          </form>
          <CredentialList
            deletePath={(id) => '/ed25519/credentials/' + id}
            idKey="id"
            items={ed25519Credentials}
            onDelete={deleteCredential}
            pending={pendingCredential}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>
            Review every active session and kick peers as needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessionError ? (
            <p className="mb-4 text-sm text-rose-600">
              Unable to kick session.
            </p>
          ) : null}
          {meError ? null : activeSessions.length === 0 ? (
            <p className="text-sm text-slate-600">No active sessions.</p>
          ) : (
            <ActiveSessionsTable
              onKick={kickSession}
              pendingSessionId={pendingSessionId}
              rows={activeSessions}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CredentialList({
  deletePath,
  idKey,
  items,
  onDelete,
  pending,
}: {
  deletePath: (id: string) => string;
  idKey: string;
  items: Array<Record<string, unknown>>;
  onDelete: (path: string) => Promise<void>;
  pending: string | null;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-600">No credentials.</p>;
  }

  return (
    <div className="divide-y divide-slate-200 rounded-md border border-slate-200">
      {items.map((item) => {
        const id = String(item[idKey] ?? item.id ?? '');
        const path = deletePath(id);

        return (
          <div
            key={id}
            className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"
          >
            <div className="min-w-0">
              <div className="truncate font-mono text-slate-900">{id}</div>
              <div className="text-slate-500">
                Created {String(item.created_at ?? '')}
              </div>
            </div>
            <Button
              className="bg-white text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50"
              disabled={pending === path}
              onClick={() => void onDelete(path)}
            >
              Remove
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function ActiveSessionsTable({
  onKick,
  pendingSessionId,
  rows,
}: {
  onKick: (sessionId: string) => Promise<void>;
  pendingSessionId: string | null;
  rows: ActiveSession[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-600">
            <th className="px-3 py-2 font-medium">Session ID</th>
            <th className="px-3 py-2 font-medium">Auth Method</th>
            <th className="px-3 py-2 font-medium">Created At</th>
            <th className="px-3 py-2 font-medium">Expires At</th>
            <th className="px-3 py-2 font-medium">IP</th>
            <th className="px-3 py-2 font-medium">User-Agent</th>
            <th className="px-3 py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((activeSession) => {
            const isPending = pendingSessionId === activeSession.id;

            return (
              <tr
                key={activeSession.id}
                className="border-b border-slate-200 last:border-b-0"
              >
                <td className="px-3 py-2 font-mono text-xs text-slate-950">
                  {activeSession.id}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-slate-950">
                  {activeSession.auth_method}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-slate-950">
                  {activeSession.created_at}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-slate-950">
                  {activeSession.expires_at}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-slate-950">
                  {formatNullable(activeSession.ip)}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-slate-950">
                  {truncateUserAgent(activeSession.user_agent)}
                </td>
                <td className="px-3 py-2">
                  <Button
                    disabled={isPending}
                    onClick={() => void onKick(activeSession.id)}
                  >
                    {isPending ? 'Kicking...' : 'Kick'}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
