/**
 * next/image's loader for the mobile build.
 *
 * A static export has no image optimiser, so without this every `<Image>`
 * would fetch one full-size file whatever its `sizes`. Sanity's CDN resizes on
 * request, so each width in the generated `srcset` becomes its own Sanity URL
 * and a 56px thumbnail downloads a thumbnail. Re-encoding to WebP/AVIF follows
 * what the WebView accepts.
 *
 * Anything that is not on Sanity (the photos imported from src/assets) is
 * bundled into the app already and is returned untouched.
 */
export default function sanityImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (!src.startsWith('https://cdn.sanity.io/images/')) return src;
  const url = new URL(src);
  url.searchParams.set('w', String(width));
  url.searchParams.set('q', String(quality ?? 75));
  url.searchParams.set('fit', 'max');
  // `fm` outranks `auto` on Sanity, so the WebP default from the pull is dropped.
  url.searchParams.delete('fm');
  url.searchParams.set('auto', 'format');
  return url.toString();
}
