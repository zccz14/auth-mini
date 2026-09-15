export function resolveServerBaseUrl(pageHref: string): string {
  return new URL('..', pageHref).toString();
}
