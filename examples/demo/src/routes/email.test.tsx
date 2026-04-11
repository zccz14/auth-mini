import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppRouter } from '@/app/router';

const sdkMocks = vi.hoisted(() => ({
  createBrowserSdk: vi.fn(() => ({
    email: { start: vi.fn(), verify: vi.fn() },
    passkey: { register: vi.fn(), authenticate: vi.fn() },
    me: { get: vi.fn(() => null), reload: vi.fn() },
    session: {
      getState: () => ({
        status: 'anonymous',
        authenticated: false,
        sessionId: null,
        accessToken: null,
        refreshToken: null,
        receivedAt: null,
        expiresAt: null,
        me: null,
      }),
      onChange: vi.fn(() => vi.fn()),
      refresh: vi.fn(),
      logout: vi.fn(),
    },
    webauthn: { register: vi.fn(), authenticate: vi.fn() },
  })),
}));

vi.mock('auth-mini/sdk/browser', () => ({
  createBrowserSdk: sdkMocks.createBrowserSdk,
}));

describe('EmailRoute', () => {
  it('disables the start button until auth origin is configured', () => {
    localStorage.clear();

    render(
      <MemoryRouter initialEntries={['/email']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('button', { name: 'Start email sign-in' }),
    ).toBeDisabled();
  });
});
