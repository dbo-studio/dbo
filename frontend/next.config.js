const withPWA = require('next-pwa')({
  dest: 'public'
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'test.com',
        port: '',
        pathname: '/**'
      }
    ]
  }
};

module.exports = process.env.NODE_ENV === 'development' ? nextConfig : withPWA(nextConfig);
