import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/lib/i18n';
import { DirectoryTokenCard } from './directory-token-card';

const directoryToken = { status: vi.fn(), rotate: vi.fn(), revoke: vi.fn() };
const sdk = { admin: { directoryToken } };
vi.mock('@/app/providers/app-provider', () => ({
  useApp: () => ({ sdk }),
}));

beforeEach(() => {
  directoryToken.status.mockResolvedValue({
    configured: false,
    created_at: null,
  });
  directoryToken.rotate.mockResolvedValue({ token: 'am_uid_test-secret' });
  directoryToken.revoke.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('directory token administration', () => {
  it('shows the generated token once and clears it on dismissal and revocation', async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <DirectoryTokenCard />
      </I18nProvider>,
    );
    const generate = screen.getByRole('button', { name: 'Generate token' });
    await waitFor(() => expect(generate).toBeEnabled());
    expect(
      screen.queryByLabelText('Generated directory token'),
    ).not.toBeInTheDocument();
    await user.click(generate);
    expect(
      await screen.findByLabelText('Generated directory token'),
    ).toHaveValue('am_uid_test-secret');
    expect(localStorage.getItem('directory-token')).toBeNull();
    await user.click(
      screen.getByRole('button', { name: 'I have saved the token' }),
    );
    expect(
      screen.queryByLabelText('Generated directory token'),
    ).not.toBeInTheDocument();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: 'Replace token' }));
    expect(
      await screen.findByLabelText('Generated directory token'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Revoke token' }));
    await waitFor(() =>
      expect(
        screen.queryByLabelText('Generated directory token'),
      ).not.toBeInTheDocument(),
    );
    expect(directoryToken.revoke).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('button', { name: 'Generate token' }),
    ).toBeEnabled();
  });

  it('requires confirmation before replacing an existing token', async () => {
    directoryToken.status.mockResolvedValue({
      configured: true,
      created_at: '2026-09-19',
    });
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <DirectoryTokenCard />
      </I18nProvider>,
    );
    await user.click(
      await screen.findByRole('button', { name: 'Replace token' }),
    );
    expect(directoryToken.rotate).not.toHaveBeenCalled();
  });

  it('surfaces failed loads without enabling token management', async () => {
    directoryToken.status.mockRejectedValue(new Error('unavailable'));
    render(
      <I18nProvider>
        <DirectoryTokenCard />
      </I18nProvider>,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to update',
    );
    expect(
      screen.getByRole('button', { name: 'Generate token' }),
    ).toBeDisabled();
  });
});
