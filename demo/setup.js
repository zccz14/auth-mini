export function getDemoSetupState(locationLike) {
  const origin = locationLike.origin;
  const protocol = locationLike.protocol;
  const hostname = locationLike.hostname;
  const issuerOrigin = getIssuerOrigin(locationLike.sdkUrl);
  const ipAddressHost = isIpAddressHost(hostname);
  const webauthnReady =
    hostname === 'localhost' || (protocol === 'https:' && !ipAddressHost);
  const suggestedRpId = webauthnReady ? hostname : 'localhost';
  const corsWarning =
    'Start mini-auth with --origin set to this page origin so the browser can call the auth server cross-origin.';
  const passkeyWarning = ipAddressHost
    ? 'This demo is running on an IP address. Passkeys require a domain RP ID, so open the demo on localhost or an HTTPS domain instead.'
    : webauthnReady
      ? ''
      : 'This demo must run on localhost or an HTTPS domain before passkeys will work.';

  return {
    currentOrigin: origin,
    currentRpId: hostname,
    suggestedOrigin: origin,
    suggestedRpId,
    webauthnReady,
    corsWarning,
    passkeyWarning,
    startupCommand: `mini-auth start ./mini-auth.sqlite --issuer ${issuerOrigin} --origin ${origin} --rp-id ${suggestedRpId}`,
  };
}

function getIssuerOrigin(sdkUrl) {
  if (typeof sdkUrl !== 'string' || !sdkUrl) {
    return '<auth-server-origin>';
  }

  try {
    return new URL(sdkUrl).origin;
  } catch {
    return '<auth-server-origin>';
  }
}

function isIpAddressHost(hostname) {
  return isIpv4Host(hostname) || isBracketedIpv6Host(hostname);
}

function isIpv4Host(hostname) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
}

function isBracketedIpv6Host(hostname) {
  return hostname.startsWith('[') && hostname.endsWith(']');
}
