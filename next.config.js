/** @type {import('next').NextConfig} */
const nextConfig = {
  // Wiki is a Quartz-built static site living in public/wiki/.
  // Quartz emits relative paths (./index.css, ./Principle_The_Veil), so:
  // 1. Redirect /wiki -> /wiki/ so the browser treats /wiki/ as the directory base for relative URLs
  // 2. Rewrite /wiki/ -> /wiki/index.html (Next.js doesn't auto-serve index.html for directory paths in public/)
  // 3. Rewrite /wiki/<anything> -> /wiki/<anything>.html since Quartz emits extensionless URLs
  // Existing static files (e.g. /wiki/index.css, /wiki/static/icon.png) are served directly because public/ takes precedence over rewrites.
  async redirects() {
    return [
      { source: '/wiki', destination: '/wiki/', permanent: false },
    ];
  },
  async rewrites() {
    return [
      { source: '/wiki/', destination: '/wiki/index.html' },
      { source: '/wiki/:path+', destination: '/wiki/:path+.html' },
    ];
  },
};

module.exports = nextConfig;
