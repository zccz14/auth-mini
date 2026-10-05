import type { SessionSnapshot } from 'auth-mini/sdk/browser';
import type { AppSessionTokens, SessionAuthorizeInput } from '@/lib/app-sdk';

export const ACCOUNTS_STORAGE_KEY = 'auth-mini.accounts';

export type StoredAccount = {
  userId: string;
  email: string | null;
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  receivedAt: string;
  expiresAt: string;
  lastUsedAt: string;
};

export function readStoredAccounts(): StoredAccount[] {
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !Array.isArray(parsed.accounts)) return [];

    return parsed.accounts
      .map(toStoredAccount)
      .filter((account): account is StoredAccount => account !== null);
  } catch {
    // A storage policy can deny reads; the account list simply stays empty.
    return [];
  }
}

export function writeStoredAccounts(accounts: StoredAccount[]): void {
  const serialized = JSON.stringify({ accounts });
  try {
    if (window.localStorage.getItem(ACCOUNTS_STORAGE_KEY) === serialized) {
      return;
    }
    window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, serialized);
  } catch {
    // A storage policy can deny writes; the in-memory list stays usable.
  }
}

export function upsertStoredAccount(
  accounts: StoredAccount[],
  next: StoredAccount,
): StoredAccount[] {
  const index = accounts.findIndex((account) => account.userId === next.userId);
  if (index === -1) return [...accounts, next];

  const existing = accounts[index];
  const replaced: StoredAccount = {
    ...next,
    // Snapshots and token refreshes carry no email; keep the known label.
    email: next.email ?? existing.email,
  };
  if (sameStoredAccount(existing, replaced)) return accounts;

  const updated = [...accounts];
  updated[index] = replaced;
  return updated;
}

export function removeStoredAccount(
  accounts: StoredAccount[],
  userId: string,
): StoredAccount[] {
  const remaining = accounts.filter((account) => account.userId !== userId);
  return remaining.length === accounts.length ? accounts : remaining;
}

export function accountFromSessionSnapshot(
  session: SessionSnapshot,
): StoredAccount | null {
  const { sessionId, accessToken, refreshToken, receivedAt, expiresAt } =
    session;
  if (
    !sessionId ||
    !accessToken ||
    !refreshToken ||
    !receivedAt ||
    !expiresAt
  ) {
    return null;
  }

  const userId = decodeAccountUserId(accessToken);
  if (!userId) return null;

  return {
    userId,
    email: null,
    sessionId,
    accessToken,
    refreshToken,
    receivedAt,
    expiresAt,
    lastUsedAt: new Date().toISOString(),
  };
}

export function accountFromAppTokens(
  tokens: AppSessionTokens,
  now = Date.now(),
): StoredAccount | null {
  const userId = decodeAccountUserId(tokens.access_token);
  if (!userId) return null;

  return {
    userId,
    email: null,
    sessionId: tokens.session_id,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    receivedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + tokens.expires_in * 1000).toISOString(),
    lastUsedAt: new Date(now).toISOString(),
  };
}

export async function refreshStoredAccount(
  baseUrl: string,
  account: StoredAccount,
): Promise<StoredAccount> {
  const tokens = await postJson<AppSessionTokens>(
    baseUrl,
    '/session/refresh',
    { session_id: account.sessionId, refresh_token: account.refreshToken },
    null,
  );
  const now = Date.now();

  return {
    ...account,
    sessionId: tokens.session_id,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    receivedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + tokens.expires_in * 1000).toISOString(),
    lastUsedAt: new Date(now).toISOString(),
  };
}

export async function authorizeStoredAccount(
  baseUrl: string,
  accessToken: string,
  input: SessionAuthorizeInput,
): Promise<AppSessionTokens> {
  return postJson<AppSessionTokens>(
    baseUrl,
    '/session/authorize',
    input,
    accessToken,
  );
}

export async function fetchAccountEmail(
  baseUrl: string,
  accessToken: string,
): Promise<string | null> {
  try {
    const response = await fetch(new URL('/me', baseUrl), {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as { email?: unknown };
    return typeof payload.email === 'string' ? payload.email : null;
  } catch {
    // Enrichment is best effort; the fallback label stays when /me fails.
    return null;
  }
}

// The payload is decoded without signature verification; it only labels the
// account in this browser, and the server still validates every request.
export function decodeAccountUserId(accessToken: string): string | null {
  const [, segment] = accessToken.split('.');
  if (!segment) return null;

  try {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const payload: unknown = JSON.parse(atob(padded));
    if (!isRecord(payload)) return null;
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export function isInvalidAccountSessionError(cause: unknown): boolean {
  if (typeof cause !== 'object' || cause === null) return false;

  const candidate = cause as { status?: unknown; error?: unknown };
  return (
    candidate.status === 401 ||
    candidate.error === 'session_invalidated' ||
    candidate.error === 'session_superseded' ||
    candidate.error === 'invalid_refresh_token'
  );
}

async function postJson<T>(
  baseUrl: string,
  path: string,
  body: unknown,
  accessToken: string | null,
): Promise<T> {
  const response = await fetch(new URL(path, baseUrl), {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as T | { error?: string };
  if (!response.ok) {
    if (typeof payload === 'object' && payload !== null) {
      throw { status: response.status, ...payload };
    }
    throw { status: response.status, error: 'request_failed' };
  }

  return payload as T;
}

function toStoredAccount(value: unknown): StoredAccount | null {
  if (!isRecord(value)) return null;

  const { userId, sessionId, accessToken, refreshToken, receivedAt } = value;
  const { expiresAt, lastUsedAt } = value;
  if (
    typeof userId !== 'string' ||
    typeof sessionId !== 'string' ||
    typeof accessToken !== 'string' ||
    typeof refreshToken !== 'string' ||
    typeof receivedAt !== 'string' ||
    typeof expiresAt !== 'string' ||
    typeof lastUsedAt !== 'string'
  ) {
    return null;
  }

  return {
    userId,
    email: typeof value.email === 'string' ? value.email : null,
    sessionId,
    accessToken,
    refreshToken,
    receivedAt,
    expiresAt,
    lastUsedAt,
  };
}

function sameStoredAccount(a: StoredAccount, b: StoredAccount): boolean {
  return (
    a.userId === b.userId &&
    a.email === b.email &&
    a.sessionId === b.sessionId &&
    a.accessToken === b.accessToken &&
    a.refreshToken === b.refreshToken &&
    a.receivedAt === b.receivedAt &&
    a.expiresAt === b.expiresAt &&
    a.lastUsedAt === b.lastUsedAt
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
