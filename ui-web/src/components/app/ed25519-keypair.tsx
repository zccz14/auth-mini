import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';

type Ed25519KeypairProps = {
  publicKey: string;
  privateKey: string;
};

export function Ed25519Keypair({ publicKey, privateKey }: Ed25519KeypairProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState<'public' | 'private' | null>(null);

  async function copy(kind: 'public' | 'private', value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
  }

  return (
    <div className="grid gap-4 rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            className="font-medium text-slate-950"
            htmlFor="ed25519-public-key"
          >
            {t('common.ed25519PublicKey')}
          </label>
          <Button
            type="button"
            className="min-h-9 bg-white text-slate-900 ring-1 ring-slate-300 hover:bg-slate-100"
            onClick={() => void copy('public', publicKey)}
          >
            {copied === 'public'
              ? t('common.copied')
              : t('common.copyPublicKey')}
          </Button>
        </div>
        <p className="text-sm text-slate-600">{t('common.publicKeyHint')}</p>
        <textarea
          id="ed25519-public-key"
          readOnly
          className="min-h-20 w-full rounded-md border border-slate-200 bg-white p-3 font-mono text-sm text-slate-900"
          value={publicKey}
        />
      </div>

      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            className="font-medium text-slate-950"
            htmlFor="ed25519-private-key"
          >
            {t('common.ed25519PrivateKey')}
          </label>
          <Button
            type="button"
            className="min-h-9 bg-white text-slate-900 ring-1 ring-slate-300 hover:bg-slate-100"
            onClick={() => void copy('private', privateKey)}
          >
            {copied === 'private'
              ? t('common.copied')
              : t('common.copyPrivateKey')}
          </Button>
        </div>
        <p className="text-sm text-rose-700">{t('common.privateKeyWarning')}</p>
        <textarea
          id="ed25519-private-key"
          readOnly
          className="min-h-20 w-full rounded-md border border-rose-200 bg-white p-3 font-mono text-sm text-slate-900"
          value={privateKey}
        />
      </div>
    </div>
  );
}
