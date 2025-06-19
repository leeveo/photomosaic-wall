/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['icchwywclqqoxshugiog.supabase.co'],
  },
  webpack: (config, { isServer, dev }) => {
    // This allows Next.js to properly resolve jose imports
    config.resolve.alias = {
      ...config.resolve.alias,
      '../../key/import.js': require.resolve('jose/dist/node/key/import'),
    };
    
    // Fix jose imports for browser environments
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
      };
    }
    
    return config;
  },
  // Add transpilePackages to ensure jose works correctly
  transpilePackages: ['jose'],
}

module.exports = nextConfig
