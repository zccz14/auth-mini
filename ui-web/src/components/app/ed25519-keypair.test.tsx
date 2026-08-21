import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '@/lib/i18n';
import { Ed25519Keypair } from './ed25519-keypair';

describe('Ed25519Keypair', () => {
  it('labels the Solana-compatible public and private key roles separately', () => {
    render(
      <I18nProvider>
        <Ed25519Keypair publicKey="public-key" privateKey="private-key" />
      </I18nProvider>,
    );

    expect(
      screen.getByText(/public key.*register and share/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/private key.*Solana-compatible/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /64-byte Solana-compatible private key includes its public key/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Copy public key' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Copy private key' }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('public-key')).toHaveAttribute('readonly');
    expect(screen.getByDisplayValue('private-key')).toHaveAttribute('readonly');
  });
});
