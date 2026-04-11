import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DemoProvider } from '@/app/providers/demo-provider';
import { SetupRoute } from './setup';

const hasExactText = (value: string) => (_: string, node: Element | null) =>
  node?.textContent === value;

describe('SetupRoute', () => {
  it('renders the self-hosted command list without demo dev or host/port flags', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/setup']}>
        <DemoProvider
          initialLocation={{
            hash: '#/setup',
            search: '',
            origin: 'https://demo.example.com',
          }}
        >
          <Routes>
            <Route path="/setup" element={<SetupRoute />} />
          </Routes>
        </DemoProvider>
      </MemoryRouter>,
    );

    expect(
      screen.getByText('npx auth-mini init ./auth-mini.sqlite'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        hasExactText(
        "npx auth-mini smtp add ./auth-mini.sqlite  --from-email 'sample@your-domain.com' --from-name 'sample-name' --host 'smtp.sample.com' --port 465 --secure --username 'sample@your-domain.com' --password '<smtp-password>'",
        ),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'npx auth-mini origin add ./auth-mini.sqlite --value https://demo.example.com',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'npx auth-mini start ./auth-mini.sqlite --issuer https://auth.zccz14.com',
      ),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('code')).toHaveLength(4);
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
});
