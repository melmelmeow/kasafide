import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Kasafide',
  description: 'Verified homes in Sta. Maria, Bulacan.',
  icons: {
    icon: [
      { url: '/assets/img/kasafide-favicon.svg', type: 'image/svg+xml' },
      { url: '/assets/img/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/assets/img/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/assets/img/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/assets/css/kasafide-theme.css" />
        <Script src="/assets/js/kasafide-theme.js" strategy="beforeInteractive" />
        <Script src="/assets/js/kasafide-logo.js" strategy="beforeInteractive" />
      </head>
      <body className={plusJakartaSans.className} suppressHydrationWarning>{children}</body>
    </html>
  );
}
