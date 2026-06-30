import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DemoProvider } from '@/app/providers/demo-provider';
import { HomeRoute } from './home';

function renderHomeRoute() {
  localStorage.clear();

  render(
    <MemoryRouter initialEntries={['/']}>
      <DemoProvider
        initialLocation={{
          hash: '#/',
          href: 'https://demo.example.com/web/#/',
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

  it('shows the ready state for the embedded server', () => {
    renderHomeRoute();

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(
      screen.getByText(/browser flows use the current server/i),
    ).toBeInTheDocument();
    expect(screen.getByText('JWT access + refresh tokens')).toBeInTheDocument();
  });
});
