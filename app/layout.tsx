import { EnvConfigNotice } from '@/components/EnvConfigNotice';
import { Header } from '@/components/Header';
import { RouteProgress } from '@/components/nav/RouteProgress';
import { OfflineBanner } from '@/components/pwa/OfflineBanner';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import { ToastProvider } from '@/components/ui/Toast';
import { resolveMetadataBase } from '@/lib/site';
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: 'Cadernos Vivos',
  description: 'Base inicial do app Cadernos Vivos',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Cadernos',
    startupImage: ['/icons/apple-splash-1170x2532.png'],
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'mobile-web-app-capable': 'yes',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.svg'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#171b21',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const snapshotMode = process.env.UI_SNAPSHOT === '1' || process.env.NEXT_PUBLIC_UI_SNAPSHOT === '1';
  return (
    <html lang='pt-BR' data-motion={snapshotMode ? 'off' : undefined}>
      <body>
        <ToastProvider>
          <ServiceWorkerRegister />
          <RouteProgress />
          <Header />
          <OfflineBanner />
          <EnvConfigNotice />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
