const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

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

    config.resolve.fallback = {
      ...config.resolve.fallback,
      bufferutil: false,
      "utf-8-validate": false,
    };

    return config;
  },
};

module.exports = withPWA(nextConfig);