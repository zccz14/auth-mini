const WAITING_FOR_SDK_ORIGIN_MESSAGE =
  'Add ?sdk-origin=https://your-auth-origin to this page URL to enable the live playground.';

export function getDemoSetupState(locationLike) {
  const origin = locationLike.origin;
  const normalizedSdkOrigin = resolveSdkOrigin(locationLike);
  const corsWarning =
    'Run npx auth-mini origin add with this page origin before browser calls to the auth server will succeed cross-origin.';

  if (!normalizedSdkOrigin.ok) {
    return {
      currentOrigin: origin,
      suggestedOrigin: origin,
      sdkOrigin: '',
      issuer: '',
      jwksUrl: '',
      configStatus: normalizedSdkOrigin.status,
      configError: normalizedSdkOrigin.error,
      corsWarning,
      startupCommand: '',
    };
  }

  const sdkOrigin = normalizedSdkOrigin.value;
  const issuer = sdkOrigin;

  return {
    currentOrigin: origin,
    suggestedOrigin: origin,
    sdkOrigin,
    issuer,
    jwksUrl: new URL('/jwks', sdkOrigin).toString(),
    configStatus: 'ready',
    configError: '',
    corsWarning,
    startupCommand: [
      `npx auth-mini origin add ./auth-mini.sqlite --value ${origin}`,
      `npx auth-mini start ./auth-mini.sqlite --issuer ${issuer}`,
      'npx auth-mini smtp add ./auth-mini.sqlite --host smtp.example.com --port 587 --username mailer --password secret --from-email noreply@example.com',
    ].join('\n'),
  };
}

function resolveSdkOrigin(locationLike) {
  if (locationLike.sdkOriginInput !== undefined) {
    return withStatus(normalizeSdkOrigin(locationLike.sdkOriginInput), 'ready');
  }

  return {
    ok: false,
    status: 'waiting',
    error: WAITING_FOR_SDK_ORIGIN_MESSAGE,
  };
}

function withStatus(result, status) {
  if (result.ok) {
    return { ...result, status };
  }

  return { ...result, status: 'error' };
}

function normalizeSdkOrigin(value) {
  if (typeof value !== 'string' || !value) {
    return { ok: false, error: 'sdk-origin must be an origin-only URL.' };
  }

  try {
    const url = new URL(value);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { ok: false, error: 'sdk-origin must be an origin-only URL.' };
    }

    if (url.username || url.password) {
      return { ok: false, error: 'sdk-origin must be an origin-only URL.' };
    }

    if (url.pathname !== '/' || url.search || url.hash) {
      return { ok: false, error: 'sdk-origin must be an origin-only URL.' };
    }

    return { ok: true, value: url.origin };
  } catch {
    return { ok: false, error: 'sdk-origin must be an origin-only URL.' };
  }
}
