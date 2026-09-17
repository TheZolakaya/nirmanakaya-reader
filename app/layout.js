import './globals.css';

export const metadata = {
  title: 'Nirmanakaya',
  description: 'Consciousness Architecture Reading System - AI oracle for exploring patterns of meaning',
  icons: {
    icon: '/favicon.png',
    apple: '/icons/apple-touch-icon.png',
  },
  // THE WEB APP (founder, 2026-09-17): a manifest and icons so "Add to Home Screen" yields a real
  // app — its own icon and name, full screen, a dark splash — and Android/desktop Chrome offer install.
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Nirmanakaya' },
  applicationName: 'Nirmanakaya',
  verification: {
    google: 'tsUiRn7orVfh2SYaB4xB61BDR89n16URB8t92WA2gDY',
  },
  other: {
    'privacy-policy': 'https://www.nirmanakaya.com/privacy',
  },
};

export const viewport = { themeColor: '#09090b', viewportFit: 'cover', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="privacy-policy" href="https://www.nirmanakaya.com/privacy" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased flex flex-col min-h-screen">
        {children}
      </body>
    </html>
  );
}
