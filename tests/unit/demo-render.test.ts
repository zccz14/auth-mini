import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';

type FakeNode = FakeElement;

type FakeElement = {
  id: string;
  tagName: string;
  hidden: boolean;
  textContent: string;
  innerHTML: string;
  className: string;
  value: string;
  children: FakeNode[];
  append: (...nodes: FakeNode[]) => void;
  appendChild: (node: FakeNode) => FakeNode;
  replaceChildren: (...nodes: FakeNode[]) => void;
};

type FakeRenderRoot = {
  createElement: (tagName: string) => FakeElement;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
};

const sampleSetupState = {
  currentOrigin: 'https://docs.example.com',
  suggestedOrigin: 'https://docs.example.com',
  sdkOrigin: 'https://auth.zccz14.com',
  issuer: 'https://auth.zccz14.com',
  jwksUrl: 'https://auth.zccz14.com/jwks',
  configStatus: 'ready',
  configError: '',
  corsWarning:
    'Run npx auth-mini origin add with this page origin before browser calls to the auth server will succeed cross-origin.',
  startupCommand:
    'npx auth-mini origin add ./auth-mini.sqlite --value https://docs.example.com\n' +
    'npx auth-mini start ./auth-mini.sqlite --issuer https://auth.zccz14.com\n' +
    'npx auth-mini smtp add ./auth-mini.sqlite --host smtp.example.com --port 587 --username mailer --password secret --from-email noreply@example.com',
};

describe('demo render helpers', () => {
  beforeEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
    Reflect.deleteProperty(globalThis, 'document');
  });

  it('renders config-dependent snippets into the page', async () => {
    const { buildDemoContent } = await import('../../demo/content.js');
    const { renderContentState } = await import('../../demo/main.js');
    const root = createRenderRoot();
    const content = buildDemoContent(sampleSetupState);

    renderContentState(root, sampleSetupState, content);

    expect(root.querySelector('#origin-command')?.textContent).toContain(
      'npx auth-mini origin add ./auth-mini.sqlite --value https://docs.example.com',
    );
    expect(root.querySelector('#origin-command')?.textContent).not.toContain(
      '--origin https://docs.example.com',
    );
    expect(root.querySelector('#sdk-script-snippet')?.textContent).toContain(
      "createBrowserSdk('https://auth.zccz14.com')",
    );
    expect(root.querySelector('#jose-snippet')?.textContent).toContain(
      "const issuer = 'https://auth.zccz14.com'",
    );
    expect(root.querySelector('#config-error')?.hidden).toBe(true);
  });

  it('renders api reference entries into the page', async () => {
    const { buildDemoContent } = await import('../../demo/content.js');
    const { renderApiReference } = await import('../../demo/main.js');
    const root = createRenderRoot();
    const content = buildDemoContent(sampleSetupState);

    renderApiReference(root, content.apiReference);

    expect(
      root.querySelector('#api-reference-list article h3')?.textContent,
    ).toContain('/email/start');
    expect(root.querySelector('#api-reference-list article')?.className).toBe(
      'panel inset-panel doc-code-card',
    );
    expect(
      root.querySelector('#api-reference-list article p:last-of-type')
        ?.className,
    ).toBe('card-copy');
    expect(
      root.querySelector('#api-reference-list article details summary')
        ?.textContent,
    ).toContain('Show request and response');
    expect(
      root.querySelector('#api-reference-list article details')?.className,
    ).toBe('doc-details');
    expect(
      root.querySelector('#api-reference-list article details pre')
        ?.textContent,
    ).toContain('https://auth.zccz14.com/email/start');
    expect(root.querySelector('#api-reference-list')?.textContent).toContain(
      'rp_id',
    );
    expect(
      root.querySelector('#api-reference-list article details pre:last-of-type')
        ?.textContent,
    ).toContain('{');
    expect(
      root.querySelectorAll('#api-reference-list article').length,
    ).toBeGreaterThan(1);
    expect(
      root.querySelector('#api-reference-list article:last-of-type h3')
        ?.textContent,
    ).toContain('/jwks');
  });

  it('renders list sections as real list items', async () => {
    const { buildDemoContent } = await import('../../demo/content.js');
    const { renderContentState } = await import('../../demo/main.js');
    const root = createRenderRoot();
    const content = buildDemoContent(sampleSetupState);

    renderContentState(root, sampleSetupState, content);

    expect(root.querySelector('#hero-capabilities li')?.textContent).toContain(
      'email OTP',
    );
    expect(root.querySelector('#how-it-works-list li')?.textContent).toContain(
      'page origin',
    );
    expect(root.querySelector('#backend-notes-list li')?.textContent).toContain(
      'Validate iss',
    );
    expect(
      root.querySelector('#deployment-notes-list li')?.textContent,
    ).toContain('GitHub Pages');
    expect(root.querySelector('#known-issues-list')).toBeNull();
  });

  it('renders hero and how-it-works content for the landing-page view', async () => {
    const { buildDemoContent } = await import('../../demo/content.js');
    const { renderContentState } = await import('../../demo/main.js');
    const root = createRenderRoot();
    const content = buildDemoContent(sampleSetupState);

    renderContentState(root, sampleSetupState, content);

    expect(root.querySelector('#hero-title')?.textContent).toContain(
      'auth-mini',
    );
    expect(root.querySelector('#how-it-works-list')?.textContent).toContain(
      'browser SDK',
    );
  });

  it('connects the runtime through an injected sdk factory', async () => {
    const { createDemoRuntime } = await import('../../demo/main.js');
    const root = createRenderRoot();
    const sdk = {
      ready: Promise.resolve(),
      email: { start: async () => ({}), verify: async () => ({}) },
      webauthn: { register: async () => ({}), authenticate: async () => ({}) },
      me: { get: () => null, reload: async () => ({}) },
      session: {
        getState: () => ({
          status: 'anonymous',
          accessToken: null,
          refreshToken: null,
        }),
        onChange: () => () => {},
        logout: async () => {},
      },
    };
    const createSdk = (baseUrl: string) => {
      expect(baseUrl).toBe('https://auth.zccz14.com');
      return sdk;
    };
    const runtime = createDemoRuntime({
      root,
      setupState: sampleSetupState,
      history: { replaceState() {} },
      localStorage: createStorage(),
      location: new URL('https://docs.example.com/demo/'),
      windowObject: {
        location: { reload() {} },
        PublicKeyCredential: undefined,
      },
      createSdk,
    });

    expect(await runtime.connectSdk()).toBe(sdk);
  });

  it('renders progressive disclosure containers for secondary details', async () => {
    const { buildDemoContent } = await import('../../demo/content.js');
    const { renderApiReference, renderContentState } =
      await import('../../demo/main.js');
    const root = createRenderRoot();
    const content = buildDemoContent(sampleSetupState);

    renderContentState(root, sampleSetupState, content);
    renderApiReference(root, content.apiReference);

    expect(
      root.querySelector('#backend-notes-disclosure summary')?.textContent,
    ).toContain('More');
    expect(
      root.querySelector('#backend-notes-disclosure')?.children[0]?.textContent,
    ).toContain('More');
    expect(
      root.querySelector('#backend-notes-disclosure summary')?.tagName,
    ).toBe('SUMMARY');
    expect(
      root.querySelector('#api-reference-list article details summary')
        ?.textContent,
    ).toContain('Show request and response');
    expect(root.querySelector('#backend-notes-list li')?.tagName).toBe('LI');
  });

  it('renders explicit failure reasons for cors and webauthn guidance', async () => {
    const { buildDemoContent } = await import('../../demo/content.js');
    const { renderContentState } = await import('../../demo/main.js');
    const root = createRenderRoot();
    const content = buildDemoContent(sampleSetupState);

    renderContentState(root, sampleSetupState, content);

    expect(root.querySelector('#setup-warning')?.textContent).toContain(
      'origin add',
    );
    expect(root.querySelector('#register-output')?.textContent).not.toContain(
      'localhost',
    );
    expect(
      root.querySelector('#authenticate-output')?.textContent,
    ).not.toContain('localhost');
  });

  it('ignores legacy passkey warning fields during startup rendering', async () => {
    const { buildDemoContent } = await import('../../demo/content.js');
    const { renderContentState } = await import('../../demo/main.js');
    const root = createRenderRoot();
    const setupState = {
      ...sampleSetupState,
      passkeyWarning:
        'Open this page on localhost or an HTTPS domain for passkeys.',
    };
    const content = buildDemoContent(sampleSetupState);

    renderContentState(root, setupState, content);

    expect(root.querySelector('#register-output')?.textContent).not.toContain(
      'localhost',
    );
    expect(
      root.querySelector('#authenticate-output')?.textContent,
    ).not.toContain('localhost');
  });

  it('removes the rp id slot from the static page shell', () => {
    const html = readFileSync(
      new URL('../../demo/index.html', import.meta.url),
      'utf8',
    );

    expect(html).not.toContain('page-rp-id');
    expect(html).not.toContain('Suggested RP ID');
  });

  it('hydrates the visible sdk origin input from resolved setup state', async () => {
    const { createDemoRuntime } = await import('../../demo/main.js');
    const root = createRenderRoot();
    const runtime = createDemoRuntime({
      root,
      setupState: sampleSetupState,
      history: { replaceState() {} },
      localStorage: createStorage(),
      location: new URL('https://docs.example.com/demo/'),
      windowObject: {
        location: { reload() {} },
        PublicKeyCredential: undefined,
      },
    });

    runtime.hydrateState();

    expect(root.querySelector('#sdk-origin-input')?.value).toBe(
      'https://auth.zccz14.com',
    );
  });
});

function createRenderRoot(): FakeRenderRoot {
  const elements = new Map<string, FakeElement>();
  const makeElement = (id: string) => {
    const tagName =
      id.includes('list') || id === 'hero-capabilities' ? 'ul' : 'div';
    const element = createElement(tagName, id);
    elements.set(`#${id}`, element);
    return element;
  };

  makeElement('hero-title');
  makeElement('hero-value-prop');
  makeElement('hero-audience');
  makeElement('hero-capabilities');
  makeElement('sdk-origin-input');
  makeElement('base-url');
  makeElement('email');
  makeElement('otp-code');
  makeElement('access-token');
  makeElement('refresh-token');
  makeElement('request-id');
  makeElement('latest-request');
  makeElement('latest-response');
  makeElement('origin-command');
  makeElement('sdk-script-snippet');
  makeElement('jose-snippet');
  makeElement('config-error');
  makeElement('setup-warning');
  makeElement('page-origin');
  makeElement('how-it-works-list');
  makeElement('api-reference-list');
  makeElement('backend-notes-list');
  const backendNotesDisclosure = createElement(
    'details',
    'backend-notes-disclosure',
  );
  const backendNotesSummary = createElement('summary');
  backendNotesDisclosure.appendChild(backendNotesSummary);
  elements.set('#backend-notes-disclosure', backendNotesDisclosure);
  makeElement('deployment-notes-list');
  makeElement('register-output');
  makeElement('authenticate-output');
  makeElement('email-start-button');
  makeElement('email-verify-button');
  makeElement('register-button');
  makeElement('authenticate-button');
  makeElement('clear-state-button');
  makeElement('status-config');
  makeElement('status-email-start');
  makeElement('status-email-verify');
  makeElement('status-register');
  makeElement('status-authenticate');

  return {
    createElement,
    querySelector(selector: string) {
      if (elements.has(selector)) {
        return elements.get(selector) ?? null;
      }

      const parts = selector.split(' ');
      const rootSelector = parts.shift() ?? '';
      const rootElement = elements.get(rootSelector);
      if (!rootElement) {
        return null;
      }

      return queryWithin(rootElement, parts);
    },
    querySelectorAll(selector: string) {
      const parts = selector.split(' ');
      const rootSelector = parts.shift() ?? '';
      const rootElement = elements.get(rootSelector);
      if (!rootElement) {
        return [];
      }

      return queryAllWithin(rootElement, parts);
    },
  };

  function createElement(tagName: string, id = ''): FakeElement {
    return {
      id,
      tagName: tagName.toUpperCase(),
      hidden: false,
      textContent: '',
      innerHTML: '',
      className: '',
      value: '',
      children: [],
      append(...nodes: FakeNode[]) {
        this.children.push(...nodes);
        syncText(this);
      },
      appendChild(node: FakeNode) {
        this.children.push(node);
        syncText(this);
        return node;
      },
      replaceChildren(...nodes: FakeNode[]) {
        this.children = [...nodes];
        syncText(this);
      },
    };
  }

  function queryWithin(
    element: FakeElement,
    selectors: string[],
  ): FakeElement | null {
    return queryAllWithin(element, selectors)[0] ?? null;
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

  function walk(element: FakeElement, visit: (element: FakeElement) => void) {
    for (const child of element.children) {
      visit(child);
      walk(child, visit);
    }
  }

  function syncText(element: FakeElement) {
    element.textContent = [
      element.innerHTML,
      ...element.children.map((child) => child.textContent),
    ]
      .filter(Boolean)
      .join('\n');
  }
}

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}
