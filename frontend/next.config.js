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
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
};