import { useI18n } from '@/lib/i18n';

export function LanguageSelect() {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <span>{t('common.language')}</span>
      <select
        aria-label={t('common.language')}
        className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
        value={locale}
        onChange={(event) => setLocale(event.target.value as typeof locale)}
      >
        <option value="en">{t('common.english')}</option>
        <option value="zh-CN">{t('common.chinese')}</option>
      </select>
    </label>
  );
}
