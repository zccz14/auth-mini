import { createRequestError } from './errors.js';
import type { FetchLike } from './types.js';

type JsonRequestOptions = {
  accessToken?: string | null;
  body?: unknown;
};

export type HttpClient = ReturnType<typeof createHttpClient>;

export function createHttpClient(input: { baseUrl: string; fetch: FetchLike }) {
  const baseUrl = new URL(input.baseUrl);
  baseUrl.pathname = baseUrl.pathname.endsWith('/')
    ? baseUrl.pathname
    : `${baseUrl.pathname}/`;

  return {
    getJson<T>(path: string, options: JsonRequestOptions = {}): Promise<T> {
      return sendJson<T>('GET', path, options);
    },
    postJson<T>(
      path: string,
      body?: unknown,
      options: JsonRequestOptions = {},
    ): Promise<T> {
      return sendJson<T>('POST', path, { ...options, body });
    },
  };

  async function sendJson<T>(
    method: 'GET' | 'POST',
    path: string,
    options: JsonRequestOptions,
  ): Promise<T> {
    const response = await input.fetch(
      new URL(stripLeadingSlash(path), baseUrl),
      {
        method,
        headers: createHeaders(options),
        ...(options.body === undefined
          ? {}
          : {
              body: JSON.stringify(options.body),
            }),
      },
    );
    const payload = await readJson(response);

    if (!response.ok) {
      throw createRequestError(response.status, payload);
    }

    return payload as T;
  }

  function createHeaders(options: JsonRequestOptions): HeadersInit {
    const headers: Record<string, string> = {
      accept: 'application/json',
    };

    if (options.body !== undefined) {
      headers['content-type'] = 'application/json';
    }

    if (options.accessToken) {
      headers.authorization = `Bearer ${options.accessToken}`;
    }

    return headers;
  }

  function stripLeadingSlash(path: string): string {
    return path.replace(/^\/+/, '');
  }

  async function readJson(response: Response) {
    const text = await response.text();

    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
