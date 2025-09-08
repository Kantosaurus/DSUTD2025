/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    //appDir: true,
  },
  images: {
    domains: [
      "api.microlink.io", // Microlink Image Preview
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `http://backend:3001/api/:path*`,
      },
    ];
  },
  output: 'standalone',
};