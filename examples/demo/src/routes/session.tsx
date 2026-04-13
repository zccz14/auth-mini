import { useCallback, useEffect, useRef, useState } from 'react';
import { FlowCard } from '@/components/app/flow-card';
import { JsonPanel } from '@/components/app/json-panel';
import { Button } from '@/components/ui/button';
import { useDemo } from '@/app/providers/demo-provider';

type DemoMe = Awaited<
  ReturnType<NonNullable<ReturnType<typeof useDemo>['sdk']>['me']['fetch']>
>;

type SessionCapability = 'manageable' | 'not-manageable' | 'legacy-token';

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4)) % 4;
  return atob(`${normalized}${'='.repeat(padding)}`);
}

function getAccessTokenPayload(accessToken: string) {
  const [, payloadSegment] = accessToken.split('.');
  if (!payloadSegment) return null;

  try {
    return asRecord(JSON.parse(decodeBase64Url(payloadSegment)));
  } catch {
    return null;
  }
}

function getSessionCapability(accessToken: string): SessionCapability {
  const payload = getAccessTokenPayload(accessToken);
  if (!payload) {
    return 'not-manageable';
  }

  if (!('amr' in payload)) {
    return 'legacy-token';
  }

  const amr = Array.isArray(payload.amr)
    ? payload.amr.filter((value: unknown): value is string => typeof value === 'string')
    : [];

  if (amr.length === 0) {
    return 'not-manageable';
  }

  return amr.includes('email_otp') || amr.includes('webauthn')
    ? 'manageable'
    : 'not-manageable';
}

function formatNullable(value: string | null | undefined) {
  return value == null ? 'Unavailable' : value;
}

function truncateUserAgent(value: string | null | undefined) {
  if (value == null) {
    return 'Unavailable';
  }

  return value.length > 48 ? `${value.slice(0, 45)}...` : value;
}

export function SessionRoute() {
  const { clearLocalAuthState, config, sdk, session } = useDemo();
  const [me, setMe] = useState<DemoMe | null>(null);
  const [loadingMe, setLoadingMe] = useState(false);
  const [meError, setMeError] = useState('');
  const [meWarning, setMeWarning] = useState('');
  const loadMeRequestIdRef = useRef(0);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [tableError, setTableError] = useState('');
  const rows = me?.active_sessions ?? [];

  const loadMe = useCallback(async (options?: { warningMessage?: string }) => {
    const requestId = loadMeRequestIdRef.current + 1;
    loadMeRequestIdRef.current = requestId;

    if (!sdk || config.status !== 'ready' || !session.authenticated) {
      setMe(null);
      setMeError('');
      setMeWarning('');
      setLoadingMe(false);
      return;
    }

    setLoadingMe(true);
    setMeError('');
    if (!options?.warningMessage) {
      setMeWarning('');
    }

    try {
      const nextMe = await sdk.me.fetch();
      if (loadMeRequestIdRef.current !== requestId) {
        return;
      }

      setMe(nextMe);
      setMeWarning('');
    } catch (cause) {
      if (loadMeRequestIdRef.current !== requestId) {
        return;
      }

      if (options?.warningMessage) {
        setMeWarning(options.warningMessage);
        return;
      }

      setMe(null);
      setMeError(
        cause instanceof Error ? cause.message : 'Unable to load current user.',
      );
    } finally {
      if (loadMeRequestIdRef.current === requestId) {
        setLoadingMe(false);
      }
    }
  }, [config.status, sdk, session.authenticated, session.sessionId]);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  async function kickSession(sessionId: string) {
    if (pendingSessionId !== null) {
      return;
    }

    if (!sdk || !session.accessToken || config.status !== 'ready') {
      setTableError('Unable to kick session.');
      return;
    }

    setTableError('');
    setPendingSessionId(sessionId);

    try {
      let accessToken = session.accessToken;
      const capability = getSessionCapability(accessToken);

      if (capability === 'legacy-token' && session.refreshToken) {
        const refreshed = await sdk.session.refresh();
        if (typeof refreshed.accessToken === 'string') {
          accessToken = refreshed.accessToken;
        }
      }

      if (getSessionCapability(accessToken) !== 'manageable') {
        throw new Error('Unable to kick session.');
      }

      const response = await fetch(
        new URL(`/session/${sessionId}/logout`, config.authOrigin),
        {
          method: 'POST',
          headers: { authorization: `Bearer ${accessToken}` },
        },
      );

      if (!response.ok) {
        throw new Error('Unable to kick session.');
      }

      await loadMe({
        warningMessage: 'Session updated, but current user data could not be refreshed.',
      });
      setTableError('');
    } catch {
      setTableError('Unable to kick session.');
    } finally {
      setPendingSessionId(null);
    }
  }

  return (
    <FlowCard
      title="Session"
      description="Inspect the current auth snapshot and clear local state when needed."
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm text-slate-600">
            The session page owns its own authenticated profile fetch so refreshes
            stay local to this route.
          </p>
          <Button onClick={() => void clearLocalAuthState()}>
            Clear local auth state
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <JsonPanel
            title="Current session"
            value={session ?? { status: config.status }}
          />
          <JsonPanel title="Current user" value={me} />
        </div>

        {loadingMe ? (
          <p className="text-sm text-slate-600">Loading current user…</p>
        ) : null}
        {meError ? <p className="text-sm text-rose-600">{meError}</p> : null}
        {meWarning ? <p className="text-sm text-amber-700">{meWarning}</p> : null}

        <section
          aria-labelledby="active-sessions-heading"
          className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <div className="space-y-1">
            <h3 id="active-sessions-heading" className="text-base font-semibold text-slate-950">
              Active sessions
            </h3>
            <p className="text-sm text-slate-600">
              Review every active session in the current snapshot and kick peers as needed.
            </p>
          </div>

          {tableError ? <p className="text-sm text-rose-600">Unable to kick session.</p> : null}

          {!session.authenticated ? (
            <p className="text-sm text-slate-600">No active sessions.</p>
          ) : meError ? null : rows.length === 0 ? (
            <p className="text-sm text-slate-600">No active sessions.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="px-3 py-2 font-medium">Session ID</th>
                    <th className="px-3 py-2 font-medium">Auth Method</th>
                    <th className="px-3 py-2 font-medium">Created At</th>
                    <th className="px-3 py-2 font-medium">Expires At</th>
                    <th className="px-3 py-2 font-medium">IP</th>
                    <th className="px-3 py-2 font-medium">User-Agent</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((activeSession) => {
                    const isPending = pendingSessionId === activeSession.id;

                    return (
                      <tr key={activeSession.id} className="border-b border-slate-200 last:border-b-0">
                        <td className="px-3 py-2 font-mono text-xs text-slate-950">
                          {activeSession.id}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-950">
                          {activeSession.auth_method}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-950">
                          {activeSession.created_at}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-950">
                          {activeSession.expires_at}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-950">
                          {formatNullable(activeSession.ip)}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-950">
                          {truncateUserAgent(activeSession.user_agent)}
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            disabled={isPending}
                            onClick={() => void kickSession(activeSession.id)}
                          >
                            {isPending ? 'Kicking...' : 'Kick'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </FlowCard>
  );
}
