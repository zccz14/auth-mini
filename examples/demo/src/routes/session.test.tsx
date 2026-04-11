import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AUTH_ORIGIN_KEY } from '@/lib/demo-storage';
import { AppRouter } from '@/app/router';

describe('SessionRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
  });

  it('shows current session and current user sections plus a clear local auth state action', () => {
    render(
      <MemoryRouter initialEntries={['/session']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(screen.getByText('Current session')).toBeInTheDocument();
    expect(screen.getByText('Current user')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Clear local auth state' }),
    ).toBeInTheDocument();
  });
});
