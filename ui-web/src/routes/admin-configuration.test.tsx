import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/lib/i18n';
import { AdminConfigurationRoute } from './admin-configuration';

const sdk = {
  admin: {
    config: { fetch: vi.fn(), save: vi.fn() },
  },
};
const reloadSetupState = vi.fn();

vi.mock('@/app/providers/app-provider', () => ({
  useApp: () => ({ sdk, reloadSetupState }),
}));

function settings() {
  return {
    admin_ed25519: null,
    admin_user_id: 'admin-user',
    brand_background_image: '',
    brand_name: 'auth-mini',
    issuer: 'https://auth.example.com',
    rp_id: 'auth.example.com',
    smtp: [
      {
        id: 1,
        host: 'smtp-a.example.com',
        port: 587,
        username: 'mailer-a',
        from_email: 'a@example.com',
        from_name: 'A',
        secure: true,
        is_active: true,
        weight: 2,
      },
      {
        id: 2,
        host: 'smtp-b.example.com',
        port: 2525,
        username: 'mailer-b',
        from_email: 'b@example.com',
        from_name: 'B',
        secure: false,
        is_active: true,
        weight: 1,
      },
    ],
  };
}

function renderRoute(ui: ReactNode) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('admin configuration form', () => {
  it('labels every input and supports adding and removing SMTP servers', async () => {
    sdk.admin.config.fetch.mockResolvedValue(settings());
    sdk.admin.config.save.mockResolvedValue(settings());
    const user = userEvent.setup();

    renderRoute(<AdminConfigurationRoute />);

    expect(await screen.findByLabelText('Brand name')).toHaveValue('auth-mini');
    expect(screen.getAllByLabelText('SMTP host')).toHaveLength(2);
    expect(screen.getAllByLabelText('SMTP port')).toHaveLength(2);
    expect(screen.getAllByLabelText('SMTP username')).toHaveLength(2);
    expect(screen.getAllByLabelText('SMTP password')).toHaveLength(2);
    expect(screen.getAllByLabelText('From email')).toHaveLength(2);
    expect(screen.getAllByLabelText('From name')).toHaveLength(2);
    expect(screen.getAllByLabelText('Delivery weight')).toHaveLength(2);
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Add SMTP server' }));
    expect(screen.getAllByLabelText('SMTP host')).toHaveLength(3);

    await user.click(
      screen.getAllByRole('button', { name: 'Remove SMTP server' })[2],
    );
    expect(screen.getAllByLabelText('SMTP host')).toHaveLength(2);

    await user.click(
      screen.getByRole('button', { name: 'Save configuration' }),
    );
    await waitFor(() =>
      expect(sdk.admin.config.save).toHaveBeenCalledWith({
        issuer: 'https://auth.example.com',
        rp_id: 'auth.example.com',
        brand_name: 'auth-mini',
        brand_background_image: '',
        smtp: [
          {
            id: 1,
            host: 'smtp-a.example.com',
            port: 587,
            username: 'mailer-a',
            password: '',
            from_email: 'a@example.com',
            from_name: 'A',
            secure: true,
            weight: 2,
          },
          {
            id: 2,
            host: 'smtp-b.example.com',
            port: 2525,
            username: 'mailer-b',
            password: '',
            from_email: 'b@example.com',
            from_name: 'B',
            secure: false,
            weight: 1,
          },
        ],
      }),
    );
  });
});
