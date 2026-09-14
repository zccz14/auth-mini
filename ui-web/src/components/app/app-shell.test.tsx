import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/lib/i18n';
import { AppShell } from './app-shell';

const auth = vi.hoisted(() => ({ isReady: true, signOut: vi.fn() }));

vi.mock('auth-mini-react-components', () => ({
  useAuthMini: () => auth,
}));

vi.mock('@/app/providers/app-provider', () => ({
  useApp: () => ({
    session: {
      accessToken: 'eyJhbGciOiJub25lIn0.eyJhdXRoX2FkbWluIjp0cnVlfQ.',
      authenticated: true,
    },
    setupError: '',
    setupLoading: false,
    setupState: {
      admin_user_id: 'admin-user',
      brand_name: 'Example Auth',
    },
  }),
}));

function renderShell() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<p>Home page</p>} />
            <Route path="/admin" element={<p>Admin page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('AppShell', () => {
  beforeEach(() => {
    auth.isReady = true;
  });

  it('waits for the shared session to recover before rendering protected routes', () => {
    auth.isReady = false;
    renderShell();
    expect(screen.getByText('Loading auth-mini...')).toBeInTheDocument();
    expect(screen.queryByText('Admin page')).not.toBeInTheDocument();
  });

  it('uses the configured brand as the home link', async () => {
    const user = userEvent.setup();
    renderShell();

    const brandLink = screen.getByRole('link', { name: 'Example Auth' });
    expect(brandLink).toHaveAttribute('href', '/');
    expect(
      screen.getByRole('img', { name: 'Example Auth logo' }),
    ).toHaveAttribute('src', '/auth-mini-logo.png');

    await user.click(brandLink);

    expect(screen.getByText('Home page')).toBeInTheDocument();
  });
});
