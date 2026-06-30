import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDemo } from '@/app/providers/demo-provider';
import {
  deriveEd25519PublicKey,
  signEd25519Challenge,
  validateBase64Url32,
} from '@/lib/demo-ed25519';

export function LoginRoute() {
  const { adoptDemoSession, sdk } = useDemo();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [seed, setSeed] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function startEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sdk) return;
    setPending('email-start');
    setError('');
    setMessage('');

    try {
      await sdk.email.start({ email: email.trim() });
      setMessage('Code sent.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send code.');
    } finally {
      setPending(null);
    }
  }

  async function verifyEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sdk) return;
    setPending('email-verify');
    setError('');

    try {
      await sdk.email.verify({ email: email.trim(), code: code.trim() });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to verify code.',
      );
    } finally {
      setPending(null);
    }
  }

  async function passkeyLogin() {
    if (!sdk) return;
    setPending('passkey');
    setError('');

    try {
      await sdk.passkey.authenticate();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Passkey sign-in failed.',
      );
    } finally {
      setPending(null);
    }
  }

  async function ed25519Login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sdk || validateBase64Url32(seed)) return;
    setPending('ed25519');
    setError('');

    try {
      const publicKey = await deriveEd25519PublicKey(seed.trim());
      const challenge = await sdk.ed25519.start({ public_key: publicKey });
      const signature = await signEd25519Challenge(
        seed.trim(),
        challenge.challenge,
      );
      const tokens = await sdk.ed25519.verify({
        request_id: challenge.request_id,
        signature,
      });
      await adoptDemoSession(tokens);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'ED25519 sign-in failed.',
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Use an account credential to access auth-mini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="passkey">Passkey</TabsTrigger>
              <TabsTrigger value="ed25519">ED25519</TabsTrigger>
            </TabsList>
            <TabsContent value="email" className="space-y-4">
              <form className="space-y-3" onSubmit={startEmail}>
                <Input
                  aria-label="Email address"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.currentTarget.value)}
                />
                <Button
                  type="submit"
                  disabled={!email.trim() || pending !== null}
                >
                  {pending === 'email-start' ? 'Sending...' : 'Send code'}
                </Button>
              </form>
              <form className="space-y-3" onSubmit={verifyEmail}>
                <Input
                  aria-label="One-time code"
                  placeholder="123456"
                  value={code}
                  onChange={(event) => setCode(event.currentTarget.value)}
                />
                <Button
                  type="submit"
                  disabled={!email.trim() || !code.trim() || pending !== null}
                >
                  {pending === 'email-verify' ? 'Verifying...' : 'Verify code'}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="passkey" className="space-y-4">
              <Button
                disabled={pending !== null}
                onClick={() => void passkeyLogin()}
              >
                {pending === 'passkey'
                  ? 'Signing in...'
                  : 'Sign in with passkey'}
              </Button>
            </TabsContent>
            <TabsContent value="ed25519" className="space-y-4">
              <form className="space-y-3" onSubmit={ed25519Login}>
                <Input
                  aria-label="Private key"
                  placeholder="Base64url private key"
                  value={seed}
                  onChange={(event) => setSeed(event.currentTarget.value)}
                />
                <Button
                  type="submit"
                  disabled={
                    Boolean(validateBase64Url32(seed)) || pending !== null
                  }
                >
                  {pending === 'ed25519'
                    ? 'Signing in...'
                    : 'Sign in with ED25519'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {message ? (
            <p className="mt-4 text-sm text-emerald-700">{message}</p>
          ) : null}
          {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
