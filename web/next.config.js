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
  
     // Disable optional ws native modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      bufferutil: false,
      "utf-8-validate": false,
    };

    return config;
  },
};

module.exports = nextConfig;