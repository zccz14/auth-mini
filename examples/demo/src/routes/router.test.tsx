import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppRouter } from '../app/router';
import { AUTH_ORIGIN_KEY } from '@/lib/demo-storage';

describe('AppRouter', () => {
  it('renders top-level nav entries for the app shell', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Setup' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Credentials' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Email' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ED25519' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Passkey' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Session' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Minimal Self-Hosted Auth Server for your Apps',
      }),
    ).toBeInTheDocument();
  });

  it('renders the ed25519 route skeleton', () => {
    render(
      <MemoryRouter initialEntries={['/ed25519']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'ED25519' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Register credential' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Sign in with private key' }),
    ).toBeInTheDocument();
  });

  it('renders the credentials route', () => {
    render(
      <MemoryRouter initialEntries={['/credentials']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Credentials' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Email' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Passkey' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ed25519' })).toBeInTheDocument();
  });

  it('renders the setup route with an auth origin form', () => {
    render(
      <MemoryRouter initialEntries={['/setup']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Auth server origin')).toBeInTheDocument();
    expect(screen.getByText('Page origin')).toBeInTheDocument();
    expect(screen.getByLabelText('Allowed page origin')).toHaveValue(
      'http://localhost:3000',
    );
    expect(screen.getByLabelText('SMTP host')).toBeInTheDocument();
    expect(
      screen.getByText('auth-mini --issuer https://auth.zccz14.com'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/configure a self-hosted auth-mini instance/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/auth-mini origin/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/auth-mini smtp/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/npm --prefix examples\/demo run dev/i),
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
