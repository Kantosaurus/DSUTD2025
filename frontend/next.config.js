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
  output: 'standalone',
};