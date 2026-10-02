/** @type {import('next').NextConfig} */
const nextConfig = {
  // THE FLOOR (the Pour): the snapshot files are read with fs at request time; trace them into the reading function's bundle.
  experimental: { outputFileTracingIncludes: { '/api/reading': ['./data/pour/snapshot/**'] } },
  // Wiki is a Quartz-built static site living in public/wiki/.
  // Quartz emits relative paths and extensionless URLs. We handle both via:
  // - Rewrite /wiki -> /wiki/index.html so the homepage URL works
  // - Rewrite /wiki/<anything> -> /wiki/<anything>.html so extensionless internal links resolve
  // - A <base href="/wiki/"> tag is injected into every HTML file (see scripts/build-wiki.js)
  //   which makes relative paths (./index.css, ./Principle_The_Veil) resolve from /wiki/ even
  //   when the URL bar shows /wiki (no trailing slash). This avoids needing trailingSlash:true
  //   globally OR a redirect that would loop with Next's default trailing-slash stripping.
  // Existing static files (CSS, JS, images, fonts under public/wiki/) are served directly
  // because public/ takes precedence over rewrites.
  async rewrites() {
    return [
      { source: '/wiki', destination: '/wiki/index.html' },
      { source: '/wiki/:path+', destination: '/wiki/:path+.html' },
    ];
  },
};

module.exports = nextConfig;
