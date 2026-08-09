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
  userId: string;
  copied: string;
  securitySettings: string;
  signOut: string;
  close: string;
};

export type AuthMiniButtonProps = {
  className?: string;
  lang: string;
  labels?: Partial<AuthMiniButtonLabels>;
  securitySettingsUrl?: string;
  securitySettingsTarget?: '_blank' | '_self';
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const labelsByLanguage: Record<'en' | 'zh', AuthMiniButtonLabels> = {
  en: {
    checking: 'Checking session…',
    signIn: 'Sign In',
    signedIn: 'Account',
    dialogDescription:
      'You are signed in to this app. Manage your sign-in methods in Auth Mini.',
    userId: 'User ID',
    copied: 'Copied',
    securitySettings: 'Manage sign-in methods',
    signOut: 'Sign Out',
    close: 'Close',
  },
  zh: {
    checking: '正在检查登录状态…',
    signIn: '登录',
    signedIn: '账户',
    dialogDescription: '你已登录此应用。请在 Auth Mini 管理你的登录方式。',
    userId: '用户 ID',
    copied: '已复制',
    securitySettings: '管理登录方式',
    signOut: '退出登录',
    close: '关闭',
  },
};

export function AuthMiniButton({
  className,
  lang,
  labels: labelOverrides,
  securitySettingsTarget = '_blank',
  securitySettingsUrl,
  size = 'default',
  variant = 'default',
}: AuthMiniButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userIdCopied, setUserIdCopied] = useState(false);
  const {
    authMiniBaseUrl,
    error,
    isAuthenticated: authenticated,
    isReady,
    session,
    signIn,
    signOut,
  } = useAuthMini();
  const labels = { ...labelsByLanguage[languageKey(lang)], ...labelOverrides };
  const userId = readUserId(session?.accessToken);

  const buttonClassName = [
    'auth-mini-button',
    authenticated ? 'auth-mini-button--icon' : `auth-mini-button--${variant}`,
    authenticated ? 'auth-mini-button--sm' : `auth-mini-button--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Dialog.Root
      open={dialogOpen}
      onOpenChange={(open) => {
        setDialogOpen(open);
        setUserIdCopied(false);
      }}
    >
      <button
        aria-label={authenticated ? labels.signedIn : undefined}
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
        {isReady ? (
          authenticated ? (
            <UserIcon />
          ) : (
            labels.signIn
          )
        ) : (
          labels.checking
        )}
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
          {userId ? (
            <button
              className="auth-mini-user-id"
              onClick={() => {
                if (!navigator.clipboard) {
                  return;
                }
                void navigator.clipboard.writeText(userId).then(
                  () => setUserIdCopied(true),
                  () => undefined,
                );
              }}
              type="button"
            >
              <span>{labels.userId}</span>
              <strong>{userIdCopied ? labels.copied : userId}</strong>
            </button>
          ) : null}
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
            <button
              className="auth-mini-button auth-mini-button--destructive auth-mini-button--default"
              onClick={() => {
                void signOut().then(
                  () => setDialogOpen(false),
                  () => undefined,
                );
              }}
              type="button"
            >
              {labels.signOut}
            </button>
            <Dialog.Close className="auth-mini-button auth-mini-button--outline auth-mini-button--default">
              {labels.close}
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function languageKey(lang: string): 'en' | 'zh' {
  const normalized = lang.toLowerCase();
  return normalized === 'zh' || normalized.startsWith('zh-') ? 'zh' : 'en';
}

function readUserId(accessToken: string | null | undefined): string | null {
  const payload = accessToken?.split('.')[1];
  if (!payload) {
    return null;
  }

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const value: unknown = JSON.parse(atob(padded));
    if (!value || typeof value !== 'object') {
      return null;
    }
    const subject = (value as { sub?: unknown }).sub;
    return typeof subject === 'string' ? subject : null;
  } catch {
    return null;
  }
}

function UserIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M4 21c1.5-4 4.1-6 8-6s6.5 2 8 6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
