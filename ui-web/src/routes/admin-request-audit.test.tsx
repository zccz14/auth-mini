import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/lib/i18n';
import { AdminRequestAuditRoute } from './admin-request-audit';

const sdk = {
  admin: {
    requestAudit: { fetch: vi.fn() },
  },
};

vi.mock('@/app/providers/app-provider', () => ({
  useApp: () => ({ sdk }),
}));

function renderRoute(ui: ReactNode) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('admin request audit route', () => {
  it('renders per-endpoint access counts', async () => {
    sdk.admin.requestAudit.fetch.mockResolvedValue({
      started_at: 1_784_200_000,
      endpoints: [
        { method: 'POST', endpoint: '/email/start', count: 12 },
        { method: 'GET', endpoint: '/jwks', count: 3 },
      ],
      unmatched: [
        {
          method: 'GET',
          path: '/wp-login.php',
          count: 42,
          last_seen: 1_784_199_000,
        },
      ],
    });

    renderRoute(<AdminRequestAuditRoute />);

    expect(await screen.findByText('/email/start')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('/jwks')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/Counting since/)).toBeInTheDocument();

    expect(screen.getByText('Unknown endpoints')).toBeInTheDocument();
    expect(screen.getByText('/wp-login.php')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('shows an empty state before any endpoint is accessed', async () => {
    sdk.admin.requestAudit.fetch.mockResolvedValue({
      started_at: 1_784_200_000,
      endpoints: [],
      unmatched: [],
    });

    renderRoute(<AdminRequestAuditRoute />);

    expect(
      await screen.findByText('No requests recorded yet.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('No unknown-endpoint requests.'),
    ).toBeInTheDocument();
  });
});
