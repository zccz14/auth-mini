import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DemoProvider, useDemo } from './demo-provider';

vi.mock('auth-mini/sdk/browser', () => ({
  createBrowserSdk: vi.fn(() => ({
    session: { getState: () => ({ status: 'anonymous' }), onChange: vi.fn() },
    me: { get: () => null, reload: vi.fn() },
  })),
}));

function Probe() {
  const demo = useDemo();
  return <div>{demo.config.status}</div>;
}

describe('DemoProvider', () => {
  it('keeps the app disabled when auth origin is missing', () => {
    render(
      <DemoProvider
        initialLocation={{
          hash: '#/setup',
          search: '',
          origin: 'https://demo.example.com',
        }}
      >
        <Probe />
      </DemoProvider>,
    );

    expect(screen.getByText('waiting')).toBeInTheDocument();
  });
});
