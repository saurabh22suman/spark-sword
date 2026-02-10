/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  eslint: {
    ignoreDuringBuilds: true,  // Temporarily ignore ESLint errors
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { 
            key: 'Content-Security-Policy', 
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self' http://localhost:8000 http://backend:8000 https://accounts.google.com;"
          },
        ],
      },
    ];
  },
  
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:8000/api/:path*',
      },
      {
        source: '/health',
        destination: 'http://backend:8000/health',
      },
    ];
  },
};

module.exports = nextConfig;
