/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google OAuth profile images
      },
      {
        protocol: "https",
        hostname: "lh4.googleusercontent.com", // Alternative Google image domain
      },
      {
        protocol: "https",
        hostname: "lh5.googleusercontent.com", // Alternative Google image domain
      },
      {
        protocol: "https",
        hostname: "lh6.googleusercontent.com", // Alternative Google image domain
      },
    ],
    formats: ["image/webp", "image/avif"],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

module.exports = nextConfig;
