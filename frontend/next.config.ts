import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 배포용: 실행에 필요한 최소 파일만 묶는 독립 실행 번들 생성
  output: "standalone",
};

export default nextConfig;
