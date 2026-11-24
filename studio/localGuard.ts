import type { IncomingMessage, ServerResponse } from 'node:http';

/*
 * The local Studio's private routes hold the database password and the
 * analytics keys, and the Support route answers as a support agent. Without a
 * check, any website open in the editor's browser could send them a request
 * while `sanity dev` runs: a plain POST needs no CORS preflight, so it would
 * be carried out even though the page could not read the reply.
 *
 * So only the Studio page itself is answered:
 * - The browser sets Sec-Fetch-Site and Origin itself, and a page cannot
 *   change them. Cross-site and same-site requests (another localhost port)
 *   are refused.
 * - The Host must be this machine, which also stops DNS rebinding, where an
 *   outside name is pointed at 127.0.0.1 to look same-origin.
 * A request with neither header comes from a program on this machine, not a
 * web page, and is let through: such a program could read studio/.env.local
 * anyway.
 */
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

export function fromThisStudio(req: IncomingMessage): boolean {
  const host = req.headers.host ?? '';
  if (!LOCAL_HOST.test(host)) return false;
  const site = req.headers['sec-fetch-site'];
  if (site !== undefined) return site === 'same-origin';
  const origin = req.headers.origin;
  if (origin === undefined) return true;
  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

/** Answers a refused request; returns true when the caller should stop. */
export function refuseOthers(req: IncomingMessage, res: ServerResponse): boolean {
  if (fromThisStudio(req)) return false;
  res.statusCode = 403;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Only the Studio open on this computer can use this.' }));
  return true;
}
