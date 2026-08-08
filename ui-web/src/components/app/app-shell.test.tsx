import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/lib/i18n';
import { AppShell } from './app-shell';

vi.mock('@/app/providers/demo-provider', () => ({
  useDemo: () => ({
    clearLocalAuthState: vi.fn(),
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
  it('uses the configured brand as the home link', async () => {
    const user = userEvent.setup();
    renderShell();

    const brandLink = screen.getByRole('link', { name: 'Example Auth' });
    expect(brandLink).toHaveAttribute('href', '/');

    await user.click(brandLink);

    expect(screen.getByText('Home page')).toBeInTheDocument();
  });
});
