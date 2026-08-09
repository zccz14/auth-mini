import { UserIcon } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from './components/ui/alert.js';
import { Button } from './components/ui/button.js';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './components/ui/dialog.js';
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

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        setDialogOpen(open);
        setUserIdCopied(false);
      }}
    >
      {authenticated ? (
        <DialogTrigger asChild>
          <Button
            aria-describedby={error ? 'auth-mini-button-error' : undefined}
            aria-label={labels.signedIn}
            className={className}
            disabled={!isReady}
            size="icon"
            type="button"
          >
            <UserIcon />
          </Button>
        </DialogTrigger>
      ) : (
        <Button
          aria-describedby={error ? 'auth-mini-button-error' : undefined}
          className={className}
          disabled={!isReady}
          onClick={signIn}
          size={size}
          type="button"
          variant={variant}
        >
          {isReady ? labels.signIn : labels.checking}
        </Button>
      )}
      {error ? (
        <Alert id="auth-mini-button-error" variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{labels.signedIn}</DialogTitle>
          <DialogDescription>{labels.dialogDescription}</DialogDescription>
        </DialogHeader>
        {userId ? (
          <Button
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
            variant="outline"
          >
            {labels.userId}: {userIdCopied ? labels.copied : userId}
          </Button>
        ) : null}
        <DialogFooter>
          <Button asChild variant="outline">
            <a
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
          </Button>
          <Button
            onClick={() => {
              void signOut().then(
                () => setDialogOpen(false),
                () => undefined,
              );
            }}
            type="button"
            variant="destructive"
          >
            {labels.signOut}
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {labels.close}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
