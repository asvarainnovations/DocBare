/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker optimization - using Asvara site approach with Prisma

  // Optimize package imports
  experimental: {
    optimizePackageImports: [
      '@heroicons/react',
      'framer-motion',
      'react-markdown',
      'react-syntax-highlighter'
    ],
  },

  // Webpack configuration for better code splitting
  webpack: (config, { dev, isServer }) => {
    // Fix module compatibility issues
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Handle problematic modules
    config.module.rules.push({
      test: /\.m?js$/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    });



    // Optimize bundle splitting (only in production)
    if (!dev) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            enforce: true,
          },
        },
      };
    }

    // Dynamic imports for heavy components
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'react-syntax-highlighter': 'react-syntax-highlighter/dist/esm',
      };
    }

    return config;
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google OAuth profile images
      },
      {
        protocol: 'https',
        hostname: 'lh4.googleusercontent.com', // Alternative Google image domain
      },
      {
        protocol: 'https',
        hostname: 'lh5.googleusercontent.com', // Alternative Google image domain
      },
      {
        protocol: 'https',
        hostname: 'lh6.googleusercontent.com', // Alternative Google image domain
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },

  // Compression
  compress: true,

  // Powered by header
  poweredByHeader: false,
};

module.exports = nextConfig; 