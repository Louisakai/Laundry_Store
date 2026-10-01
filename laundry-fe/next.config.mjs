/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Cache buster: deployment timestamp
};

export default nextConfig;
