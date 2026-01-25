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
      <body className="antialiased">
        {children}
        {/* SEO footer - always in DOM for crawlers, visually subtle */}
        <footer style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          textAlign: 'center',
          padding: '8px',
          background: 'transparent',
          zIndex: 1,
          pointerEvents: 'none'
        }}>
          <nav style={{ pointerEvents: 'auto' }}>
            <span style={{ color: '#52525b', fontSize: '10px', marginRight: '8px' }}>
              Nirmanakaya: AI oracle for exploring patterns of meaning
            </span>
            <a href="https://www.nirmanakaya.com/privacy" style={{ color: '#52525b', fontSize: '10px', marginRight: '8px', textDecoration: 'underline' }}>Privacy Policy</a>
            <a href="https://www.nirmanakaya.com/terms" style={{ color: '#52525b', fontSize: '10px', textDecoration: 'underline' }}>Terms of Service</a>
          </nav>
        </footer>
      </body>
    </html>
  );
}
