import './globals.css';

export const metadata = {
  title: 'Nirmanakaya',
  description: 'Consciousness Architecture Reading System - AI oracle for exploring patterns of meaning',
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
      </head>
      <body className="antialiased" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Top navigation bar with legal links - easily accessible */}
        <header style={{
          backgroundColor: '#09090b',
          borderBottom: '1px solid #27272a',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ color: '#fafafa', fontSize: '16px', fontWeight: '500' }}>Nirmanakaya</span>
          <nav style={{ display: 'flex', gap: '24px' }}>
            <a href="https://www.nirmanakaya.com/privacy" style={{ color: '#fafafa', fontSize: '14px', textDecoration: 'underline' }}>Privacy Policy</a>
            <a href="https://www.nirmanakaya.com/terms" style={{ color: '#fafafa', fontSize: '14px', textDecoration: 'underline' }}>Terms of Service</a>
          </nav>
        </header>
        <main style={{ flex: 1 }}>
          {children}
        </main>
        {/* Footer with legal links */}
        <footer style={{
          textAlign: 'center',
          padding: '16px',
          backgroundColor: '#18181b',
          borderTop: '1px solid #27272a'
        }}>
          <p style={{ color: '#a1a1aa', fontSize: '14px', margin: '0 0 8px 0' }}>
            Nirmanakaya: AI oracle for exploring patterns of meaning
          </p>
          <nav>
            <a href="https://www.nirmanakaya.com/privacy" style={{ color: '#d4d4d8', fontSize: '14px', marginRight: '24px', textDecoration: 'underline' }}>Privacy Policy</a>
            <a href="https://www.nirmanakaya.com/terms" style={{ color: '#d4d4d8', fontSize: '14px', textDecoration: 'underline' }}>Terms of Service</a>
          </nav>
        </footer>
      </body>
    </html>
  );
}
