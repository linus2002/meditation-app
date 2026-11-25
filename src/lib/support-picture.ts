/**
 * Getting a photo or screenshot ready to send to the Serenity team.
 *
 * Each picture is drawn onto a canvas no larger than MAX_SIDE and saved again
 * as a JPEG. That keeps it to a few hundred KB however large the original
 * was, and drops everything hidden in the file (location, camera, dates),
 * since only the pixels are carried over. A phone screenshot stays readable.
 */

/** The longest side after shrinking. Phone screenshots are tall; text stays sharp at this size. */
export const MAX_SIDE = 1600;
/** Quality for the first try, and the lower one if that comes out large. */
const QUALITY = 0.82;
const SMALLER_QUALITY = 0.7;
const TARGET_BYTES = 900_000;
/** Refused before reading: no phone photo is anywhere near this. */
export const MAX_ORIGINAL_BYTES = 40_000_000;

/** The size to draw a picture at so neither side passes `max`, keeping its shape. */
export function fitWithin(width: number, height: number, max = MAX_SIDE): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export class PictureError extends Error {}

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; done: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      // Turned the right way up, as the camera recorded it.
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, done: () => bitmap.close() };
    } catch {
      // Some browsers can't take this format as a bitmap; an <img> may manage it.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, done: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new PictureError('That picture couldn’t be opened. Try a screenshot or a JPEG or PNG photo.');
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new PictureError('That picture couldn’t be prepared.'))), 'image/jpeg', quality),
  );
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new PictureError('That picture couldn’t be read.'));
    reader.readAsDataURL(blob);
  });
}

export interface PreparedPicture {
  /** The JPEG, as a data URL, ready to upload. */
  data: string;
  /** A local address for showing it while it sends. */
  preview: string;
  width: number;
  height: number;
  bytes: number;
}

/** Shrinks and re-saves a picture the person chose. */
export async function preparePicture(file: File): Promise<PreparedPicture> {
  if (!file.type.startsWith('image/') && file.type !== '') {
    throw new PictureError('Only photos and screenshots can be sent.');
  }
  if (file.size > MAX_ORIGINAL_BYTES) throw new PictureError('That picture is too large to send.');

  const decoded = await decode(file);
  try {
    const size = fitWithin(decoded.width, decoded.height);
    if (!size.width) throw new PictureError('That picture couldn’t be opened.');
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) throw new PictureError('That picture couldn’t be prepared.');
    // JPEG has no transparency: a see-through PNG goes on white, not black.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, size.width, size.height);
    context.drawImage(decoded.source, 0, 0, size.width, size.height);

    let blob = await toBlob(canvas, QUALITY);
    if (blob.size > TARGET_BYTES) blob = await toBlob(canvas, SMALLER_QUALITY);
    return {
      data: await readAsDataUrl(blob),
      preview: URL.createObjectURL(blob),
      width: size.width,
      height: size.height,
      bytes: blob.size,
    };
  } finally {
    decoded.done();
  }
}

/** A smaller copy of a Sanity image for showing in a message; local previews are used as they are. */
export function thumbnailUrl(url: string, width = 480): string {
  return url.startsWith('https://cdn.sanity.io/') ? `${url}?w=${width}&fit=max&auto=format` : url;
}
