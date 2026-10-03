export type ClockOffsetSample = {
  offsetMs: number;
  roundTripMs: number;
};

export type MeasureClockOffsetInput = {
  issuer: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
  samples?: number;
  timeoutMs?: number;
};

const MAX_CLOCK_OFFSET_MS = 366 * 24 * 60 * 60 * 1000;

/**
 * Estimates the offset between the device clock and the Auth Mini clock.
 *
 * Each sample measures one GET {issuer}/time round trip and assumes symmetric
 * latency, so `offset = server time - (sent at + round trip / 2)`. When several
 * samples are taken the one with the smallest round trip wins because it has
 * the least timing uncertainty. Returns null when the endpoint is unreachable
 * or the payload is unusable, so callers fall back to the local clock.
 */
export async function measureClockOffset(
  input: MeasureClockOffsetInput,
): Promise<ClockOffsetSample | null> {
  const fetchImpl = input.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) {
    return null;
  }
  const now = input.now ?? Date.now;
  const samples = Math.max(1, input.samples ?? 2);
  const timeoutMs = input.timeoutMs ?? 3000;
  const url = new URL('/time', input.issuer).toString();

  let best: ClockOffsetSample | null = null;
  for (let index = 0; index < samples; index += 1) {
    const sample = await sampleClockOffset({ fetchImpl, now, timeoutMs, url });
    if (sample && (!best || sample.roundTripMs < best.roundTripMs)) {
      best = sample;
    }
  }
  return best;
}

async function sampleClockOffset(input: {
  fetchImpl: typeof fetch;
  now: () => number;
  timeoutMs: number;
  url: string;
}): Promise<ClockOffsetSample | null> {
  const sentAt = input.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs);
  try {
    const response = await input.fetchImpl(input.url, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    const nowMs =
      typeof payload === 'object' && payload !== null
        ? (payload as { now_ms?: unknown }).now_ms
        : undefined;
    if (typeof nowMs !== 'number' || !Number.isFinite(nowMs)) {
      return null;
    }
    const receivedAt = input.now();
    const roundTripMs = Math.max(0, receivedAt - sentAt);
    const offsetMs = nowMs - (sentAt + roundTripMs / 2);
    if (
      !Number.isFinite(offsetMs) ||
      Math.abs(offsetMs) > MAX_CLOCK_OFFSET_MS
    ) {
      return null;
    }
    return { offsetMs, roundTripMs };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
