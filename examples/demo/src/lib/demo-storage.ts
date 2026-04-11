const AUTH_ORIGIN_KEY = 'auth-mini-demo.auth-origin';

export function getStoredAuthOrigin(storage?: Pick<Storage, 'getItem'>) {
  try {
    return storage?.getItem(AUTH_ORIGIN_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setStoredAuthOrigin(
  authOrigin: string,
  storage?: Pick<Storage, 'setItem'>,
) {
  try {
    storage?.setItem(AUTH_ORIGIN_KEY, authOrigin);
  } catch {
    // ignore storage write failures and keep the app usable
  }
}

export function clearStoredAuthOrigin(storage?: Pick<Storage, 'removeItem'>) {
  try {
    storage?.removeItem(AUTH_ORIGIN_KEY);
  } catch {
    // ignore storage write failures and keep the app usable
  }
}

export { AUTH_ORIGIN_KEY };
