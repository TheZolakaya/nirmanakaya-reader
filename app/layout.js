import './globals.css';

export const metadata = {
  title: 'Nirmanakaya Reader',
  description: 'Consciousness Architecture Reading System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
