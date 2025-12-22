import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    domains: ['ui-avatars.com', 'images.unsplash.com'],
  },
};

export default nextConfig;