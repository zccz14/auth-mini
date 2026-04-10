export function getDemoSetupState(locationLike: {
  origin: string;
  protocol: string;
  hostname: string;
  sdkOriginInput?: string;
}): {
  currentOrigin: string;
  suggestedOrigin: string;
  sdkOrigin: string;
  issuer: string;
  jwksUrl: string;
  configStatus: string;
  configError: string;
  corsWarning: string;
  startupCommand: string;
};
