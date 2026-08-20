import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '@/lib/i18n';
import { Ed25519Keypair } from './ed25519-keypair';

describe('Ed25519Keypair', () => {
  it('labels each value by its cryptographic role and gives separate copy actions', () => {
    render(
      <I18nProvider>
        <Ed25519Keypair publicKey="public-key" seed="private-seed" />
      </I18nProvider>,
    );

    expect(
      screen.getByText('ED25519 public key — register and share this value'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('ED25519 private key seed — keep secret'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Auth Mini never receives it/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy public key' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy private seed' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('public-key')).toHaveAttribute('readonly');
    expect(screen.getByDisplayValue('private-seed')).toHaveAttribute('readonly');
  });
});
