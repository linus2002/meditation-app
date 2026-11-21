/**
 * `MOBILE_BUILD=1` switches Next into static export mode, which is what
 * Capacitor bundles into the Android and iOS apps. The default web build is
 * unchanged, so `npm run build` still produces an optimised server build.
 */
const isMobileBuild = process.env.MOBILE_BUILD === '1';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Static export has no image optimisation server, so images ship as-is.
  // Content images come from Sanity's CDN. A static export has no optimiser,
  // so the mobile build asks Sanity for each srcset width instead.
  images: isMobileBuild
    ? { loader: 'custom', loaderFile: './src/lib/sanity-image-loader.ts' }
    : {
        formats: ['image/avif', 'image/webp'],
        remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }],
      },

  ...(isMobileBuild
    ? {
        output: 'export',
        // Its own build folder, so building the apps doesn't clash with a running `next dev`.
        distDir: '.next-mobile',
        // Emits /home/index.html rather than /home.html, which is what a
        // native WebView expects when resolving routes from the filesystem.
        trailingSlash: true,
      }
    : {
        /*
         * The worker and its manifest are how an installed PWA learns a new
         * version exists, so neither may be answered from a cache. Everything
         * else under /_next/static carries a content hash and is left alone.
         *
         * `headers()` is unavailable under `output: 'export'`, hence the split.
         */
        async headers() {
          const noStore = [
            { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          ];
          return [
            { source: '/sw.js', headers: noStore },
            { source: '/precache.json', headers: noStore },
            // The Android app, downloaded from /get. Revalidated so a new build reaches people at once.
            {
              source: '/get/serenity.apk',
              headers: [
                ...noStore,
                { key: 'Content-Type', value: 'application/vnd.android.package-archive' },
                { key: 'Content-Disposition', value: 'attachment; filename="Serenity.apk"' },
              ],
            },
          ];
        },

        // Install pages: plain HTML in public/, apart from the app's screens.
        // /get offers both platforms; /iphone is the Home Screen guide.
        async rewrites() {
          return [
            { source: '/get', destination: '/get/index.html' },
            { source: '/iphone', destination: '/iphone.html' },
          ];
        },
      }),
};

export default nextConfig;
