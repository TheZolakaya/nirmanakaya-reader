/** @type {import('next').NextConfig} */
const nextConfig = {
  // Wiki is served as static files from public/wiki/.
  // This rewrite ensures /wiki (no trailing slash) lands on the wiki homepage.
  async rewrites() {
    return [
      { source: '/wiki', destination: '/wiki/index.html' },
    ];
  },
};

module.exports = nextConfig;
