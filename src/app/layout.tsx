import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Zaldívar Drilling - Control Operacional PWA',
  description: 'Aplicación PWA Offline-First para control de procedimientos de perforación minera.',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#F59E0B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className="bg-mining-dark text-slate-100 antialiased selection:bg-mining-primary selection:text-mining-dark">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
