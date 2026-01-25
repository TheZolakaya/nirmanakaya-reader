import './globals.css';

export const metadata = {
  title: 'Nirmanakaya',
  description: 'Consciousness Architecture Reading System',
  verification: {
    google: 'tsUiRn7orVfh2SYaB4xB61BDR89n16URB8t92WA2gDY',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
