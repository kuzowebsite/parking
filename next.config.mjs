/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features
  experimental: {
    // Enable server actions
    serverActions: true,
    // Enable app directory
    appDir: true,
  },

  // Image optimization configuration
  images: {
    // Allow external image domains
    domains: [
      'firebasestorage.googleapis.com',
      'blob.v0.dev',
      'localhost',
    ],
    // Enable image formats
    formats: ['image/webp', 'image/avif'],
    // Image sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Handle canvas module for server-side rendering
    if (isServer) {
      config.externals.push('canvas');
    }

    // Add fallbacks for Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };

    return config;
  },

  // Environment variables
  env: {
    CUSTOM_KEY: 'my-value',
  },

  // Headers configuration
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },

  // Rewrites
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },

  // Output configuration
  output: 'standalone',

  // Compression
  compress: true,

  // Power by header
  poweredByHeader: false,

  // React strict mode
  reactStrictMode: true,

  // SWC minification
  swcMinify: true,

  // Trailing slash
  trailingSlash: false,

  // TypeScript configuration
  typescript: {
    // Ignore build errors during development
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Ignore ESLint errors during builds
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
