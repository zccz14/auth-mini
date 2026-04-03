export function getDemoSetupState(locationLike) {
  const origin = locationLike.origin;
  const protocol = locationLike.protocol;
  const hostname = locationLike.hostname;
  const localhostOrigin = buildLocalhostOrigin(origin);
  const ipAddressHost = isIpAddressHost(hostname);
  const webauthnReady =
    hostname === 'localhost' || (protocol === 'https:' && !ipAddressHost);

  return {
    currentOrigin: origin,
    currentRpId: hostname,
    suggestedOrigin: webauthnReady ? origin : localhostOrigin,
    suggestedRpId: webauthnReady ? hostname : 'localhost',
    webauthnReady,
    warning: ipAddressHost
      ? 'This demo is running on an IP address. Passkeys require a domain RP ID, so open the demo on localhost or an HTTPS domain instead.'
      : webauthnReady
        ? ''
        : 'This demo must run on localhost or an HTTPS domain before passkeys will work.',
  };
}

function buildLocalhostOrigin(origin) {
  try {
    const url = new URL(origin);
    url.hostname = 'localhost';
    return url.origin;
  } catch {
    return origin;
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
