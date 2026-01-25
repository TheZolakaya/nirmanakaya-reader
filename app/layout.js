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
      <body className="antialiased" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <main style={{ flex: 1 }}>
          {children}
        </main>
        {/* SEO footer - standard footer for crawlers */}
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
            <a href="https://www.nirmanakaya.com/privacy" style={{ color: '#71717a', fontSize: '12px', marginRight: '16px', textDecoration: 'underline' }}>Privacy Policy</a>
            <a href="https://www.nirmanakaya.com/terms" style={{ color: '#71717a', fontSize: '12px', textDecoration: 'underline' }}>Terms of Service</a>
          </nav>
        </footer>
      </body>
    </html>
  );
}
