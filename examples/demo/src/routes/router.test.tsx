import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppRouter } from '../app/router';
import { AUTH_ORIGIN_KEY } from '@/lib/demo-storage';

const hasExactText = (value: string) => (_: string, node: Element | null) =>
  node?.textContent === value;

describe('AppRouter', () => {
  it('renders top-level nav entries for the app shell', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Setup' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Email' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Passkey' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Session' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Minimal Self-Hosted Auth Server for your Apps',
      }),
    ).toBeInTheDocument();
  });

  it('renders the setup route with an auth origin form', () => {
    render(
      <MemoryRouter initialEntries={['/setup']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Auth server origin')).toBeInTheDocument();
    expect(screen.getByText('Page origin')).toBeInTheDocument();
    expect(screen.getByText('Startup commands')).toBeInTheDocument();
    expect(
      screen.getByText(/only need this page when you want to self-host/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/official demo backend already works by default/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'npx auth-mini origin add ./auth-mini.sqlite --value http://localhost:3000',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'npx auth-mini start ./auth-mini.sqlite --issuer https://auth.zccz14.com',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        hasExactText(
          "npx auth-mini smtp add ./auth-mini.sqlite  --from-email 'sample@your-domain.com' --from-name 'sample-name' --host 'smtp.sample.com' --port 465 --secure --username 'sample@your-domain.com' --password '<smtp-password>'",
        ),
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/npm --prefix examples\/demo run dev/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/npx auth-mini start .*--host\s/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/npx auth-mini start .*--port\s/i),
    ).not.toBeInTheDocument();
  });

  it('lets setup save an auth origin into app state', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/setup']}>
        <AppRouter />
      </MemoryRouter>,
    );

    const input = screen.getByLabelText('Auth server origin');
    await user.clear(input);
    await user.type(input, 'https://auth.example.com');
    await user.click(screen.getByRole('button', { name: 'Save origin' }));

    expect(
      await screen.findByText('Connected to https://auth.example.com'),
    ).toBeInTheDocument();
    expect(localStorage.getItem(AUTH_ORIGIN_KEY)).toBe('https://auth.example.com');
  });
});
