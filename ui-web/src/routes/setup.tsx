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
import { useDemo } from '@/app/providers/demo-provider';
import { generateDemoEd25519Keypair } from '@/lib/demo-ed25519';
import { useI18n } from '@/lib/i18n';

export function SetupRoute() {
  const { reloadSetupState, sdk } = useDemo();
  const { t } = useI18n();
  const [name, setName] = useState(() => t('setup.defaultCredentialName'));
  const [privateKey, setPrivateKey] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState<'generate' | 'initialize' | null>(
    null,
  );
  const [error, setError] = useState('');

  async function generateKey() {
    setPending('generate');
    setError('');

    try {
      const keypair = await generateDemoEd25519Keypair();
      setPrivateKey(keypair.seed);
      setPublicKey(keypair.publicKey);
      setSaved(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t('setup.generateError'),
      );
    } finally {
      setPending(null);
    }
  }

  async function initialize(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sdk || !saved || !publicKey || !name.trim()) {
      return;
    }

    setPending('initialize');
    setError('');

    try {
      await sdk.admin.setup.initialize({
        admin_ed25519: {
          name: name.trim(),
          public_key: publicKey,
        },
      });
      await reloadSetupState();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t('setup.initializeError'),
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>{t('setup.title')}</CardTitle>
          <CardDescription>{t('setup.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={initialize}>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              <span>{t('common.credentialName')}</span>
              <Input
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                disabled={pending !== null}
                onClick={() => void generateKey()}
              >
                {pending === 'generate'
                  ? t('setup.generating')
                  : t('setup.generate')}
              </Button>
            </div>

            {privateKey ? (
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>{t('common.privateKey')}</span>
                  <textarea
                    readOnly
                    className="min-h-24 rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-sm text-slate-900"
                    value={privateKey}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>{t('common.publicKey')}</span>
                  <Input readOnly value={publicKey} />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={saved}
                    onChange={(event) => setSaved(event.currentTarget.checked)}
                  />
                  {t('setup.privateKeySaved')}
                </label>
              </div>
            ) : null}

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}

            <Button
              type="submit"
              disabled={
                !saved || !publicKey || pending !== null || !name.trim()
              }
            >
              {pending === 'initialize'
                ? t('setup.initializing')
                : t('setup.complete')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
