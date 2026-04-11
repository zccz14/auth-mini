const AUTH_ORIGIN_KEY = 'auth-mini-demo.auth-origin';

export function getStoredAuthOrigin(storage?: Pick<Storage, 'getItem'>) {
  return storage?.getItem(AUTH_ORIGIN_KEY) ?? '';
}

export function setStoredAuthOrigin(
  authOrigin: string,
  storage?: Pick<Storage, 'setItem'>,
) {
  storage?.setItem(AUTH_ORIGIN_KEY, authOrigin);
}

export function clearStoredAuthOrigin(storage?: Pick<Storage, 'removeItem'>) {
  storage?.removeItem(AUTH_ORIGIN_KEY);
}

export { AUTH_ORIGIN_KEY };
