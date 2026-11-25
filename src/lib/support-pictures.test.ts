import { describe, expect, it } from 'vitest';

import { createSupport } from '../../studio/api/_lib/support';
import { createSanityImages, decodeImage, IMAGE_LIMITS, sniff } from '../../studio/api/_lib/support-images';
import { fitWithin, thumbnailUrl } from '@/lib/support-picture';

const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70]);
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const WEBP = new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ');
const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');

describe('preparing a picture on the phone', () => {
  it('shrinks the longest side to the limit, keeping the shape', () => {
    expect(fitWithin(1170, 2532)).toEqual({ width: 739, height: 1600 });
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(0, 10)).toEqual({ width: 0, height: 0 });
  });

  it('asks Sanity for a smaller copy, and leaves local previews alone', () => {
    expect(thumbnailUrl('https://cdn.sanity.io/images/p/d/abc-10x10.jpg')).toBe(
      'https://cdn.sanity.io/images/p/d/abc-10x10.jpg?w=480&fit=max&auto=format',
    );
    expect(thumbnailUrl('blob:http://localhost/123')).toBe('blob:http://localhost/123');
  });
});

describe('checking a picture on the server', () => {
  it('knows JPEG, PNG and WebP by their first bytes', () => {
    expect(sniff(JPEG)).toBe('image/jpeg');
    expect(sniff(PNG)).toBe('image/png');
    expect(sniff(WEBP)).toBe('image/webp');
    expect(sniff(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull();
  });

  it('decodes base64 and data URLs', () => {
    expect(decodeImage(`data:image/jpeg;base64,${b64(JPEG)}`)).toMatchObject({ type: 'image/jpeg' });
    expect(decodeImage(b64(PNG))).toMatchObject({ type: 'image/png' });
  });

  it('refuses what isn’t a picture, or is too large', () => {
    expect(decodeImage(b64(new TextEncoder().encode('%PDF-1.7')))).toEqual({
      error: 'Only photos and screenshots (JPEG, PNG or WebP) can be sent.',
    });
    expect(decodeImage('not base64!')).toHaveProperty('error');
    expect(decodeImage(undefined)).toHaveProperty('error');
    const huge = new Uint8Array(IMAGE_LIMITS.bytes + 10);
    huge.set(JPEG);
    expect(decodeImage(b64(huge))).toEqual({ error: 'That picture is too large.' });
  });
});

describe('storing pictures in Sanity', () => {
  it('uploads with a random name and no personal details, and reads back the asset', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const http = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(
        JSON.stringify({ document: { _id: 'image-abc', url: 'https://cdn.sanity.io/x.jpg', metadata: { dimensions: { width: 739, height: 1600 } } } }),
      );
    }) as unknown as typeof fetch;
    const stored = await createSanityImages('token', http).upload(JPEG, 'image/jpeg');
    expect(stored).toEqual({ assetId: 'image-abc', url: 'https://cdn.sanity.io/x.jpg', width: 739, height: 1600 });
    expect(calls[0].url).toMatch(/^https:\/\/jn0rojao\.api\.sanity\.io\/v[\d-]+\/assets\/images\/production\?filename=support-[0-9a-f-]{36}\.jpg$/);
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer token');
  });

  it('deletes assets in one request, and does nothing without any', async () => {
    const bodies: string[] = [];
    const http = (async (_url: string, init: RequestInit) => {
      bodies.push(String(init.body));
      return new Response('{}');
    }) as unknown as typeof fetch;
    const store = createSanityImages('token', http);
    await store.remove([]);
    await store.remove(['image-a', 'image-b']);
    expect(bodies).toEqual([JSON.stringify({ mutations: [{ delete: { id: 'image-a' } }, { delete: { id: 'image-b' } }] })]);
  });

  it('is off without a token', async () => {
    const store = createSanityImages(undefined);
    expect(store.configured).toBe(false);
    await expect(store.upload(JPEG, 'image/jpeg')).rejects.toThrow('images-not-configured');
  });
});

describe('the support server with pictures', () => {
  const user = { id: 'u1', email: 'a@b.c' };
  /** A stand-in database: answers by what the query asks for. */
  function fakeSql(counts = 0) {
    const queries: string[] = [];
    const sql = (async (strings: TemplateStringsArray) => {
      const query = strings.join('?');
      queries.push(query);
      if (query.includes('count(*)::int as count from support_images')) return [{ count: counts }];
      if (query.includes('insert into support_images')) return [{ id: 'img-row', url: 'https://cdn.sanity.io/x.jpg', width: 1, height: 1 }];
      return [];
    }) as unknown as Parameters<typeof createSupport>[1] extends { sql?: infer S } ? S : never;
    return { sql, queries };
  }
  const okFetch = (async () =>
    new Response(JSON.stringify({ document: { _id: 'image-abc', url: 'https://cdn.sanity.io/x.jpg', metadata: { dimensions: { width: 1, height: 1 } } } }))) as unknown as typeof fetch;

  it('says pictures are off when Sanity isn’t set up', async () => {
    const { sql } = fakeSql();
    const support = createSupport({ DATABASE_URL: 'postgres://x' }, { sql });
    const reply = await support.forUser(user, { action: 'upload', data: b64(JPEG) });
    expect(reply.status).toBe(503);
  });

  it('stores a picture and returns its id', async () => {
    const { sql, queries } = fakeSql();
    const support = createSupport({ DATABASE_URL: 'postgres://x', SANITY_API_WRITE_TOKEN: 't' }, { sql, fetch: okFetch });
    const reply = await support.forUser(user, { action: 'upload', data: b64(JPEG) });
    expect(reply).toEqual({ status: 200, body: { image: { id: 'img-row', url: 'https://cdn.sanity.io/x.jpg', width: 1, height: 1 } } });
    expect(queries.some((q) => q.includes('create table if not exists support_images'))).toBe(true);
  });

  it('holds to the daily limit', async () => {
    const { sql } = fakeSql(IMAGE_LIMITS.perDay);
    const support = createSupport({ DATABASE_URL: 'postgres://x', SANITY_API_WRITE_TOKEN: 't' }, { sql, fetch: okFetch });
    expect((await support.forUser(user, { action: 'upload', data: b64(JPEG) })).status).toBe(429);
  });

  it('refuses too many pictures, or malformed ids, on a message', async () => {
    const { sql } = fakeSql();
    const support = createSupport({ DATABASE_URL: 'postgres://x' }, { sql });
    const id = '00000000-0000-4000-8000-000000000000';
    expect((await support.forUser(user, { action: 'reply', id, body: 'hi', images: [id, id, id, id] })).status).toBe(400);
    expect((await support.forUser(user, { action: 'reply', id, body: 'hi', images: ['../etc'] })).status).toBe(400);
    expect((await support.forUser(user, { action: 'create', subject: 'Help', images: [] })).status).toBe(400);
  });
});
