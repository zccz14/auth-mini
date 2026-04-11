import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DemoProvider } from '@/app/providers/demo-provider';
import { HomeRoute } from './home';

function renderHomeRoute(authOrigin?: string) {
  localStorage.clear();

  if (authOrigin) {
    localStorage.setItem('auth-mini-demo.auth-origin', authOrigin);
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

  it('renders the approved homepage positioning and section order', () => {
    renderHomeRoute();

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Minimal Self-Hosted Auth Server for your Apps',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Official auth-mini Auth Server demo'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Why teams pick auth-mini',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Auth server capabilities',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Good fit' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Not included' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Validate the browser flows when you are ready',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'Start with official Auth Server setup',
      }),
    ).toHaveAttribute('href', '/setup');
    expect(
      screen.getByRole('link', { name: 'Try browser auth flows' }),
    ).toHaveAttribute('href', '/email');
    expect(
      screen.getByText(
        'Demo setup status: visit Setup to connect an auth origin before trying live browser flows.',
      ),
    ).toBeInTheDocument();
  });

  it('demotes setup readiness to helper copy when an auth origin exists', () => {
    renderHomeRoute('https://auth.example.com');

    expect(
      screen.getByText(
        'Demo setup status: ready — auth origin configured for interactive browser flows.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Keep auth in your stack')).toBeInTheDocument();
    expect(screen.getByText('JWT access + refresh tokens')).toBeInTheDocument();
  });
});
