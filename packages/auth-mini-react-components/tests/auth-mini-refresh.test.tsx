import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthMiniProvider,
  useAuthMini,
  type AuthMiniContextValue,
} from '../src/auth-mini-provider.js';

const { jwtVerify } = vi.hoisted(() => ({
  jwtVerify: vi.fn().mockResolvedValue({ payload: { sub: 'user-1' } }),
}));
vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => vi.fn()),
  jwtVerify,
}));

const issuer = 'https://refresh.example.test';
const storageKey = `auth-mini.sdk:${issuer}/`;
const initialSession = {
  sessionId: 'session-1',
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  receivedAt: '2026-09-16T00:00:00.000Z',
  expiresAt: '2026-09-16T00:15:00.000Z',
};
let observedContext: AuthMiniContextValue | undefined;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function response(accessToken = 'access-2', refreshToken = 'refresh-2') {
  return new Response(
    JSON.stringify({
      session_id: 'session-1',
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900,
    }),
    { headers: { 'content-type': 'application/json' } },
  );
}

function Editor({
  mount,
  unmount,
}: {
  mount: () => void;
  unmount: () => void;
}) {
  const [value, setValue] = useState('unfinished draft');
  useEffect(() => {
    mount();
    return unmount;
  }, [mount, unmount]);
  return (
    <input
      aria-label="draft"
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

function RefreshDialog({ childRenders }: { childRenders: () => void }) {
  const context = useAuthMini();
  observedContext = context;
  const { isReady, isAuthenticated } = context;
  if (!isReady || !isAuthenticated) {
    return <output data-testid="dialog-loading">loading</output>;
  }

  return <DialogContent childRenders={childRenders} />;
}

function DialogContent({ childRenders }: { childRenders: () => void }) {
  const [draft, setDraft] = useState('unfinished dialog draft');
  childRenders();
  return (
    <div role="dialog" aria-label="workspace dialog">
      <input
        aria-label="dialog draft"
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
    </div>
  );
}

describe('AuthMiniProvider with the Browser SDK refresh timer', () => {
  let current: AuthMiniContextValue;
  const renders = vi.fn();
  const mount = vi.fn();
  const unmount = vi.fn();
  const readToken = vi.fn();

  function Application() {
    current = useAuthMini();
    const { isReady, isAuthenticated, session } = current;
    renders();
    return (
      <>
        <output data-testid="auth">{String(isReady && isAuthenticated)}</output>
        {isAuthenticated ? <Editor mount={mount} unmount={unmount} /> : null}
        <button onClick={() => readToken(session?.accessToken)}>
          Read token
        </button>
      </>
    );
  }

  async function start() {
    const view = render(
      <AuthMiniProvider authMiniBaseUrl={issuer} autoRedirectToLogin={false}>
        <Application />
      </AuthMiniProvider>,
    );
    await act(async () => {});
    expect(screen.getByTestId('auth')).toHaveTextContent('true');
    renders.mockClear();
    return view;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(initialSession.receivedAt));
    vi.clearAllMocks();
    observedContext = undefined;
    jwtVerify.mockReset().mockResolvedValue({ payload: { sub: 'user-1' } });
    localStorage.setItem(storageKey, JSON.stringify(initialSession));
  });

  afterEach(async () => {
    cleanup();
    current?.sdk?.session.clearLocal();
    await Promise.resolve();
    localStorage.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps consumers, their DOM, focus and state unchanged across network and JWT verification', async () => {
    const network = deferred<Response>();
    const fetch = vi.fn().mockReturnValue(network.promise);
    vi.stubGlobal('fetch', fetch);
    await start();
    const context = current!;
    const session = current!.session;
    const input = screen.getByLabelText('draft');
    fireEvent.change(input, { target: { value: 'keep this draft' } });
    input.focus();

    await act(() => vi.advanceTimersByTimeAsync(599_999));
    expect(fetch).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(new URL(String(fetch.mock.calls[0][0])).pathname).toBe(
      '/session/refresh',
    );
    expect(renders).not.toHaveBeenCalled();
    expect(current!.status).toBe('authenticated');

    const verification = deferred<{ payload: { sub: string } }>();
    jwtVerify.mockReturnValueOnce(verification.promise);
    await act(async () => {
      network.resolve(response());
    });
    expect(renders).not.toHaveBeenCalled();
    expect(current!.isAuthenticated).toBe(true);
    expect(current!.session?.accessToken).toBe('access-1');

    await act(async () => {
      verification.resolve({ payload: { sub: 'user-1' } });
    });
    expect(renders).not.toHaveBeenCalled();
    expect(current!).toBe(context);
    expect(current!.session).toBe(session);
    expect(current!.session?.accessToken).toBe('access-2');
    expect(current!.session?.expiresAt).toBe('2026-09-16T00:25:00.000Z');
    expect(screen.getByLabelText('draft')).toBe(input);
    expect(input).toHaveFocus();
    expect(input).toHaveValue('keep this draft');
    expect(mount).toHaveBeenCalledOnce();
    expect(unmount).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Read token'));
    expect(readToken).toHaveBeenLastCalledWith('access-2');
  });

  it('keeps an open dialog mounted while a superseded refresh recovers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'session_superseded' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    const childRenders = vi.fn();
    render(
      <AuthMiniProvider authMiniBaseUrl={issuer} autoRedirectToLogin={false}>
        <RefreshDialog childRenders={childRenders} />
      </AuthMiniProvider>,
    );
    await act(async () => {});

    const dialog = screen.getByRole('dialog', { name: 'workspace dialog' });
    const input = screen.getByLabelText('dialog draft');
    fireEvent.change(input, { target: { value: 'keep this dialog open' } });
    input.focus();
    childRenders.mockClear();

    await act(() => vi.advanceTimersByTimeAsync(600_000));
    await act(() => vi.advanceTimersByTimeAsync(50));

    expect(childRenders).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'workspace dialog' })).toBe(
      dialog,
    );
    expect(input).toHaveFocus();
    expect(input).toHaveValue('keep this dialog open');
    expect(observedContext!.isAuthenticated).toBe(true);
    expect(observedContext!.status).toBe('authenticated');
  });

  it('stays authenticated on an unrelated parent render while verifying a refreshed JWT', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response()));
    const view = await start();
    const verification = deferred<{ payload: { sub: string } }>();
    jwtVerify.mockReturnValueOnce(verification.promise);
    await act(() => vi.advanceTimersByTimeAsync(600_000));
    view.rerender(
      <AuthMiniProvider authMiniBaseUrl={issuer} autoRedirectToLogin={false}>
        <Application />
      </AuthMiniProvider>,
    );
    expect(screen.getByTestId('auth')).toHaveTextContent('true');
    expect(unmount).not.toHaveBeenCalled();
    const renderCount = renders.mock.calls.length;
    await act(async () => {
      verification.resolve({ payload: { sub: 'user-1' } });
    });
    expect(renders).toHaveBeenCalledTimes(renderCount);
    expect(jwtVerify).toHaveBeenCalledTimes(2);
  });

  it('notifies consumers if the refreshed JWT fails verification', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response()));
    await start();
    jwtVerify.mockRejectedValueOnce(new Error('invalid signature'));
    await act(() => vi.advanceTimersByTimeAsync(600_000));
    expect(screen.getByTestId('auth')).toHaveTextContent('false');
    expect(renders).toHaveBeenCalled();
    expect(unmount).toHaveBeenCalledOnce();
  });

  it('keeps a transient failure and retry silent, but publishes a rejected refresh session', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'internal_error' }), {
          status: 500,
        }),
      )
      .mockResolvedValueOnce(response())
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'invalid_refresh_token' }), {
          status: 401,
        }),
      );
    vi.stubGlobal('fetch', fetch);
    await start();
    await act(() => vi.advanceTimersByTimeAsync(600_000));
    expect(renders).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(renders).not.toHaveBeenCalled();
    expect(current!.session?.accessToken).toBe('access-2');
    await act(() => vi.advanceTimersByTimeAsync(600_000));
    expect(screen.getByTestId('auth')).toHaveTextContent('false');
    expect(current!.status).toBe('anonymous');
  });

  it('ignores a verification that completes after logout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response()));
    await start();
    const verification = deferred<{ payload: { sub: string } }>();
    jwtVerify.mockReturnValueOnce(verification.promise);
    await act(() => vi.advanceTimersByTimeAsync(600_000));
    act(() => current!.sdk!.session.clearLocal());
    expect(current!.isAuthenticated).toBe(false);
    renders.mockClear();
    await act(async () => {
      verification.resolve({ payload: { sub: 'user-1' } });
    });
    expect(renders).not.toHaveBeenCalled();
    expect(current!.status).toBe('anonymous');
    expect(current!.session?.accessToken).toBeNull();
  });

  it("adopts another tab's verified token rotation without rendering", async () => {
    vi.stubGlobal('fetch', vi.fn());
    await start();
    const next = {
      ...initialSession,
      accessToken: 'access-tab',
      refreshToken: 'refresh-tab',
    };
    localStorage.setItem(storageKey, JSON.stringify(next));
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: storageKey,
          newValue: JSON.stringify(next),
          storageArea: localStorage,
        }),
      );
    });
    expect(renders).not.toHaveBeenCalled();
    expect(current!.isAuthenticated).toBe(true);
    expect(current!.session?.accessToken).toBe('access-tab');
    expect(jwtVerify).toHaveBeenLastCalledWith(
      'access-tab',
      expect.any(Function),
      expect.any(Object),
    );
  });

  it('publishes updated permission claims even when the session ID is unchanged', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response()));
    await start();
    jwtVerify.mockResolvedValueOnce({
      payload: { sub: 'user-1', auth_admin: true },
    });
    await act(() => vi.advanceTimersByTimeAsync(600_000));
    expect(renders).toHaveBeenCalledOnce();
    expect(current!.isAuthenticated).toBe(true);
    expect(current!.session?.accessToken).toBe('access-2');
  });

  it("publishes a different session and ignores the previous session's pending verification", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response()));
    await start();
    const verification = deferred<{ payload: { sub: string } }>();
    jwtVerify.mockReturnValueOnce(verification.promise);
    await act(() => vi.advanceTimersByTimeAsync(600_000));
    await act(async () => {
      await current!.sdk!.session.acceptRedirectCallback({
        session_id: 'session-other',
        access_token: 'access-other',
        refresh_token: 'refresh-other',
        expires_in: 900,
      });
    });
    expect(current!.session?.sessionId).toBe('session-other');
    expect(current!.isAuthenticated).toBe(true);
    renders.mockClear();
    await act(async () => {
      verification.resolve({ payload: { sub: 'user-1' } });
    });
    expect(renders).not.toHaveBeenCalled();
    expect(current!.session?.accessToken).toBe('access-other');
  });
});
