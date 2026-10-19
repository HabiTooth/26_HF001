import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // dev 서버 두 개가 같은 .next를 쓰면 매니페스트가 깨짐
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  compiler: {
    styledComponents: true,
  },
  devIndicators: false,
};

export default nextConfig;
