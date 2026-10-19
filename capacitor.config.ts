import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor wraps the static export in `out/` as a native Android and iOS app.
 * `appId` is permanent once a store listing exists.
 */
const config: CapacitorConfig = {
  appId: 'com.linus2002.serenity',
  appName: 'Serenity',
  webDir: 'out',
  backgroundColor: '#000000',
  server: {
    // Serves the bundle from https://localhost, so it runs in a secure context.
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#000000',
  },
  ios: {
    backgroundColor: '#000000',
    // Keeps content clear of the notch and home indicator.
    contentInset: 'always',
  },
};

export default config;
