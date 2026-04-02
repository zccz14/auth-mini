export function getDemoSetupState(locationLike: {
  origin: string;
  protocol: string;
  hostname: string;
}): {
  currentOrigin: string;
  currentRpId: string;
  suggestedOrigin: string;
  suggestedRpId: string;
  webauthnReady: boolean;
  warning: string;
  proxyCommand: string;
};
