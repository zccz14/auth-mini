import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppRouter } from '../app/router';

describe('AppRouter', () => {
  it('renders top-level nav entries for the app shell', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Setup' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Credentials' }),
    ).toBeInTheDocument();
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

    expect(
      screen.getByRole('heading', { name: 'ED25519' }),
    ).toBeInTheDocument();
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
    expect(
      screen.getByRole('heading', { name: 'Passkey' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Ed25519' }),
    ).toBeInTheDocument();
  });

  it('renders the setup route without an auth server origin form', () => {
    render(
      <MemoryRouter initialEntries={['/setup']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(
      screen.queryByLabelText('Auth server origin'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Page origin')).toBeInTheDocument();
    expect(screen.getByText('API base')).toBeInTheDocument();
    expect(screen.getByText('..')).toBeInTheDocument();
    expect(screen.getByLabelText('Allowed page origin')).toHaveValue(
      'http://localhost:3000',
    );
    expect(screen.getByLabelText('SMTP host')).toBeInTheDocument();
    expect(screen.queryByText(/auth-mini --issuer/i)).not.toBeInTheDocument();
    expect(screen.getByText(/configure app metadata/i)).toBeInTheDocument();
    expect(screen.queryByText(/auth-mini origin/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/auth-mini smtp/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/npm --prefix examples\/demo run dev/i),
    ).not.toBeInTheDocument();
  });
});
