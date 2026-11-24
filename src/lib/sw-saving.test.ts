import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/*
 * The saving helpers inside the shipped `public/sw.js`, evaluated with the
 * worker globals stubbed as in sw-assets.test.ts, so these test the real file.
 */
function load() {
  const source = readFileSync(path.join(process.cwd(), 'public/sw.js'), 'utf8');
  const stubSelf = {
    addEventListener: () => {},
    clients: { matchAll: async () => [], claim: async () => {} },
    skipWaiting: async () => {},
    location: { origin: 'https://app.test' },
  };
  const factory = new Function(
    'self',
    'caches',
    'fetch',
    'Response',
    `${source}\nreturn { assetsFrom, byteRange, isSavableMedia, oneAtATime, saveError };`,
  );
  return factory(stubSelf, undefined, undefined, undefined) as {
    assetsFrom: (html: string) => string[];
    byteRange: (header: string, size: number) => { start: number; end: number } | null;
    isSavableMedia: (url: string) => boolean;
    oneAtATime: <T>(task: () => Promise<T>) => Promise<T>;
    saveError: (error: unknown) => string;
  };
}

const sw = load();

describe('a saved recording answers byte ranges', () => {
  it('reads the ranges audio players ask for', () => {
    expect(sw.byteRange('bytes=0-', 1000)).toEqual({ start: 0, end: 999 });
    expect(sw.byteRange('bytes=200-299', 1000)).toEqual({ start: 200, end: 299 });
    expect(sw.byteRange('bytes=900-5000', 1000)).toEqual({ start: 900, end: 999 });
    expect(sw.byteRange('bytes=-100', 1000)).toEqual({ start: 900, end: 999 });
  });

  it('refuses ranges it cannot answer', () => {
    expect(sw.byteRange('bytes=1000-', 1000)).toBeNull();
    expect(sw.byteRange('bytes=5-2', 1000)).toBeNull();
    expect(sw.byteRange('bytes=-', 1000)).toBeNull();
    expect(sw.byteRange('items=0-5', 1000)).toBeNull();
    expect(sw.byteRange('bytes=0-5,10-20', 1000)).toBeNull();
  });
});

describe('only session media is saved', () => {
  it('takes Sanity files and the app’s own artwork', () => {
    expect(sw.isSavableMedia('https://cdn.sanity.io/files/p/production/abc.mp3')).toBe(true);
    expect(sw.isSavableMedia('/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Fa.png&w=640&q=75')).toBe(true);
  });

  it('refuses anything else', () => {
    expect(sw.isSavableMedia('https://evil.example/a.mp3')).toBe(false);
    expect(sw.isSavableMedia('/api/secret')).toBe(false);
    expect(sw.isSavableMedia('https://cdn.sanity.io.evil.example/a.mp3')).toBe(false);
  });
});

describe('saves run one at a time', () => {
  it('starts the next only when the last has finished, failed or not', async () => {
    const log: string[] = [];
    const task = (name: string, ms: number, fail = false) => () =>
      new Promise<string>((resolve, reject) => {
        log.push(`start ${name}`);
        setTimeout(() => {
          log.push(`end ${name}`);
          if (fail) reject(new Error(name));
          else resolve(name);
        }, ms);
      });
    const a = sw.oneAtATime(task('a', 30, true));
    const b = sw.oneAtATime(task('b', 5));
    await expect(a).rejects.toThrow('a');
    await expect(b).resolves.toBe('b');
    expect(log).toEqual(['start a', 'end a', 'start b', 'end b']);
  });
});

describe('a failed save says why in plain words', () => {
  it('names a full device', () => {
    expect(sw.saveError(Object.assign(new Error('x'), { name: 'QuotaExceededError' }))).toMatch(/room on this device/);
  });
  it('otherwise asks to try again', () => {
    expect(sw.saveError(new Error('Could not fetch /x'))).toMatch(/try again/);
  });
});

describe('every screen’s code is found for the precache', () => {
  it('keeps chunks under a route group such as app/(app)/', () => {
    const html = '<script src="/_next/static/chunks/app/(app)/home/page-d423a43760c51d55.js" async=""></script>';
    expect(sw.assetsFrom(html)).toEqual(['/_next/static/chunks/app/(app)/home/page-d423a43760c51d55.js']);
  });

  it('skips a URL cut in two where Next splits its page data', () => {
    const html = ':HL[\\"/_next/static/css/973e78e"])</script><script>self.__next_f.push([1,"2617aaf08.css';
    expect(sw.assetsFrom(html)).toEqual([]);
  });

  it('still reads escaped copies and css url()s', () => {
    const html = '\\"/_next/static/css/a1.css\\" url(/_next/static/media/font.woff2) ';
    expect(sw.assetsFrom(html).sort()).toEqual(['/_next/static/css/a1.css', '/_next/static/media/font.woff2']);
  });
});
