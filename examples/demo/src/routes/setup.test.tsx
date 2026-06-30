import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DemoProvider } from '@/app/providers/demo-provider';
import { SetupRoute } from './setup';

const apiMocks = vi.hoisted(() => ({
  createApiSdk: vi.fn(),
  update: vi.fn(),
}));

vi.mock('auth-mini/sdk/api', () => ({
  createApiSdk: apiMocks.createApiSdk,
}));

apiMocks.createApiSdk.mockImplementation(() => ({
  admin: {
    setup: {
      update: apiMocks.update,
    },
  },
}));

const DEFAULT_SERVER_BASE_URL = 'https://demo.example.com/';

describe('SetupRoute', () => {
  beforeEach(() => {
    apiMocks.createApiSdk.mockClear();
    apiMocks.update.mockReset();
  });

  it('renders setup controls without smtp or origin CLI commands', () => {
    const { container } = renderSetupRoute();

    expect(
      screen.queryByLabelText('Auth server origin'),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Issuer')).toHaveValue(
      DEFAULT_SERVER_BASE_URL,
    );
    expect(screen.getByLabelText('Allowed page origin')).toHaveValue(
      'https://demo.example.com',
    );
    expect(screen.getByText('API base')).toBeInTheDocument();
    expect(screen.getByText('..')).toBeInTheDocument();
    expect(screen.getByLabelText('SMTP host')).toBeInTheDocument();
    expect(container.querySelectorAll('code')).toHaveLength(0);
    expect(screen.queryByText(/auth-mini smtp/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/auth-mini origin/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/--issuer/i)).not.toBeInTheDocument();
  });

  it('submits admin setup through the API', async () => {
    apiMocks.update.mockResolvedValueOnce({
      data: {
        issuer: DEFAULT_SERVER_BASE_URL,
        admin_user_id: 'admin-1',
        admin_ed25519: {
          id: '00000000-0000-4000-8000-000000000000',
          name: 'Admin key',
          public_key: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          last_used_at: null,
          created_at: '2026-06-30T00:00:00Z',
        },
        origins: [
          {
            id: 1,
            origin: 'https://demo.example.com',
            created_at: '2026-06-30T00:00:00Z',
          },
        ],
        smtp: {
          id: 1,
          host: 'smtp.example.com',
          port: 587,
          username: 'mailer',
          from_email: 'noreply@example.com',
          from_name: 'Auth Mini',
          secure: true,
          is_active: true,
          weight: 1,
        },
      },
    });
    renderSetupRoute();
    const user = userEvent.setup();

    await user.type(
      screen.getByLabelText('Admin Ed25519 public key'),
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    );
    await user.type(screen.getByLabelText('SMTP host'), 'smtp.example.com');
    await user.type(screen.getByLabelText('SMTP username'), 'mailer');
    await user.type(screen.getByLabelText('SMTP password'), 'secret');
    await user.type(screen.getByLabelText('From email'), 'noreply@example.com');
    await user.click(screen.getByLabelText('Use TLS'));
    await user.click(screen.getByRole('button', { name: 'Save setup' }));

    await waitFor(() => {
      expect(apiMocks.update).toHaveBeenCalledWith({
        body: {
          issuer: DEFAULT_SERVER_BASE_URL,
          origin: 'https://demo.example.com',
          admin_ed25519: {
            name: 'Admin key',
            public_key: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          },
          smtp: {
            host: 'smtp.example.com',
            port: 587,
            username: 'mailer',
            password: 'secret',
            from_email: 'noreply@example.com',
            from_name: 'Auth Mini',
            secure: true,
            weight: 1,
          },
        },
        throwOnError: true,
      });
    });
    expect(apiMocks.createApiSdk).toHaveBeenCalledWith({
      baseUrl: DEFAULT_SERVER_BASE_URL,
    });
    expect(screen.getByText('Setup saved')).toBeInTheDocument();
    expect(screen.getByLabelText('Issuer')).toHaveValue(
      DEFAULT_SERVER_BASE_URL,
    );
    expect(screen.getByText(DEFAULT_SERVER_BASE_URL)).toBeInTheDocument();
    expect(screen.getByText('Admin key')).toBeInTheDocument();
    expect(screen.getByText('smtp.example.com')).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('submits setup without smtp when smtp host is blank', async () => {
    apiMocks.update.mockResolvedValueOnce({
      data: {
        issuer: DEFAULT_SERVER_BASE_URL,
        admin_user_id: null,
        admin_ed25519: null,
        origins: [
          {
            id: 1,
            origin: 'https://demo.example.com',
            created_at: '2026-06-30T00:00:00Z',
          },
        ],
        smtp: null,
      },
    });
    renderSetupRoute();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Save setup' }));

    await waitFor(() => {
      expect(apiMocks.update).toHaveBeenCalledWith({
        body: {
          issuer: DEFAULT_SERVER_BASE_URL,
          origin: 'https://demo.example.com',
          admin_ed25519: undefined,
          smtp: undefined,
        },
        throwOnError: true,
      });
    });
    expect(screen.getAllByText('Not configured')).toHaveLength(2);
  });
});

function renderSetupRoute() {
  return render(
    <MemoryRouter initialEntries={['/setup']}>
      <DemoProvider
        initialLocation={{
          hash: '#/setup',
          href: 'https://demo.example.com/web/#/setup',
          search: '',
          origin: 'https://demo.example.com',
        }}
      >
        <Routes>
          <Route path="/setup" element={<SetupRoute />} />
        </Routes>
      </DemoProvider>
    </MemoryRouter>,
  );
}
