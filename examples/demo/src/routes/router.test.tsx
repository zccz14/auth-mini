import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
      screen.getByText(
        /launch the auth server and this demo from separate terminals/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'npx auth-mini origin add ./auth-mini.sqlite --value http://localhost:3000',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'npx auth-mini start ./auth-mini.sqlite --host 127.0.0.1 --port 7777 --issuer http://127.0.0.1:7777',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'npm --prefix examples/demo run dev -- --host 127.0.0.1 --port 3000',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /configure smtp and real email delivery before using email start\/verify/i,
      ),
    ).toBeInTheDocument();
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
    expect(localStorage.getItem('auth-mini-demo.auth-origin')).toBe(
      'https://auth.example.com',
    );
  });
});
