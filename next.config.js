/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "test.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  reactStrictMode: true,
  profiler: true,
};

module.exports = nextConfig;
