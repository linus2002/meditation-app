import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/*
 * The shipped worker's install step, run against an in-memory Cache Storage.
 * An update that could not download everything must not replace a working
 * copy; a first install keeps whatever it managed to get.
 */
type Handler = (event: { waitUntil: (p: Promise<unknown>) => void }) => void;

function install({ earlierBuild, failing }: { earlierBuild: boolean; failing: string[] }) {
  const source = readFileSync(path.join(process.cwd(), 'public/sw.js'), 'utf8');
  const build = /const BUILD = '([^']+)'/.exec(source)?.[1];
  const stores = new Map<string, Map<string, string>>();
  if (earlierBuild) stores.set('serenity-older', new Map([['/home', 'old']]));

  const caches = {
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name)!;
      return { put: async (url: string) => void store.set(url, 'x') };
    },
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
  };
  const manifest = { routes: ['/home', '/sleep'], assets: ['/_next/static/a.js', '/_next/static/b.css'] };
  const fetch = async (url: string) => {
    if (failing.includes(url)) return { ok: false, clone() { return this; } };
    const body = url === '/precache.json' ? JSON.stringify(manifest) : '<html></html>';
    const response = { ok: true, json: async () => JSON.parse(body), text: async () => body, clone: () => response };
    return response;
  };

  const handlers: Record<string, Handler> = {};
  let skipped = false;
  const self = {
    addEventListener: (type: string, handler: Handler) => (handlers[type] = handler),
    clients: { matchAll: async () => [], claim: async () => {} },
    skipWaiting: async () => void (skipped = true),
    location: { origin: 'https://app.test' },
  };
  new Function('self', 'caches', 'fetch', 'Response', source)(self, caches, fetch, undefined);

  let done: Promise<unknown> = Promise.resolve();
  handlers.install({ waitUntil: (p) => (done = p) });
  return { done, stores, newCache: `serenity-${build}`, skipped: () => skipped };
}

describe('the app updates only when the update arrived whole', () => {
  it('refuses a partial update while a working copy is installed', async () => {
    const run = install({ earlierBuild: true, failing: ['/_next/static/a.js'] });
    await expect(run.done).rejects.toThrow(/Update incomplete/);
    expect(run.stores.has(run.newCache)).toBe(false);
    expect(run.stores.has('serenity-older')).toBe(true);
    expect(run.skipped()).toBe(false);
  });

  it('takes a complete update', async () => {
    const run = install({ earlierBuild: true, failing: [] });
    await expect(run.done).resolves.toBeUndefined();
    expect(run.stores.get(run.newCache)?.size).toBe(4);
    expect(run.skipped()).toBe(true);
  });

  it('keeps what a first install could get', async () => {
    const run = install({ earlierBuild: false, failing: ['/sleep'] });
    await expect(run.done).resolves.toBeUndefined();
    expect(run.stores.get(run.newCache)?.has('/home')).toBe(true);
    expect(run.skipped()).toBe(true);
  });
});
