import { getDemoSetupState } from './setup.js';

const storageKey = 'mini-auth-demo-inputs';
const sdk = window.MiniAuth;

const state = {
  email: '',
  latestAction: 'No request yet.',
  latestResult: 'No response yet.',
};

const elements = {
  baseUrl: document.querySelector('#base-url'),
  email: document.querySelector('#email'),
  otpCode: document.querySelector('#otp-code'),
  accessToken: document.querySelector('#access-token'),
  refreshToken: document.querySelector('#refresh-token'),
  requestId: document.querySelector('#request-id'),
  latestRequest: document.querySelector('#latest-request'),
  latestResponse: document.querySelector('#latest-response'),
  pageOrigin: document.querySelector('#page-origin'),
  pageRpId: document.querySelector('#page-rp-id'),
  setupWarning: document.querySelector('#setup-warning'),
  originCommand: document.querySelector('#origin-command'),
  emailStartOutput: document.querySelector('#email-start-output'),
  emailVerifyOutput: document.querySelector('#email-verify-output'),
  registerOutput: document.querySelector('#register-output'),
  authenticateOutput: document.querySelector('#authenticate-output'),
  emailStartButton: document.querySelector('#email-start-button'),
  emailVerifyButton: document.querySelector('#email-verify-button'),
  registerButton: document.querySelector('#register-button'),
  authenticateButton: document.querySelector('#authenticate-button'),
  clearStateButton: document.querySelector('#clear-state-button'),
  statusConfig: document.querySelector('#status-config'),
  statusEmailStart: document.querySelector('#status-email-start'),
  statusEmailVerify: document.querySelector('#status-email-verify'),
  statusRegister: document.querySelector('#status-register'),
  statusAuthenticate: document.querySelector('#status-authenticate'),
};

const sectionViews = {
  'email-start': {
    output: elements.emailStartOutput,
    pill: elements.statusEmailStart,
  },
  'email-verify': {
    output: elements.emailVerifyOutput,
    pill: elements.statusEmailVerify,
  },
  register: {
    output: elements.registerOutput,
    pill: elements.statusRegister,
  },
  authenticate: {
    output: elements.authenticateOutput,
    pill: elements.statusAuthenticate,
  },
};

void initialize();

async function initialize() {
  hydrateState();
  renderSetupHints();
  wireEvents();

  if (!sdk) {
    elements.statusConfig.textContent = 'SDK missing';
    elements.setupWarning.hidden = false;
    elements.setupWarning.textContent =
      'MiniAuth SDK did not load. Point this page at an auth server SDK URL and make sure that server was started with --origin matching this page origin.';
    disableFlowButtons();
    renderState();
    return;
  }

  sdk.session.onChange(() => renderState());
  renderState();

  try {
    await sdk.ready;
    renderState();
  } catch (error) {
    state.latestAction = 'SDK startup recovery';
    state.latestResult = formatError(error);
    renderState();
  }

  if (!window.PublicKeyCredential) {
    setSectionResult(
      'register',
      'error',
      'This browser does not support WebAuthn / passkeys.',
    );
    setSectionResult(
      'authenticate',
      'error',
      'This browser does not support WebAuthn / passkeys.',
    );
    elements.registerButton.disabled = true;
    elements.authenticateButton.disabled = true;
  }
}

function wireEvents() {
  elements.email.addEventListener('input', () => {
    state.email = elements.email.value.trim();
    persistState();
  });

  elements.emailStartButton.addEventListener('click', handleEmailStart);
  elements.emailVerifyButton.addEventListener('click', handleEmailVerify);
  elements.registerButton.addEventListener('click', handleRegisterPasskey);
  elements.authenticateButton.addEventListener(
    'click',
    handleAuthenticatePasskey,
  );
  elements.clearStateButton.addEventListener('click', clearState);
}

async function handleEmailStart() {
  const email = elements.email.value.trim();

  if (!email) {
    setSectionResult('email-start', 'error', 'Email is required.');
    return;
  }

  state.email = email;
  persistState();
  state.latestAction = 'MiniAuth.email.start()';
  setSectionLoading('email-start', 'Sending OTP...');
  renderState();

  try {
    const result = await sdk.email.start({ email });
    state.latestResult = formatValue(result);
    setSectionResult('email-start', 'success', formatValue(result));
    renderState();
  } catch (error) {
    state.latestResult = formatError(error);
    setSectionResult('email-start', 'error', formatError(error));
    renderState();
  }
}

async function handleEmailVerify() {
  const email = elements.email.value.trim();
  const code = elements.otpCode.value.trim();

  if (!email || !code) {
    setSectionResult(
      'email-verify',
      'error',
      'Email and OTP code are required.',
    );
    return;
  }

  state.email = email;
  persistState();
  state.latestAction = 'MiniAuth.email.verify()';
  setSectionLoading('email-verify', 'Verifying OTP...');
  renderState();

  try {
    const session = await sdk.email.verify({ email, code });
    state.latestResult = formatValue({
      session,
      me: sdk.me.get(),
    });
    setSectionResult(
      'email-verify',
      'success',
      formatValue({
        session,
        me: sdk.me.get(),
      }),
    );
    renderState();
  } catch (error) {
    state.latestResult = formatError(error);
    setSectionResult('email-verify', 'error', formatError(error));
    renderState();
  }
}

async function handleRegisterPasskey() {
  state.latestAction = 'MiniAuth.webauthn.register()';
  setSectionLoading('register', 'Creating passkey...');
  renderState();

  try {
    const verify = await sdk.webauthn.register();
    const me = await sdk.me.reload();
    state.latestResult = formatValue({ verify, me });
    setSectionResult('register', 'success', formatValue({ verify, me }));
    renderState();
  } catch (error) {
    state.latestResult = formatError(error);
    setSectionResult('register', 'error', formatError(error));
    renderState();
  }
}

async function handleAuthenticatePasskey() {
  state.latestAction = 'MiniAuth.webauthn.authenticate()';
  setSectionLoading('authenticate', 'Signing in with passkey...');
  renderState();

  try {
    const session = await sdk.webauthn.authenticate();
    state.latestResult = formatValue({
      session,
      me: sdk.me.get(),
    });
    setSectionResult(
      'authenticate',
      'success',
      formatValue({
        session,
        me: sdk.me.get(),
      }),
    );
    renderState();
  } catch (error) {
    state.latestResult = formatError(error);
    setSectionResult('authenticate', 'error', formatError(error));
    renderState();
  }
}

async function clearState() {
  let logoutError = null;

  if (sdk) {
    try {
      await sdk.session.logout();
    } catch (error) {
      logoutError = error;
    }
  }

  state.email = '';
  state.latestAction = 'MiniAuth.session.logout()';
  state.latestResult = logoutError
    ? `Local demo state cleared. SDK logout failed: ${formatError(logoutError)}`
    : 'Local demo state cleared.';
  persistState();
  elements.email.value = '';
  elements.otpCode.value = '';
  elements.accessToken.value = '';
  elements.refreshToken.value = '';
  elements.requestId.value = logoutError ? 'logout-failed' : 'anonymous';
  elements.statusConfig.textContent = logoutError
    ? 'Logout failed'
    : 'anonymous';

  for (const view of Object.values(sectionViews)) {
    setPillState(view.pill, 'Idle', '');
    view.output.textContent = 'No request yet.';
  }

  if (!logoutError) {
    renderState();
  } else {
    elements.latestRequest.textContent = state.latestAction;
    elements.latestResponse.textContent = state.latestResult;
  }
}

function hydrateState() {
  const saved = parseJsonSafe(localStorage.getItem(storageKey) || '');

  if (saved && typeof saved === 'object') {
    state.email = typeof saved.email === 'string' ? saved.email : '';
  }

  elements.baseUrl.value =
    window.__MINI_AUTH_SDK_URL__ ||
    document.querySelector('script[data-mini-auth-sdk]')?.src ||
    'http://127.0.0.1:7777/sdk/singleton-iife.js';
  elements.email.value = state.email;
}

function persistState() {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      email: state.email,
    }),
  );
}

function renderState() {
  const snapshot = sdk?.session.getState();

  elements.accessToken.value = snapshot?.accessToken || '';
  elements.refreshToken.value = snapshot?.refreshToken || '';
  elements.requestId.value = snapshot?.status || 'sdk-unavailable';
  elements.latestRequest.textContent = state.latestAction;
  elements.latestResponse.textContent = state.latestResult;
  elements.statusConfig.textContent = snapshot?.status || 'Ready';
}

function renderSetupHints() {
  const setupState = getDemoSetupState(window.location);

  elements.pageOrigin.textContent = setupState.currentOrigin;
  elements.pageRpId.textContent = setupState.currentRpId;
  elements.originCommand.textContent = `mini-auth start ./mini-auth.sqlite --origin ${setupState.suggestedOrigin} --rp-id ${setupState.suggestedRpId}`;
  elements.setupWarning.textContent =
    setupState.warning ||
    'Serve this page from any static host, then start mini-auth with --origin set to the current page origin.';
  elements.setupWarning.hidden = false;

  if (!setupState.webauthnReady && window.PublicKeyCredential) {
    const message = `${setupState.warning}\n\nSuggested origin: ${setupState.suggestedOrigin}\nSuggested RP ID: ${setupState.suggestedRpId}`;

    setSectionResult('register', 'error', message);
    setSectionResult('authenticate', 'error', message);
    elements.registerButton.disabled = true;
    elements.authenticateButton.disabled = true;
  }
}

function disableFlowButtons() {
  elements.emailStartButton.disabled = true;
  elements.emailVerifyButton.disabled = true;
  elements.registerButton.disabled = true;
  elements.authenticateButton.disabled = true;
  elements.clearStateButton.disabled = true;
}

function setSectionLoading(name, message) {
  const view = sectionViews[name];
  setPillState(view.pill, 'Loading', 'loading');
  view.output.textContent = message;
}

function setSectionResult(name, stateName, message) {
  const view = sectionViews[name];
  const label =
    stateName === 'success'
      ? 'Success'
      : stateName === 'error'
        ? 'Error'
        : 'Idle';
  setPillState(view.pill, label, stateName);
  view.output.textContent = message;
}

function setPillState(element, label, className) {
  element.textContent = label;
  element.classList.remove('loading', 'error', 'success');

  if (className) {
    element.classList.add(className);
  }
}

function parseJsonSafe(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value, null, 2);
}

function formatError(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
