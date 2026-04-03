export function getDemoSetupState(locationLike: {
  origin: string;
  protocol: string;
  hostname: string;
  sdkUrl?: string;
}): {
  currentOrigin: string;
  currentRpId: string;
  suggestedOrigin: string;
  suggestedRpId: string;
  webauthnReady: boolean;
  corsWarning: string;
  passkeyWarning: string;
  startupCommand: string;
};
