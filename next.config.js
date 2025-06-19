/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use serverExternalPackages instead of transpilePackages for jose
  // since there's a conflict when using both
  serverExternalPackages: ['jose'],
};

module.exports = nextConfig;
