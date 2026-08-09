import { CopyIcon, UserIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from './components/ui/alert.js';
import { Button, buttonVariants } from './components/ui/button.js';
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
  copyUserId: string;
  copied: string;
  addPasskey: string;
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
    userId: 'UID',
    copyUserId: 'Copy UID',
    copied: 'Copied to clipboard',
    addPasskey: 'Add passkey',
    securitySettings: 'Manage sign-in methods',
    signOut: 'Sign Out',
    close: 'Close',
  },
  zh: {
    checking: '正在检查登录状态…',
    signIn: '登录',
    signedIn: '账户',
    dialogDescription: '你已登录此应用。请在 Auth Mini 管理你的登录方式。',
    userId: 'UID',
    copyUserId: '复制 UID',
    copied: '已复制到剪贴板',
    addPasskey: '添加通行密钥',
    securitySettings: '管理登录方式',
    signOut: '退出登录',
    close: '关闭',
  },
};

const iconSizeByButtonSize = {
  default: 'icon',
  sm: 'icon-sm',
  lg: 'icon-lg',
} as const;

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
  const {
    authMiniBaseUrl,
    error,
    isAuthenticated: authenticated,
    isReady,
    session,
    signIn,
    signOut,
    openPasskeyRegistrationPage,
  } = useAuthMini();
  const labels = { ...labelsByLanguage[languageKey(lang)], ...labelOverrides };
  const userId = readUserId(session?.accessToken);

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        setDialogOpen(open);
      }}
    >
      {authenticated ? (
        <DialogTrigger
          render={
            <Button
              aria-describedby={error ? 'auth-mini-button-error' : undefined}
              aria-label={labels.signedIn}
              className={className}
              disabled={!isReady}
              size={iconSizeByButtonSize[size]}
              type="button"
              variant={variant}
            >
              <UserIcon />
            </Button>
          }
        />
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
          <div className="flex items-center gap-2 px-1.5 pb-2 pt-1">
            <span className="shrink-0 text-xs font-medium text-muted-foreground">
              {labels.userId}
            </span>
            <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1.5 text-xs text-muted-foreground">
              {userId}
            </code>
            <Button
              aria-label={labels.copyUserId}
              onClick={() => void copyUserId(userId, labels.copied)}
              size="icon-xs"
              title={labels.copyUserId}
              type="button"
              variant="ghost"
            >
              <CopyIcon />
            </Button>
          </div>
        ) : null}
        <DialogFooter>
          <Button
            onClick={() => openPasskeyRegistrationPage()}
            type="button"
            variant="outline"
          >
            {labels.addPasskey}
          </Button>
          <a
            className={buttonVariants({ variant: 'outline' })}
            data-slot="button"
            data-variant="outline"
            href={
              securitySettingsUrl ?? getAuthMiniSecurityUrl(authMiniBaseUrl)
            }
            rel={securitySettingsTarget === '_blank' ? 'noreferrer' : undefined}
            target={securitySettingsTarget}
          >
            {labels.securitySettings}
          </a>
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
          <DialogClose render={<Button type="button" variant="outline" />}>
            {labels.close}
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

async function copyUserId(userId: string, copiedMessage: string) {
  await navigator.clipboard.writeText(userId);
  toast.success(copiedMessage);
}
