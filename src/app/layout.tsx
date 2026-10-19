import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';

import { CircleSync } from '@/components/layout/circle-sync';
import { DeviceStage } from '@/components/layout/device-stage';
import { NavigationTracker } from '@/components/layout/navigation-tracker';
import { UndoProvider } from '@/components/layout/undo-toast';
import { ReminderScheduler } from '@/components/layout/reminder-scheduler';
import { ServiceWorkerRegistrar } from '@/components/layout/service-worker';
import { AppProvider } from '@/providers/app-provider';
import { AudioProvider } from '@/providers/audio-provider';
import { CirclesProvider } from '@/providers/circles-provider';

import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Serenity — Calm, one breath at a time',
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
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/*
 * Applies the stored palette before the first paint.
 *
 * AppProvider also does this, but only after hydration — which is too late: a
 * light-mode reader would watch the dark canvas paint and then flip. Reading
 * the same localStorage key from a blocking inline script is the only way to
 * have the right colours on the very first frame. It is deliberately tiny and
 * swallows its own errors, since storage can be unavailable.
 */
const themeScript = `try{var s=JSON.parse(localStorage.getItem('serenity.state.v1')||'{}');var l=s&&s.settings&&s.settings.lightMode;document.documentElement.dataset.theme=l?'light':'dark';if(l){var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','#FFFFFF');}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The theme script below may switch `data-theme` to light before React
    // loads, so that one attribute is expected to differ from the server's.
    <html lang="en" className={poppins.variable} data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-canvas font-sans text-ink antialiased">
        <AppProvider>
          <CirclesProvider>
            <AudioProvider>
              <UndoProvider>
                <DeviceStage>{children}</DeviceStage>
              </UndoProvider>
              <NavigationTracker />
              <ServiceWorkerRegistrar />
              <ReminderScheduler />
              <CircleSync />
            </AudioProvider>
          </CirclesProvider>
        </AppProvider>
      </body>
    </html>
  );
}
