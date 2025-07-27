/** @type {import('next').NextConfig} */
const nextConfig = {
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
    // Optimize bundle splitting
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
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },

  // Compression
  compress: true,

  // Powered by header
  poweredByHeader: false,
};

module.exports = nextConfig; 