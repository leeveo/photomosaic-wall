/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use serverExternalPackages instead of transpilePackages for jose
  // since there's a conflict when using both
  serverExternalPackages: ['jose'],

  // Add redirects configuration
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'source.waibooth.app', // Replace with your source domain
          },
        ],
        destination: 'https://mosaic.waibooth.app/:path*',
        permanent: true, // 301 redirect
      },
    ];
  },
};

module.exports = nextConfig;
