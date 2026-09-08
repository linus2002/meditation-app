import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor wraps the static export in `out/` as a native Android and iOS app.
 * Change `appId` to a bundle identifier you own before submitting to a store.
 */
const config: CapacitorConfig = {
  appId: 'com.example.serenity',
  appName: 'Serenity',
  webDir: 'out',
  backgroundColor: '#0E1030',
  android: {
    backgroundColor: '#0E1030',
  },
  ios: {
    backgroundColor: '#0E1030',
    // Keeps content clear of the notch and home indicator.
    contentInset: 'always',
  },
};

export default config;
