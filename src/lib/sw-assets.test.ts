import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Tests the asset extractors inside `public/sw.js` — the real shipped file,
 * not a copy of it.
 *
 * The worker cannot be imported: it is a classic script that reaches for `self`
 * as soon as it loads, and nothing bundles it. So it is evaluated here with the
 * worker globals stubbed, and its function declarations handed back out. A copy
 * of the regexes in this file would pass forever while the worker quietly
 * stopped finding anything.
 *
 * These two functions decide what a saved session actually contains, and they
 * work by reading markup Next generates. If Next changes the shape of an image
 * URL, a download keeps reporting success and silently stops including the
 * artwork — which nobody discovers until they are somewhere without signal.
 */
function loadWorkerFunctions() {
  const source = readFileSync(path.join(process.cwd(), 'public/sw.js'), 'utf8');

  const stubSelf = {
    addEventListener: () => {},
    clients: { matchAll: async () => [], claim: async () => {} },
    skipWaiting: async () => {},
    location: { origin: 'https://example.test' },
  };

  const factory = new Function(
    'self',
    'caches',
    'fetch',
    'Response',
    `${source}\nreturn { assetsFrom, imagesFrom };`,
  );

  return factory(stubSelf, undefined, undefined, undefined) as {
    assetsFrom: (html: string) => string[];
    imagesFrom: (html: string) => string[];
  };
}

const { assetsFrom, imagesFrom } = loadWorkerFunctions();

/** The markup Next emits for an optimised `next/image`, escaping and all. */
const OPTIMISED_HTML = `
<!DOCTYPE html><html><head>
<link rel="preload" href="/_next/static/css/8f2b1c.css" as="style"/>
<script src="/_next/static/chunks/webpack-9c1a.js" async=""></script>
</head><body>
<img alt="" loading="lazy" decoding="async"
  srcset="/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Focean-wave.a4e9db7d.jpg&amp;w=640&amp;q=75 1x, /_next/image?url=%2F_next%2Fstatic%2Fmedia%2Focean-wave.a4e9db7d.jpg&amp;w=1080&amp;q=75 2x"
  src="/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Focean-wave.a4e9db7d.jpg&amp;w=1080&amp;q=75"/>
<script src="/_next/static/chunks/app/player/%5Bid%5D/page-77aa.js"></script>
</body></html>`;

/** A static export instead: no optimiser, so the files are referenced directly. */
const EXPORTED_HTML = `
<img alt="" src="/_next/static/media/ocean-wave.a4e9db7d.jpg"
  srcset="/_next/static/media/ocean-wave.a4e9db7d.jpg 1x, /_next/static/media/night-sky.1b575fb7.jpg 2x"/>`;

/**
 * The same URLs as they appear in the JSON payload Next inlines further down
 * the page, inside escaped strings.
 *
 * Taken from a real build. This is what broke both extractors: a pattern that
 * ends at the quote takes the escaping backslash with it, and every URL it
 * produces then 404s. Silently, because a failed asset fetch is skipped.
 */
const ESCAPED_PAYLOAD_HTML = String.raw`
<script>self.__next_f.push([1,"3:{\"src\":\"/_next/static/media/ocean-wave.f975dc48.jpg\",\"height\":1200}
4:{\"href\":\"/_next/static/css/aff850c6bc72c536.css\",\"rel\":\"stylesheet\"}
5:{\"srcSet\":\"/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Focean-wave.f975dc48.jpg&w=828&q=75 828w\"}"])</script>`;

describe('assetsFrom', () => {
  it('finds the chunks and stylesheets a page needs', () => {
    const found = assetsFrom(OPTIMISED_HTML);
    expect(found).toContain('/_next/static/css/8f2b1c.css');
    expect(found).toContain('/_next/static/chunks/webpack-9c1a.js');
    expect(found).toContain('/_next/static/chunks/app/player/%5Bid%5D/page-77aa.js');
  });

  it('does not report the same asset twice', () => {
    const found = assetsFrom(`${OPTIMISED_HTML}${OPTIMISED_HTML}`);
    expect(new Set(found).size).toBe(found.length);
  });

  it('does not drag the escaping backslash into the URL', () => {
    const found = assetsFrom(ESCAPED_PAYLOAD_HTML);
    expect(found).toContain('/_next/static/css/aff850c6bc72c536.css');
    for (const url of found) expect(url).not.toContain('\\');
  });
});

describe('imagesFrom', () => {
  it('finds optimised artwork, which assetsFrom cannot see', () => {
    // The whole reason this function exists: /_next/image is not under
    // /_next/static, so the original precache never covered the photographs.
    expect(assetsFrom(OPTIMISED_HTML).some((url) => url.includes('/_next/image'))).toBe(false);
    expect(imagesFrom(OPTIMISED_HTML).length).toBeGreaterThan(0);
  });

  it('unescapes the ampersands, so the URL is the one the browser requests', () => {
    const found = imagesFrom(OPTIMISED_HTML);
    expect(found).toContain(
      '/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Focean-wave.a4e9db7d.jpg&w=1080&q=75',
    );
    for (const url of found) expect(url).not.toContain('&amp;');
  });

  it('takes every srcset candidate, not only the one in src', () => {
    // The device picks by pixel density. Pinning one variant would leave a
    // retina phone fetching an image that is not there.
    const found = imagesFrom(OPTIMISED_HTML);
    expect(found).toContain(
      '/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Focean-wave.a4e9db7d.jpg&w=640&q=75',
    );
    expect(found).toContain(
      '/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Focean-wave.a4e9db7d.jpg&w=1080&q=75',
    );
  });

  it('never swallows the width descriptor or the comma between candidates', () => {
    for (const url of imagesFrom(OPTIMISED_HTML)) {
      expect(url).not.toContain(',');
      expect(url).not.toMatch(/\s/);
      expect(url.endsWith('x')).toBe(false);
    }
  });

  it('handles a static export, where images are served directly', () => {
    const found = imagesFrom(EXPORTED_HTML);
    expect(found).toContain('/_next/static/media/ocean-wave.a4e9db7d.jpg');
    expect(found).toContain('/_next/static/media/night-sky.1b575fb7.jpg');
  });

  it('returns nothing for a page with no artwork', () => {
    expect(imagesFrom('<html><body><p>No pictures here.</p></body></html>')).toEqual([]);
  });

  it('does not drag the escaping backslash into the URL', () => {
    const found = imagesFrom(ESCAPED_PAYLOAD_HTML);
    expect(found).toContain('/_next/static/media/ocean-wave.f975dc48.jpg');
    expect(found).toContain(
      '/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Focean-wave.f975dc48.jpg&w=828&q=75',
    );
    for (const url of found) expect(url).not.toContain('\\');
  });
});
