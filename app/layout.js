import './globals.css';

export const metadata = {
  title: 'Nirmanakaya',
  description: 'Consciousness Architecture Reading System - AI oracle for exploring patterns of meaning',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  verification: {
    google: 'tsUiRn7orVfh2SYaB4xB61BDR89n16URB8t92WA2gDY',
  },
  other: {
    'privacy-policy': 'https://www.nirmanakaya.com/privacy',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="privacy-policy" href="https://www.nirmanakaya.com/privacy" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
