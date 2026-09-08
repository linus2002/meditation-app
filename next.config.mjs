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
  images: isMobileBuild ? { unoptimized: true } : { formats: ['image/avif', 'image/webp'] },

  ...(isMobileBuild
    ? {
        output: 'export',
        // Emits /home/index.html rather than /home.html, which is what a
        // native WebView expects when resolving routes from the filesystem.
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
