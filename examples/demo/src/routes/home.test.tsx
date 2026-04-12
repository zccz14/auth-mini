import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DemoProvider } from '@/app/providers/demo-provider';
import { AUTH_ORIGIN_KEY } from '@/lib/demo-storage';
import { HomeRoute } from './home';

function renderHomeRoute(authOrigin?: string) {
  localStorage.clear();

  if (authOrigin) {
    localStorage.setItem(AUTH_ORIGIN_KEY, authOrigin);
  }

  render(
    <MemoryRouter initialEntries={['/']}>
      <DemoProvider
        initialLocation={{
          hash: '#/',
          search: '',
          origin: 'https://demo.example.com',
        }}
      >
        <HomeRoute />
      </DemoProvider>
    </MemoryRouter>,
  );
}

describe('HomeRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the homepage entry points without locking copy or section order', () => {
    renderHomeRoute();

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Demo setup status:/i)).toBeInTheDocument();

    const links = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));

    expect(links).toEqual(expect.arrayContaining(['/setup', '/email']));
    expect(screen.getByText('JWT access + refresh tokens')).toBeInTheDocument();
  });

  it('shows the ready state when an auth origin is configured', () => {
    renderHomeRoute('https://auth.example.com');

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(
      screen.getByText(/auth origin configured for interactive browser flows/i),
    ).toBeInTheDocument();
    expect(screen.getByText('JWT access + refresh tokens')).toBeInTheDocument();
  });
});
