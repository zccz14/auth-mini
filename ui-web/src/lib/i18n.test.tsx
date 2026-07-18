import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { LanguageSelect } from '@/components/app/language-select';
import { en, I18nProvider, useI18n, zhCN } from '@/lib/i18n';

function TranslationProbe() {
  const { t } = useI18n();
  return <p>{t('login.title')}</p>;
}

afterEach(() => {
  localStorage.clear();
  document.documentElement.lang = 'en';
});

describe('GUI i18n', () => {
  it('keeps every locale dictionary complete', () => {
    expect(Object.keys(zhCN).sort()).toEqual(Object.keys(en).sort());
    expect(Object.values(zhCN).every((value) => value.trim() !== '')).toBe(
      true,
    );
  });

  it('switches the visible language control immediately and persists the choice', async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <LanguageSelect />
        <TranslationProbe />
      </I18nProvider>,
    );

    expect(screen.getByText('Sign in')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Language'), 'zh-CN');

    expect(screen.getByText('登录')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('zh-CN');
    expect(localStorage.getItem('auth-mini.gui.locale')).toBe('zh-CN');
  });
});
