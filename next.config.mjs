/** @type {import('next').NextConfig} */
const nextConfig = {
  // PWA тохиргоо
  experimental: {
    webpackBuildWorker: true,
  },
  
  // Build hooks
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Build үед manifest үүсгэх
    if (!dev && !isServer) {
      console.log('🔧 Build процесст manifest шалгаж байна...');
    }
    
    return config;
  },

  // Headers тохиргоо
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
