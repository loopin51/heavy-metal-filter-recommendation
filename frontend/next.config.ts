import type { NextConfig } from "next";

// 백엔드 내부 주소 (Next 서버 → 백엔드). 브라우저가 아니라 서버에서 접근하는 주소.
//  - 로컬 dev:        http://localhost:8000
//  - docker compose:  http://backend:8000
const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  // Docker 배포용: 실행에 필요한 최소 파일만 묶는 독립 실행 번들 생성
  output: "standalone",

  // 같은 출처(same-origin) 프록시:
  // 브라우저는 항상 자신이 로드된 출처(예: Tailscale의 3000 포트)로 /api/* 를 호출하고,
  // Next 서버가 이를 백엔드로 전달한다. → 브라우저는 백엔드 주소를 몰라도 되고 CORS도 불필요.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_INTERNAL_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
