import { Dialog } from '@base-ui/react/dialog';
import {
  createBrowserSdk,
  type AuthMiniApi,
  type SessionSnapshot,
} from 'auth-mini/sdk/browser';
import { useEffect, useRef, useState } from 'react';
import {
  AuthMiniCallbackError,
  getAuthMiniLoginStateKey,
  getAuthMiniLoginUrl,
  getAuthMiniSecurityUrl,
  readAuthMiniRedirectCallback,
} from './auth-callback.js';

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
  authMiniBaseUrl: string;
  audience?: string;
  callbackUrl?: string | (() => string);
  className?: string;
  labels?: Partial<AuthMiniButtonLabels>;
  onAuthError?: (error: Error) => void;
  onAuthStateChange?: (session: SessionSnapshot) => void;
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
  authMiniBaseUrl,
  audience,
  callbackUrl,
  className,
  labels: labelOverrides,
  onAuthError,
  onAuthStateChange,
  securitySettingsTarget = '_blank',
  securitySettingsUrl,
  size = 'default',
  variant = 'default',
}: AuthMiniButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const errorHandler = useLatest(onAuthError);
  const stateHandler = useLatest(onAuthStateChange);
  const labels = { ...defaultLabels, ...labelOverrides };
  const isReady = session !== null && session.status !== 'recovering';
  const authenticated = session?.status === 'authenticated';

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let alive = true;

    try {
      const sdk = createBrowserSdk(authMiniBaseUrl);
      const synchronize = (nextSession: SessionSnapshot) => {
        if (!alive) {
          return;
        }
        setSession(nextSession);
        stateHandler.current?.(nextSession);
      };

      synchronize(sdk.session.getState());
      unsubscribe = sdk.session.onChange(synchronize);
      void acceptCallback(sdk, authMiniBaseUrl).catch((cause: unknown) => {
        if (!alive) {
          return;
        }
        const nextError = toError(cause);
        setError(nextError);
        errorHandler.current?.(nextError);
      });
    } catch (cause) {
      const nextError = toError(cause);
      setError(nextError);
      errorHandler.current?.(nextError);
    }

    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, [authMiniBaseUrl, errorHandler, stateHandler]);

  function beginSignIn() {
    try {
      const state = createLoginState();
      const storageKey = getAuthMiniLoginStateKey(authMiniBaseUrl);
      const returnTo = resolveCallbackUrl(callbackUrl);
      window.sessionStorage.setItem(storageKey, state);
      window.location.assign(
        getAuthMiniLoginUrl({
          authMiniBaseUrl,
          audience,
          callbackUrl: returnTo,
          state,
        }),
      );
    } catch (cause) {
      const nextError = toError(cause);
      setError(nextError);
      errorHandler.current?.(nextError);
    }
  }

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
          beginSignIn();
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

async function acceptCallback(sdk: AuthMiniApi, authMiniBaseUrl: string) {
  let callback;
  try {
    callback = readAuthMiniRedirectCallback(window.location.href);
  } catch (cause) {
    if (cause instanceof AuthMiniCallbackError) {
      window.history.replaceState(null, '', cause.cleanUrl);
    }
    throw cause;
  }
  if (!callback) {
    return;
  }

  const storageKey = getAuthMiniLoginStateKey(authMiniBaseUrl);
  const expectedState = window.sessionStorage.getItem(storageKey);
  window.history.replaceState(null, '', callback.cleanUrl);

  if (!expectedState || callback.state !== expectedState) {
    throw new Error('Invalid Auth Mini login state');
  }

  window.sessionStorage.removeItem(storageKey);
  await sdk.session.acceptRedirectCallback(callback.tokens);
}

function createLoginState(): string {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error('Secure random values are unavailable');
  }
  return globalThis.crypto.randomUUID();
}

function resolveCallbackUrl(
  value: string | (() => string) | undefined,
): string {
  return typeof value === 'function'
    ? value()
    : (value ?? window.location.href);
}

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause));
}

function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
