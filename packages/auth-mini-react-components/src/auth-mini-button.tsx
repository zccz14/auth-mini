import { Dialog } from '@base-ui/react/dialog';
import { useState } from 'react';
import { getAuthMiniSecurityUrl } from './auth-callback.js';
import { useAuthMini } from './auth-mini-provider.js';

type ButtonSize = 'default' | 'sm' | 'lg';
type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'link';

export type AuthMiniButtonLabels = {
  checking: string;
  signIn: string;
  signedIn: string;
  dialogDescription: string;
  securitySettings: string;
  close: string;
};

export type AuthMiniButtonProps = {
  className?: string;
  labels?: Partial<AuthMiniButtonLabels>;
  securitySettingsUrl?: string;
  securitySettingsTarget?: '_blank' | '_self';
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const defaultLabels: AuthMiniButtonLabels = {
  checking: 'Checking session…',
  signIn: 'Sign in with Auth Mini',
  signedIn: 'Account',
  dialogDescription:
    'You are signed in to this app. Sign in at Auth Mini to manage passkeys, Ed25519 keys, and active sessions.',
  securitySettings: 'Manage security settings',
  close: 'Close',
};

export function AuthMiniButton({
  className,
  labels: labelOverrides,
  securitySettingsTarget = '_blank',
  securitySettingsUrl,
  size = 'default',
  variant = 'default',
}: AuthMiniButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    authMiniBaseUrl,
    error,
    isAuthenticated: authenticated,
    isReady,
    signIn,
  } = useAuthMini();
  const labels = { ...defaultLabels, ...labelOverrides };

  const buttonClassName = [
    'auth-mini-button',
    `auth-mini-button--${variant}`,
    `auth-mini-button--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
      <button
        aria-describedby={error ? 'auth-mini-button-error' : undefined}
        className={buttonClassName}
        data-authenticated={authenticated || undefined}
        disabled={!isReady}
        onClick={() => {
          if (authenticated) {
            setDialogOpen(true);
            return;
          }
          signIn();
        }}
        type="button"
      >
        {isReady
          ? authenticated
            ? labels.signedIn
            : labels.signIn
          : labels.checking}
      </button>
      {error ? (
        <p className="auth-mini-error" id="auth-mini-button-error" role="alert">
          {error.message}
        </p>
      ) : null}
      <Dialog.Portal>
        <Dialog.Backdrop className="auth-mini-dialog-backdrop" />
        <Dialog.Popup className="auth-mini-dialog-content">
          <div className="auth-mini-dialog-header">
            <Dialog.Title className="auth-mini-dialog-title">
              {labels.signedIn}
            </Dialog.Title>
            <Dialog.Description className="auth-mini-dialog-description">
              {labels.dialogDescription}
            </Dialog.Description>
          </div>
          <div className="auth-mini-dialog-actions">
            <a
              className="auth-mini-button auth-mini-button--default"
              href={
                securitySettingsUrl ?? getAuthMiniSecurityUrl(authMiniBaseUrl)
              }
              rel={
                securitySettingsTarget === '_blank' ? 'noreferrer' : undefined
              }
              target={securitySettingsTarget}
            >
              {labels.securitySettings}
            </a>
            <Dialog.Close className="auth-mini-button auth-mini-button--outline auth-mini-button--default">
              {labels.close}
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
