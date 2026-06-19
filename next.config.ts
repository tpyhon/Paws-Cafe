import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'imgfp.hotp.jp' },
    ],
  },
};

export default nextConfig;
