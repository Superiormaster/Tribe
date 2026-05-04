/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config) => {
    config.watchOptions = {
      ignored: [
        "/node_modules/",
        "/.next/",
        "/data/",
        "/proc/",
        "/sys/",
      ],
    };
    return config;
  },
};

module.exports = nextConfig;