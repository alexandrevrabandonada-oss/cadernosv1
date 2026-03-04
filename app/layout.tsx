import { EnvConfigNotice } from '@/components/EnvConfigNotice';
import { Header } from '@/components/Header';
import { ToastProvider } from '@/components/ui/Toast';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cadernos Vivos',
  description: 'Base inicial do app Cadernos Vivos',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang='pt-BR'>
      <body>
        <ToastProvider>
          <Header />
          <EnvConfigNotice />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
