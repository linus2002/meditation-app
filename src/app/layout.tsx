import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';

import { DeviceStage } from '@/components/layout/device-stage';
import { ServiceWorkerRegistrar } from '@/components/layout/service-worker';
import { AppProvider } from '@/providers/app-provider';
import { AudioProvider } from '@/providers/audio-provider';

import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Serenity — Keep track of Your Health',
  description:
    'A meditation and mindfulness companion: daily activities, guided sessions, sleep content and progress tracking.',
  applicationName: 'Serenity',
  manifest: '/manifest.webmanifest',
  // Lets iOS treat an added-to-home-screen instance as a standalone app.
  appleWebApp: {
    capable: true,
    title: 'Serenity',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#0E1030',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="bg-canvas font-sans text-ink antialiased">
        <AppProvider>
          <AudioProvider>
            <DeviceStage>{children}</DeviceStage>
            <ServiceWorkerRegistrar />
          </AudioProvider>
        </AppProvider>
      </body>
    </html>
  );
}
