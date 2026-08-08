import { useI18n } from '@/lib/i18n';

function LanguageIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

export function LanguageSelect() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 focus-within:ring-2 focus-within:ring-slate-950 focus-within:ring-offset-2">
      <LanguageIcon />
      <select
        aria-label={t('common.language')}
        className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
        title={t('common.language')}
        value={locale}
        onChange={(event) => setLocale(event.target.value as typeof locale)}
      >
        <option value="en">{t('common.english')}</option>
        <option value="zh-CN">{t('common.chinese')}</option>
      </select>
    </div>
  );
}
