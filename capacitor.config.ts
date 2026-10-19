import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor wraps the static export in `out/` as a native Android and iOS app.
 * Change `appId` to a bundle identifier you own before submitting to a store.
 */
const config: CapacitorConfig = {
  appId: 'com.example.serenity',
  appName: 'Serenity',
  webDir: 'out',
  backgroundColor: '#000000',
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
