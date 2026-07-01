export type DemoConfigStatus = 'ready';

export type DemoConfig = {
  configError: string;
  pageOrigin: string;
  resolvedServerBaseUrl: string;
  serverBaseUrl: string;
  status: DemoConfigStatus;
};

const SERVER_BASE_URL = '..';

export function getInitialDemoConfig({
  pageHref,
  pageOrigin,
}: {
  pageHref: string;
  pageOrigin: string;
}): DemoConfig {
  return {
    configError: '',
    pageOrigin,
    resolvedServerBaseUrl: new URL(SERVER_BASE_URL, pageHref).toString(),
    serverBaseUrl: SERVER_BASE_URL,
    status: 'ready',
  };
}
