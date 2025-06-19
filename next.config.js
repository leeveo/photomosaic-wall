/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use transpilePackages to ensure jose works correctly
  transpilePackages: ['jose'],
  
  // Add proper environment settings
  experimental: {
    serverComponentsExternalPackages: ['jose'],
  },
};

module.exports = nextConfig;
