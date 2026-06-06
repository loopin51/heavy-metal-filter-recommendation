# 프론트엔드 컨테이너 (Next.js standalone 멀티스테이지 빌드)
# 빌드 컨텍스트 = frontend/

# ── 1) 의존성 설치 ────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm@11.5.2
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
# 리눅스 컨테이너의 현재 아키텍처용 바이너리만 설치됨 (supportedArchitectures: current)
RUN pnpm install --frozen-lockfile

# ── 2) 빌드 ──────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@11.5.2
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 기본은 같은 출처 프록시 방식:
#   - NEXT_PUBLIC_API_URL 비움 → 브라우저는 /api/* 를 자기 출처로 호출
#   - BACKEND_INTERNAL_URL → Next 서버가 백엔드로 프록시(rewrites). compose에선 http://backend:8000
ARG NEXT_PUBLIC_API_URL=
ARG NEXT_PUBLIC_DB_VERSION=1.0
ARG BACKEND_INTERNAL_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_DB_VERSION=${NEXT_PUBLIC_DB_VERSION}
ENV BACKEND_INTERNAL_URL=${BACKEND_INTERNAL_URL}
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

# ── 3) 실행 (최소 런타임 이미지) ──────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Next 서버 → 백엔드 프록시 주소 (compose에서 http://backend:8000 으로 덮어씀)
ENV BACKEND_INTERNAL_URL=http://localhost:8000

# 비루트 사용자로 실행
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# standalone 출력물 + 정적 자산만 복사
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
