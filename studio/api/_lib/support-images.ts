/**
 * Pictures sent with a support message: screenshots of a problem, mostly.
 *
 * The app shrinks each picture and re-saves it as a JPEG before sending (which
 * also drops the camera's hidden details, such as location), then posts it
 * here as base64. The server checks it really is an image, uploads it to the
 * Sanity project's asset store with SANITY_API_WRITE_TOKEN, and keeps a row in
 * Neon saying whose it is and which message it belongs to.
 *
 * Sanity assets are public on its CDN: anyone holding a picture's address can
 * open it. Files get a random name and carry no email or account details, and
 * they are deleted from Sanity when the person deletes their account.
 */

export const IMAGE_LIMITS = {
  /** After the app's resizing a screenshot is a few hundred KB; this allows a lot more. */
  bytes: 3_000_000,
  perMessage: 3,
  perDay: 30,
  /** Pictures picked but never sent are cleared after this long. */
  orphanHours: 24,
};

const SANITY_PROJECT_ID = 'jn0rojao';
const SANITY_DATASET = 'production';
const API = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2021-06-07`;

export type ImageType = 'image/jpeg' | 'image/png' | 'image/webp';
const EXTENSIONS: Record<ImageType, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** What a file is, from its first bytes rather than its name or claimed type. */
export function sniff(bytes: Uint8Array): ImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

/** A picture sent as base64 (a data: URL is fine too), checked and decoded. */
export function decodeImage(data: unknown): { bytes: Uint8Array; type: ImageType } | { error: string } {
  if (typeof data !== 'string' || !data) return { error: 'Choose a picture to send.' };
  const base64 = data.replace(/^data:[^;,]*;base64,/, '');
  // Base64 is a third larger than the file; refuse oversized ones before decoding.
  if (base64.length > Math.ceil((IMAGE_LIMITS.bytes * 4) / 3) + 8) return { error: 'That picture is too large.' };
  if (!/^[A-Za-z0-9+/]+=*$/.test(base64)) return { error: 'That picture couldn’t be read.' };
  const bytes = new Uint8Array(Buffer.from(base64, 'base64'));
  if (bytes.length > IMAGE_LIMITS.bytes) return { error: 'That picture is too large.' };
  const type = sniff(bytes);
  if (!type) return { error: 'Only photos and screenshots (JPEG, PNG or WebP) can be sent.' };
  return { bytes, type };
}

export interface UploadedImage {
  assetId: string;
  url: string;
  width: number;
  height: number;
}

/** Uploads to and deletes from the Sanity project's asset store. */
export function createSanityImages(token: string | undefined, http: typeof fetch = fetch) {
  async function upload(bytes: Uint8Array, type: ImageType): Promise<UploadedImage> {
    if (!token) throw new Error('images-not-configured');
    const name = `support-${crypto.randomUUID()}.${EXTENSIONS[type]}`;
    const res = await http(`${API}/assets/images/${SANITY_DATASET}?filename=${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': type },
      body: new Blob([bytes as Uint8Array<ArrayBuffer>], { type }),
    });
    if (!res.ok) throw new Error(`Sanity upload answered ${res.status}`);
    const { document } = (await res.json()) as {
      document?: { _id?: string; url?: string; metadata?: { dimensions?: { width?: number; height?: number } } };
    };
    if (!document?._id || !document.url) throw new Error('Sanity upload returned no asset');
    return {
      assetId: document._id,
      url: document.url,
      width: document.metadata?.dimensions?.width ?? 0,
      height: document.metadata?.dimensions?.height ?? 0,
    };
  }

  /** Deletes the assets; ones already gone are fine. */
  async function remove(assetIds: string[]): Promise<void> {
    if (!token || assetIds.length === 0) return;
    const res = await http(`${API}/data/mutate/${SANITY_DATASET}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mutations: assetIds.map((id) => ({ delete: { id } })) }),
    });
    if (!res.ok) throw new Error(`Sanity delete answered ${res.status}`);
  }

  return { upload, remove, configured: Boolean(token) };
}
