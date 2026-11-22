/**
 * An address from outside the code (a query string, say) as a path inside
 * this app, or null.
 *
 * Judged on what the browser will do with it, not how it looks: "/\evil.com"
 * starts with one slash and still opens evil.com, and "/..//evil.com" tidies
 * to a path that reads as another site.
 */
export function safePath(value: string | null | undefined, origin?: string): string | null {
  if (!value?.startsWith('/')) return null;
  try {
    const home = origin ?? window.location.origin;
    const url = new URL(value, home);
    if (url.origin !== new URL(home).origin || url.pathname.startsWith('//')) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
