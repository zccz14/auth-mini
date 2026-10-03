import { describe, expect, it, vi } from 'vitest';
import { measureClockOffset } from '../src/time-sync.js';

const issuer = 'https://auth.example.test';

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('measureClockOffset', () => {
  it('derives the offset from the round trip midpoint', async () => {
    const times = [1000, 1400];
    const fetchImpl = vi.fn(async () => jsonResponse({ now_ms: 1_000_000 }));
    const sample = await measureClockOffset({
      issuer,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: () => times.shift()!,
      samples: 1,
    });

    expect(sample).toEqual({
      offsetMs: 1_000_000 - (1000 + 200),
      roundTripMs: 400,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      `${issuer}/time`,
      expect.objectContaining({ cache: 'no-store' }),
    );
  });

  it('keeps the sample with the smallest round trip', async () => {
    const ticks = [1000, 4000, 10_000, 10_100];
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ now_ms: 5_000_000 }))
      .mockResolvedValueOnce(jsonResponse({ now_ms: 6_000_000 }));
    const sample = await measureClockOffset({
      issuer,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: () => ticks.shift()!,
      samples: 2,
    });

    expect(sample).toEqual({
      offsetMs: 6_000_000 - (10_000 + 50),
      roundTripMs: 100,
    });
  });

  it('returns null when the endpoint is unavailable or the payload is unusable', async () => {
    const rejecting = vi.fn(async () => {
      throw new TypeError('network down');
    });
    expect(
      await measureClockOffset({
        issuer,
        fetchImpl: rejecting as unknown as typeof fetch,
        samples: 1,
      }),
    ).toBeNull();

    const failing = vi.fn(async () => jsonResponse({ error: 'internal' }, 500));
    expect(
      await measureClockOffset({
        issuer,
        fetchImpl: failing as unknown as typeof fetch,
        samples: 1,
      }),
    ).toBeNull();

    const malformed = vi.fn(async () => jsonResponse({ now: 5 }));
    expect(
      await measureClockOffset({
        issuer,
        fetchImpl: malformed as unknown as typeof fetch,
        samples: 1,
      }),
    ).toBeNull();
  });

  it('rejects offsets beyond a sane bound', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ now_ms: 10 ** 16 }));
    expect(
      await measureClockOffset({
        issuer,
        fetchImpl: fetchImpl as unknown as typeof fetch,
        now: () => 0,
        samples: 1,
      }),
    ).toBeNull();
  });

  it('gives up on requests that exceed the timeout', async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = vi.fn(
        (_url: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }),
      );
      const pending = measureClockOffset({
        issuer,
        fetchImpl: fetchImpl as unknown as typeof fetch,
        samples: 1,
        timeoutMs: 1000,
      });
      await vi.advanceTimersByTimeAsync(1000);
      await expect(pending).resolves.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
