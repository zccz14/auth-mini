import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DemoProvider } from '@/app/providers/demo-provider';
import { SetupRoute } from './setup';

const apiMocks = vi.hoisted(() => ({
  update: vi.fn(),
}));

vi.mock('auth-mini/sdk/api', () => ({
  createApiSdk: vi.fn(() => ({
    admin: {
      setup: {
        update: apiMocks.update,
      },
    },
  })),
}));

describe('SetupRoute', () => {
  it('renders setup controls without smtp or origin CLI commands', () => {
    const { container } = renderSetupRoute();

    expect(screen.getByLabelText('Auth server origin')).toBeInTheDocument();
    expect(screen.getByLabelText('Allowed page origin')).toHaveValue(
      'https://demo.example.com',
    );
    expect(screen.getByLabelText('SMTP host')).toBeInTheDocument();
    expect(container.querySelectorAll('code')).toHaveLength(0);
    expect(screen.queryByText(/auth-mini smtp/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/auth-mini origin/i)).not.toBeInTheDocument();
  });

  it('submits admin setup through the API', async () => {
    apiMocks.update.mockResolvedValueOnce({
      data: {
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

    await user.type(screen.getByLabelText('SMTP host'), 'smtp.example.com');
    await user.type(screen.getByLabelText('SMTP username'), 'mailer');
    await user.type(screen.getByLabelText('SMTP password'), 'secret');
    await user.type(screen.getByLabelText('From email'), 'noreply@example.com');
    await user.click(screen.getByLabelText('Use TLS'));
    await user.click(screen.getByRole('button', { name: 'Save setup' }));

    await waitFor(() => {
      expect(apiMocks.update).toHaveBeenCalledWith({
        body: {
          origin: 'https://demo.example.com',
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
    expect(screen.getByText('Setup saved')).toBeInTheDocument();
    expect(screen.getByText('smtp.example.com')).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });
});

function renderSetupRoute() {
  return render(
    <MemoryRouter initialEntries={['/setup']}>
      <DemoProvider
        initialLocation={{
          hash: '#/setup',
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
