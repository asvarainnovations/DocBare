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
    serverComponentsExternalPackages: ['@google-cloud/firestore', '@google-cloud/storage', '@google-cloud/documentai', '@google-cloud/aiplatform', 'google-auth-library'],
  },

  // Webpack configuration for better code splitting
  webpack: (config, { isServer }) => {
    // Fix 'self is not defined' error
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'canvas': 'canvas',
        'jsdom': 'jsdom',
        'abort-controller': 'abort-controller',
        '@google-cloud/firestore': 'commonjs @google-cloud/firestore',
        '@google-cloud/storage': 'commonjs @google-cloud/storage',
        '@google-cloud/documentai': 'commonjs @google-cloud/documentai',
        '@google-cloud/aiplatform': 'commonjs @google-cloud/aiplatform',
        'google-auth-library': 'commonjs google-auth-library',
      });
    }

    // Add fallbacks for missing modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'dlv': false,
      'has-flag': false,
    };

    // Add alias for dlv to provide a working implementation
    config.resolve.alias = {
      ...config.resolve.alias,
      'dlv': require.resolve('./lib/dlv-polyfill.js'),
    };

    // Define global variables for server-side compilation
    const webpack = require('webpack');
    config.plugins.push(
      new webpack.DefinePlugin({
        'global': 'globalThis',
        'self': 'globalThis',
        'window': 'globalThis',
        'document': 'undefined',
        'navigator': 'undefined',
        'location': 'undefined',
      })
    );

    // Provide global variables
    config.plugins.push(
      new webpack.ProvidePlugin({
        'global': 'global',
        'self': 'globalThis',
        'window': 'globalThis',
        'document': 'undefined',
        'navigator': 'undefined',
        'location': 'undefined',
      })
    );

    // Optimize bundle splitting (only in production)
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