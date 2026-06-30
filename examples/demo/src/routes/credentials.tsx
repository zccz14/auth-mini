import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useDemo } from '@/app/providers/demo-provider';
import { generateDemoEd25519Keypair, validateBase64Url32 } from '@/lib/demo-ed25519';

type Me = Awaited<ReturnType<NonNullable<ReturnType<typeof useDemo>['sdk']>['me']['fetch']>>;

export function CredentialsRoute() {
  const { config, sdk, session } = useDemo();
  const [me, setMe] = useState<Me | null>(null);
  const [name, setName] = useState('ED25519 key');
  const [privateKey, setPrivateKey] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadMe = useCallback(async () => {
    if (!sdk || !session.authenticated) return;
    setMe(await sdk.me.fetch());
  }, [sdk, session.authenticated, session.sessionId]);

  useEffect(() => {
    void loadMe().catch((cause) => {
      setError(cause instanceof Error ? cause.message : 'Unable to load credentials.');
    });
  }, [loadMe]);

  async function registerPasskey() {
    if (!sdk) return;
    setPending('passkey');
    setError('');

    try {
      await sdk.passkey.register();
      await loadMe();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to register passkey.');
    } finally {
      setPending(null);
    }
  }

  async function generateEd25519() {
    setPending('generate-ed25519');
    setError('');

    try {
      const keypair = await generateDemoEd25519Keypair();
      setPrivateKey(keypair.seed);
      setPublicKey(keypair.publicKey);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to generate ED25519 key.');
    } finally {
      setPending(null);
    }
  }

  async function registerEd25519(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sdk || validateBase64Url32(publicKey) || !name.trim()) return;
    setPending('register-ed25519');
    setError('');

    try {
      await sdk.ed25519.register({ name: name.trim(), public_key: publicKey.trim() });
      await loadMe();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to register ED25519 key.');
    } finally {
      setPending(null);
    }
  }

  async function deleteCredential(path: string) {
    if (!session.accessToken || !window.confirm('Remove this credential?')) return;
    setPending(path);
    setError('');

    try {
      const response = await fetch(new URL(path, config.resolvedServerBaseUrl), {
        method: 'DELETE',
        headers: { authorization: 'Bearer ' + session.accessToken },
      });
      if (!response.ok) {
        throw new Error('Delete failed.');
      }
      await loadMe();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to delete credential.');
    } finally {
      setPending(null);
    }
  }

  const passkeys = me?.webauthn_credentials ?? [];
  const ed25519Credentials = me?.ed25519_credentials ?? [];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="rounded-lg lg:col-span-2">
        <CardHeader>
          <CardTitle>Credentials</CardTitle>
          <CardDescription>Manage the credentials attached to your account.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-slate-700">
          <div>User ID: <span className="font-mono">{me?.user_id ?? 'Loading...'}</span></div>
          <div>Email: {me?.email ?? 'No email credential'}</div>
          {error ? <p className="text-rose-600">{error}</p> : null}
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Email</CardTitle>
          <CardDescription>Email OTP sign-in is managed from the login page.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
          {me?.email ? 'Verified email is active.' : 'No verified email on this account.'}
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Passkeys</CardTitle>
          <CardDescription>Register browser passkeys and remove old authenticators.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button disabled={pending !== null} onClick={() => void registerPasskey()}>
            {pending === 'passkey' ? 'Registering...' : 'Register passkey'}
          </Button>
          <CredentialList
            items={passkeys}
            idKey="credential_id"
            deletePath={(id) => '/webauthn/credentials/' + id}
            pending={pending}
            onDelete={deleteCredential}
          />
        </CardContent>
      </Card>

      <Card className="rounded-lg lg:col-span-2">
        <CardHeader>
          <CardTitle>ED25519</CardTitle>
          <CardDescription>Generate a key, save the private key, then register the public key.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-3" onSubmit={registerEd25519}>
            <Input value={name} onChange={(event) => setName(event.currentTarget.value)} />
            <div className="flex flex-wrap gap-3">
              <Button type="button" disabled={pending !== null} onClick={() => void generateEd25519()}>
                {pending === 'generate-ed25519' ? 'Generating...' : 'Generate key'}
              </Button>
              <Button
                type="submit"
                disabled={!publicKey || Boolean(validateBase64Url32(publicKey)) || pending !== null}
              >
                {pending === 'register-ed25519' ? 'Registering...' : 'Register public key'}
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
            items={ed25519Credentials}
            idKey="id"
            deletePath={(id) => '/ed25519/credentials/' + id}
            pending={pending}
            onDelete={deleteCredential}
          />
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
          <div key={id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
            <div className="min-w-0">
              <div className="truncate font-mono text-slate-900">{id}</div>
              <div className="text-slate-500">Created {String(item.created_at ?? '')}</div>
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
