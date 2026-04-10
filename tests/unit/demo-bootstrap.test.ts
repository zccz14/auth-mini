import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type FakeEvent = {
  type: string;
  preventDefault?: () => void;
};

type FakeListener = (event: FakeEvent) => void | Promise<void>;

type FakeElement = {
  tagName: string;
  id: string;
  value: string;
  textContent: string;
  innerHTML: string;
  hidden: boolean;
  disabled: boolean;
  className: string;
  dataset: Record<string, string>;
  children: FakeElement[];
  classList: {
    add: (...names: string[]) => void;
    remove: (...names: string[]) => void;
  };
  append: (...nodes: FakeElement[]) => void;
  appendChild: (node: FakeElement) => FakeElement;
  replaceChildren: (...nodes: FakeElement[]) => void;
  addEventListener: (type: string, listener: FakeListener) => void;
  dispatchEvent: (event: FakeEvent) => Promise<void>;
  click: () => Promise<void>;
  hasAttribute: (name: string) => boolean;
  src?: string;
};

type FakeStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

type FakeLocation = URL & { reload: ReturnType<typeof vi.fn> };

type FakeHistory = {
  replaceState: (_state: unknown, _title: string, nextUrl: string) => void;
};

type FakeSdk = {
  ready: Promise<void>;
  email: {
    start: (input?: unknown) => Promise<unknown>;
    verify: (input?: unknown) => Promise<unknown>;
  };
  webauthn: {
    register: () => Promise<unknown>;
    authenticate: () => Promise<unknown>;
  };
  me: {
    get: () => unknown;
    reload: () => Promise<unknown>;
  };
  session: {
    getState: () => typeof sampleSdkState;
    onChange: (listener: () => void) => void;
    logout: () => Promise<void>;
  };
};

type FakeWindow = {
  __AUTH_MINI_TEST_HOOKS__?: {
    loadSdkScript?: () => Promise<FakeSdk>;
  };
  PublicKeyCredential?: unknown;
  location: FakeLocation;
  history: FakeHistory;
  localStorage: FakeStorage;
};

type FakeDocument = {
  body: FakeElement;
  defaultView: FakeWindow | null;
  createElement: (tagName: string) => FakeElement;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
};

type TestEnvironment = {
  document: FakeDocument;
  history: FakeHistory;
  localStorage: FakeStorage;
  location: FakeLocation;
  window: FakeWindow;
};

type TestGlobals = {
  [key: string]: unknown;
  document?: unknown;
  window?: unknown;
  history?: unknown;
  localStorage?: unknown;
  location?: unknown;
  Event?: unknown;
  __AUTH_MINI_TEST_HOOKS__?: FakeWindow['__AUTH_MINI_TEST_HOOKS__'];
};

const testGlobals = globalThis as unknown as TestGlobals;

const sampleSdkState = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  status: 'authenticated',
};

describe('demo bootstrap', () => {
  let previousDocument: TestGlobals['document'];
  let previousWindow: TestGlobals['window'];
  let previousHistory: TestGlobals['history'];
  let previousLocalStorage: TestGlobals['localStorage'];
  let previousLocation: TestGlobals['location'];
  let previousEvent: TestGlobals['Event'];

  beforeEach(() => {
    previousDocument = testGlobals.document;
    previousWindow = testGlobals.window;
    previousHistory = testGlobals.history;
    previousLocalStorage = testGlobals.localStorage;
    previousLocation = testGlobals.location;
    previousEvent = testGlobals.Event;
  });

  afterEach(() => {
    restoreGlobal('document', previousDocument);
    restoreGlobal('window', previousWindow);
    restoreGlobal('history', previousHistory);
    restoreGlobal('localStorage', previousLocalStorage);
    restoreGlobal('location', previousLocation);
    restoreGlobal('Event', previousEvent);
    Reflect.deleteProperty(testGlobals, '__AUTH_MINI_TEST_HOOKS__');
  });

  it('boots the page from window.location and renders docs even when sdk loading fails', async () => {
    const env = createTestEnvironment(
      'https://docs.example.com/demo/?sdk-origin=https://auth.example.com',
    );
    const { bootstrapDemoPage } = await import('../../demo/bootstrap.js');

    await runBootstrap(bootstrapDemoPage, env, {
      loadSdkScript: async () => {
        throw new Error('network down');
      },
    });

    expect(
      env.document.querySelector('#origin-command')?.textContent,
    ).toContain(
      'npx auth-mini origin add ./auth-mini.sqlite --value https://docs.example.com',
    );
    expect(
      env.document.querySelector('#origin-command')?.textContent,
    ).not.toContain('--origin https://docs.example.com');
    expect(
      env.document.querySelector('#api-reference-list')?.textContent,
    ).toContain('/email/start');
    expect(
      env.document.querySelector('#api-reference-list')?.textContent,
    ).toContain('rp_id');
    expect(
      env.document.querySelector('#api-reference-list article h3')?.tagName,
    ).toBe('H3');
    expect(
      env.document.querySelector('#api-reference-list article details summary')
        ?.tagName,
    ).toBe('SUMMARY');
    expect(
      env.document.querySelector('#latest-response')?.textContent,
    ).toContain('AuthMini SDK did not load');
  });

  it('builds the sdk from an injected factory without appending a script tag', async () => {
    const env = createTestEnvironment(
      'https://docs.example.com/demo/?sdk-origin=https://auth.example.com',
    );
    const { loadSdkScript } = await import('../../demo/main.js');
    const sdk = createFakeSdk();
    const createSdk = vi.fn(() => sdk);

    await expect(
      loadSdkScript(
        { sdkOrigin: 'https://auth.example.com' },
        { createSdk, document: env.document },
      ),
    ).resolves.toBe(sdk);

    expect(createSdk).toHaveBeenCalledWith('https://auth.example.com');
    expect(env.document.body.children).toHaveLength(0);
  });

  it('keeps actions safe before sdk is attached', async () => {
    const env = createTestEnvironment(
      'https://docs.example.com/demo/?sdk-origin=https://auth.example.com',
    );
    const { bootstrapDemoPage } = await import('../../demo/bootstrap.js');

    const startup = runBootstrap(bootstrapDemoPage, env, {
      loadSdkScript: () => new Promise(() => {}),
    });

    expect(env.document.querySelector('#email-start-button')?.disabled).toBe(
      true,
    );
    await expect(
      env.document.querySelector('#email-start-button')!.click(),
    ).resolves.toBeUndefined();
    expect(
      env.document.querySelector('#latest-response')?.textContent,
    ).toContain('not ready yet');
    expect(env.document.querySelector('#clear-state-button')?.disabled).toBe(
      true,
    );

    void startup;
  });

  it('stays neutral when no sdk-origin is configured', async () => {
    const env = createTestEnvironment('https://docs.example.com/demo/');
    const { bootstrapDemoPage } = await import('../../demo/bootstrap.js');

    await runBootstrap(bootstrapDemoPage, env, {
      location: undefined,
    });

    expect(env.document.querySelector('#config-error')?.textContent).toContain(
      'Add ?sdk-origin=',
    );
    expect(
      env.document.querySelector('#latest-response')?.textContent,
    ).toContain('Add ?sdk-origin=');
    expect(env.document.querySelector('#status-config')?.textContent).toBe(
      'Waiting for sdk-origin',
    );
    expect(env.document.querySelector('#origin-command')?.textContent).toBe('');
    expect(env.document.querySelector('#email-start-button')?.disabled).toBe(
      true,
    );
  });

  it('keeps actions disabled until sdk.ready settles', async () => {
    const env = createTestEnvironment(
      'https://docs.example.com/demo/?sdk-origin=https://auth.example.com',
    );
    const { bootstrapDemoPage } = await import('../../demo/bootstrap.js');
    const ready = createDeferred();
    const sdk = createFakeSdk({ ready: ready.promise });

    const startup = runBootstrap(bootstrapDemoPage, env, {
      loadSdkScript: async () => sdk,
    });

    expect(env.document.querySelector('#email-start-button')?.disabled).toBe(
      true,
    );
    await expect(
      env.document.querySelector('#clear-state-button')!.click(),
    ).resolves.toBeUndefined();
    expect(
      env.document.querySelector('#latest-response')?.textContent,
    ).toContain('not ready yet');

    ready.resolve?.();
    await startup;

    expect(env.document.querySelector('#email-start-button')?.disabled).toBe(
      false,
    );
    expect(env.document.querySelector('#clear-state-button')?.disabled).toBe(
      false,
    );
  });

  it('re-enables actions after sdk attachment', async () => {
    const env = createTestEnvironment(
      'https://docs.example.com/demo/?sdk-origin=https://auth.example.com',
    );
    const { bootstrapDemoPage } = await import('../../demo/bootstrap.js');
    const sdk = createFakeSdk();

    await runBootstrap(bootstrapDemoPage, env, {
      loadSdkScript: async () => sdk,
    });

    expect(env.document.querySelector('#email-start-button')?.disabled).toBe(
      false,
    );
    expect(env.document.querySelector('#clear-state-button')?.disabled).toBe(
      false,
    );
  });

  it('shows a cors-oriented failure message when sdk requests reject after startup', async () => {
    const env = createTestEnvironment(
      'https://docs.example.com/demo/?sdk-origin=https://auth.example.com',
    );
    const { bootstrapDemoPage } = await import('../../demo/bootstrap.js');

    const sdk = createFakeSdk({
      email: {
        start: async () => {
          throw new TypeError('Failed to fetch');
        },
      },
    });

    await runBootstrap(bootstrapDemoPage, env, {
      loadSdkScript: async () => sdk,
    });

    env.document.querySelector('#email')!.value = 'user@example.com';
    await env.document.querySelector('#email-start-button')!.click();

    expect(
      env.document.querySelector('#latest-response')?.textContent,
    ).toContain('Failed to fetch');
    expect(env.document.querySelector('#setup-warning')?.textContent).toContain(
      'origin add',
    );
  });

  it('shows a webauthn-environment explanation when passkeys are unavailable', async () => {
    const env = createTestEnvironment(
      'http://127.0.0.1:8080/demo/?sdk-origin=http://127.0.0.1:7777',
      { publicKeyCredential: undefined },
    );
    const { bootstrapDemoPage } = await import('../../demo/bootstrap.js');
    const sdk = createFakeSdk();

    await runBootstrap(bootstrapDemoPage, env, {
      loadSdkScript: async () => sdk,
    });

    expect(env.document.querySelector('#register-output')?.textContent).toMatch(
      /passkeys/i,
    );
    expect(
      env.document.querySelector('#authenticate-output')?.textContent,
    ).toMatch(/passkeys/i);
  });

  it('keeps passkey actions enabled when the browser supports webauthn', async () => {
    const env = createTestEnvironment(
      'http://127.0.0.1:8080/demo/?sdk-origin=http://127.0.0.1:7777',
    );
    const { bootstrapDemoPage } = await import('../../demo/bootstrap.js');
    const sdk = createFakeSdk();

    await runBootstrap(bootstrapDemoPage, env, {
      loadSdkScript: async () => sdk,
    });

    expect(env.document.querySelector('#register-button')?.disabled).toBe(
      false,
    );
    expect(env.document.querySelector('#authenticate-button')?.disabled).toBe(
      false,
    );
    expect(
      env.document.querySelector('#register-output')?.textContent,
    ).not.toContain('localhost');
    expect(
      env.document.querySelector('#authenticate-output')?.textContent,
    ).not.toContain('localhost');
  });

  it('real demo/main.js bootstraps from window.location on import', async () => {
    const env = createTestEnvironment(
      'http://localhost/demo/?sdk-origin=https://auth.example.com',
    );
    applyGlobals(env);
    env.window.__AUTH_MINI_TEST_HOOKS__ = {
      loadSdkScript: async () => createFakeSdk(),
    };

    vi.resetModules();
    await import('../../demo/main.js');

    expect(
      env.document.querySelector('#origin-command')?.textContent,
    ).toContain(
      'npx auth-mini origin add ./auth-mini.sqlite --value http://localhost',
    );
    expect(
      env.document.querySelector('#sdk-script-snippet')?.textContent,
    ).toContain("createBrowserSdk('https://auth.example.com')");
    expect(env.document.querySelector('#hero-capabilities li')?.tagName).toBe(
      'LI',
    );
  });

  it('changing sdk-origin preserves pathname/hash and forces a clean page reload', async () => {
    const env = createTestEnvironment(
      'https://docs.example.com/demo/index.html?sdk-origin=https://auth-a.example.com#playground',
    );
    const { bootstrapDemoPage } = await import('../../demo/bootstrap.js');
    const sdk = createFakeSdk();

    await runBootstrap(bootstrapDemoPage, env, {
      loadSdkScript: async () => sdk,
    });

    env.document.querySelector('#sdk-origin-input')!.value =
      'https://auth-b.example.com';
    await env.document.querySelector('#sdk-origin-input')!.dispatchEvent({
      type: 'change',
      preventDefault() {},
    });

    expect(env.window.location.search).toContain(
      'sdk-origin=https%3A%2F%2Fauth-b.example.com',
    );
    expect(env.window.location.pathname).toBe('/demo/index.html');
    expect(env.window.location.hash).toBe('#playground');
    expect(env.window.location.reload).toHaveBeenCalledTimes(1);
  });
});

function runBootstrap(
  bootstrapDemoPage: unknown,
  env: TestEnvironment,
  overrides: Partial<{
    location: FakeLocation | undefined;
    loadSdkScript: () => Promise<FakeSdk>;
  }> = {},
) {
  return (
    bootstrapDemoPage as (options: Record<string, unknown>) => Promise<void>
  )({
    document: env.document,
    history: env.history,
    localStorage: env.localStorage,
    location: overrides.location ?? env.location,
    window: env.window,
    ...overrides,
  });
}

function createTestEnvironment(
  urlString: string,
  options: { publicKeyCredential?: unknown } = {},
): TestEnvironment {
  const location = Object.assign(new URL(urlString), { reload: vi.fn() });
  const localStorage = createStorage();
  const document = createFakeDocument(options);
  const history: FakeHistory = {
    replaceState(_state: unknown, _title: string, nextUrl: string) {
      const next = new URL(nextUrl, location.origin);
      location.pathname = next.pathname;
      location.search = next.search;
      location.hash = next.hash;
    },
  };
  const window: FakeWindow = {
    PublicKeyCredential:
      'publicKeyCredential' in options
        ? options.publicKeyCredential
        : function PublicKeyCredential() {},
    location,
    history,
    localStorage,
  };

  document.defaultView = window;

  return {
    document,
    history,
    localStorage,
    location,
    window,
  };
}

function applyGlobals(env: TestEnvironment) {
  setTestGlobal(
    'Event',
    class FakeEventClass {
      type: string;

      constructor(type: string) {
        this.type = type;
      }
    },
  );
  setTestGlobal('document', env.document);
  setTestGlobal('window', env.window);
  setTestGlobal('history', env.history);
  setTestGlobal('localStorage', env.localStorage);
  setTestGlobal('location', env.location);
  setTestGlobal(
    '__AUTH_MINI_TEST_HOOKS__',
    env.window.__AUTH_MINI_TEST_HOOKS__,
  );
}

function restoreGlobal(
  name: keyof TestGlobals,
  value: TestGlobals[keyof TestGlobals],
) {
  if (value === undefined) {
    Reflect.deleteProperty(testGlobals, name);
    return;
  }

  setTestGlobal(name, value);
}

function setTestGlobal<K extends keyof TestGlobals>(
  name: K,
  value: TestGlobals[K],
) {
  Object.defineProperty(testGlobals, name, {
    value,
    configurable: true,
    writable: true,
  });
}

function createStorage(): FakeStorage {
  const values = new Map<string, string>();
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, String(value));
    },
    removeItem(key: string) {
      values.delete(key);
    },
  };
}

function createDeferred() {
  let resolve: (() => void) | undefined;
  const promise = new Promise<void>((nextResolve) => {
    resolve = nextResolve;
  });

  return {
    promise,
    resolve,
  };
}

function createFakeSdk(
  overrides: Partial<{
    ready: Promise<void>;
    email: Partial<FakeSdk['email']>;
    webauthn: Partial<FakeSdk['webauthn']>;
    me: Partial<FakeSdk['me']>;
    session: Partial<FakeSdk['session']>;
  }> = {},
): FakeSdk {
  const sessionState = { ...sampleSdkState };
  const listeners: Array<() => void> = [];

  const sdk = {
    ready: Promise.resolve(),
    email: {
      start: async () => ({ ok: true }),
      verify: async () => ({ session: 'email-session' }),
      ...overrides.email,
    },
    webauthn: {
      register: async () => ({ ok: true }),
      authenticate: async () => ({ session: 'passkey-session' }),
      ...overrides.webauthn,
    },
    me: {
      get: () => ({ email: 'user@example.com' }),
      reload: async () => ({ email: 'user@example.com' }),
      ...overrides.me,
    },
    session: {
      getState: () => sessionState,
      onChange: (listener: () => void) => listeners.push(listener),
      logout: async () => {
        sessionState.status = 'anonymous';
      },
      ...overrides.session,
    },
  };

  return { ...sdk, ...overrides } as FakeSdk;
}

function createFakeDocument(): FakeDocument {
  const elements = new Map<string, FakeElement>();
  const body = createElement('body');
  body.append = (...nodes: FakeElement[]) => {
    body.children.push(...nodes);
  };
  body.appendChild = (node: FakeElement) => {
    body.append(node);
    return node;
  };

  const document = {
    body,
    defaultView: null,
    createElement,
    querySelector(selector: string) {
      if (selector === 'script[data-auth-mini-sdk]') {
        return (
          body.children.find((node) => node.dataset.miniAuthSdk === 'true') ??
          null
        );
      }
      if (elements.has(selector)) {
        return elements.get(selector) ?? null;
      }

      return queryNested(selector);
    },
    querySelectorAll(selector: string) {
      return queryNestedAll(selector);
    },
  };

  for (const id of [
    'base-url',
    'sdk-origin-input',
    'email',
    'otp-code',
    'access-token',
    'refresh-token',
    'request-id',
    'latest-request',
    'latest-response',
    'page-origin',
    'page-rp-id',
    'config-error',
    'setup-warning',
    'origin-command',
    'sdk-script-snippet',
    'jose-snippet',
    'email-start-output',
    'email-verify-output',
    'register-output',
    'authenticate-output',
    'email-start-button',
    'email-verify-button',
    'register-button',
    'authenticate-button',
    'clear-state-button',
    'status-config',
    'status-email-start',
    'status-email-verify',
    'status-register',
    'status-authenticate',
    'hero-title',
    'hero-value-prop',
    'hero-audience',
    'hero-capabilities',
    'how-it-works-list',
    'api-reference-list',
    'backend-notes-list',
    'deployment-notes-list',
    'backend-notes-disclosure',
  ]) {
    const element = createElement(id.includes('list') ? 'ul' : 'div');
    element.id = id;
    if (
      id.includes('button') ||
      id === 'clear-state-button' ||
      id === 'sdk-origin-input' ||
      id === 'email' ||
      id === 'otp-code' ||
      id === 'access-token' ||
      id === 'refresh-token' ||
      id === 'request-id' ||
      id === 'base-url'
    ) {
      element.value = '';
    }
    elements.set(`#${id}`, element);
  }

  const backendNotesSummary = createElement('summary');
  elements.get('#backend-notes-disclosure')?.appendChild(backendNotesSummary);

  return document;

  function createElement(tagName: string): FakeElement {
    const listeners = new Map<string, FakeListener[]>();
    const classNames = new Set<string>();
    const element: FakeElement = {
      tagName: String(tagName).toUpperCase(),
      id: '',
      value: '',
      textContent: '',
      innerHTML: '',
      hidden: false,
      disabled: false,
      className: '',
      dataset: {},
      children: [],
      classList: {
        add(...names: string[]) {
          for (const name of names) {
            classNames.add(name);
          }
          element.className = [...classNames].join(' ');
        },
        remove(...names: string[]) {
          for (const name of names) {
            classNames.delete(name);
          }
          element.className = [...classNames].join(' ');
        },
      },
      append(...nodes: FakeElement[]) {
        this.children.push(...nodes);
        syncText(this);
      },
      appendChild(node: FakeElement) {
        this.children.push(node);
        syncText(this);
        return node;
      },
      replaceChildren(...nodes: FakeElement[]) {
        this.children = [...nodes];
        syncText(this);
      },
      addEventListener(type: string, listener: FakeListener) {
        const bucket = listeners.get(type) ?? [];
        bucket.push(listener);
        listeners.set(type, bucket);
      },
      async dispatchEvent(event: FakeEvent) {
        const bucket = listeners.get(event.type) ?? [];
        for (const listener of bucket) {
          await listener.call(this, event);
        }
      },
      async click() {
        await this.dispatchEvent({
          type: 'click',
          preventDefault() {},
        });
      },
      hasAttribute(name: string) {
        return Boolean(this[name as keyof FakeElement]);
      },
    };

    return element;
  }

  function queryNested(selector: string) {
    return queryNestedAll(selector)[0] ?? null;
  }

  function queryNestedAll(selector: string): FakeElement[] {
    const parts = selector.split(' ');
    const rootSelector = parts.shift() ?? '';
    const rootElement = elements.get(rootSelector);
    if (!rootElement) {
      return [];
    }

    return queryAllWithin(rootElement, parts);
  }

  function queryAllWithin(
    element: FakeElement,
    selectors: string[],
  ): FakeElement[] {
    if (selectors.length === 0) {
      return [element];
    }

    const [selector, ...rest] = selectors;
    const matcher = selector.replace(':last-of-type', '');
    const matches: FakeElement[] = [];
    walk(element, (child) => {
      if (child.tagName?.toLowerCase() === matcher) {
        matches.push(child);
      }
    });

    const filtered = selector.endsWith(':last-of-type')
      ? matches.slice(-1)
      : matches;

    return rest.length === 0
      ? filtered
      : filtered.flatMap((child) => queryAllWithin(child, rest));
  }

  function walk(element: FakeElement, visit: (child: FakeElement) => void) {
    for (const child of element.children) {
      visit(child);
      walk(child, visit);
    }
  }

  function syncText(element: FakeElement) {
    element.textContent = [
      ...element.children.map((child) => child.textContent).filter(Boolean),
    ].join('\n');
  }
}
