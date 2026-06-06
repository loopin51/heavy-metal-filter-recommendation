# 중금속 흡착 필터 추천 웹서비스

동료심사 학술 문헌에서 추출한 흡착 데이터(`db/`)를 기반으로, 오염 조건에 맞는 다층 흡착
필터 구조를 추천하고 **각 추천의 과학적 근거(레코드 ID·반응식·보정 계수)를 함께 제시**하는
연구·교육용 서비스입니다.

핵심 원칙: 모든 성능 수치는 DB 레코드에서 계산되며(하드코딩 없음), 신뢰도가 낮은 수치는
시각적으로 구분되고, 모델의 한계와 보정 계수가 결과 화면에 항상 명시됩니다.

---

## 구조

```
프로젝트 루트/
├── db/                  # 지식 데이터베이스 (수정 금지) — 소재 12·중금속 10·흡착 55레코드
├── backend/             # FastAPI 백엔드 (패키지명: backend)
│   ├── main.py          # 앱 진입점 (lifespan 으로 DB 로드, 실패 시 즉시 종료)
│   ├── models/          # Pydantic v2 입력/출력 모델
│   ├── engine/          # data_loader + recommender (Phase 1·2·3)
│   ├── routers/         # /api/* 라우터
│   └── tests/           # pytest 20케이스
├── frontend/            # Next.js 16 + React 19 + Tailwind v4
│   ├── app/             # /, /materials, /materials/[id], /about
│   ├── components/      # input/ result/ common/
│   └── lib/             # api.ts, types.ts, constants.ts
├── pyproject.toml       # uv 프로젝트 (저장소 루트)
└── Dockerfile           # 백엔드 컨테이너 (db/ 포함)
```

> **레이아웃 메모**: 추천 엔진/테스트 코드(요청서 사양)가 `backend` 패키지 기준 상대 임포트
> (`from ..models`, `from ..engine`)를 사용하므로, `pyproject.toml`을 저장소 루트에 두고
> `backend`를 패키지로 실행합니다. 따라서 앱은 `backend.main:app`으로 기동합니다.

---

## 로컬 개발 실행

### 백엔드 (포트 8000)

```bash
# 저장소 루트에서
uv sync
uv run python -m uvicorn backend.main:app --reload --port 8000
```

- API 문서: http://localhost:8000/docs
- 헬스체크: http://localhost:8000/api/health
- 환경 변수: `backend/.env.example` 참고 (`DB_PATH` 미설정 시 루트 `db/` 자동 해석)

### 프론트엔드 (포트 3000)

```bash
cd frontend
pnpm install
pnpm dev
```

- `frontend/.env.local`의 `NEXT_PUBLIC_API_URL`이 백엔드 주소(기본 `http://localhost:8000`)를 가리킵니다.
- 백엔드 CORS는 기본적으로 `http://localhost:3000`만 허용합니다(`ALLOWED_ORIGINS`).

---

## 테스트 / 린트

```bash
uv run python -m pytest          # 백엔드 20케이스
uv run ruff check backend        # 백엔드 린트
cd frontend && pnpm lint         # 프론트엔드 린트
cd frontend && pnpm build        # 프론트엔드 프로덕션 빌드 + 타입체크
```

---

## API 요약

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/recommend` | 필터 추천 (핵심) |
| GET | `/api/materials` · `/api/materials/{id}` | 소재 목록·상세 |
| GET | `/api/metals` | 중금속 목록 |
| GET | `/api/scenarios` | 시나리오 목록 |
| GET | `/api/adsorption/{record_id}` | 흡착 레코드 조회 (근거 추적) |
| GET | `/api/db/version` · `/api/health` | 버전·헬스 |

요청 예시:

```bash
curl -X POST http://localhost:8000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"scenario":"mining","metals":["Pb2+","As3+"],"level":"high","pH_range":"acidic"}'
```

---

## 추천 모델 (model_design.md 구현)

- **Phase 1 전처리** — 금속 전하 분류(양이온/음이온)
- **Phase 2 규칙 엔진** — 9개 슬롯 템플릿에 pH → 오염도 → 금속 규칙을 순서대로 적용 (결정론적)
- **Phase 3 스코어링** — `R_total = 1 − Π(1 − Rᵢ)`. 각 Rᵢ에 배치→컬럼 보정(×0.40), pH 호환
  계수, 경쟁 흡착 페널티 `1/(1+0.1·n)`를 적용하고 사용한 레코드 ID·보정 내용을 함께 기록.

면책: 모든 제거율은 배치 조건 문헌값에 컬럼 보정을 적용한 이론적 추정값이며, 현장 적용 전
파일럿 컬럼 실험이 필요합니다.

---

## 배포 (Docker)

백엔드·프론트엔드를 모두 컨테이너로 제공합니다.

### 한 번에 띄우기 — Docker Compose (권장)

```bash
docker compose up --build
#   프론트엔드  http://localhost:3000
#   백엔드 API  http://localhost:8000/docs
docker compose down            # 종료
```

구성:
- `backend` — [`Dockerfile`](Dockerfile) (빌드 컨텍스트 = 루트, `db/` 포함, gunicorn 4 workers)
- `frontend` — [`frontend/Dockerfile`](frontend/Dockerfile) (Next.js standalone, 비루트 실행)
- 프론트엔드는 백엔드 헬스체크가 통과(`condition: service_healthy`)한 뒤 기동됩니다.

### 네트워킹: 같은 출처(same-origin) 프록시

브라우저는 **프론트엔드 출처(3000) 하나로만 통신**합니다. `/api/*` 요청은 Next 서버가
내부적으로 백엔드에 프록시합니다([`frontend/next.config.ts`](frontend/next.config.ts) `rewrites`).

- 브라우저는 백엔드 주소를 몰라도 됨 → **CORS 불필요**
- **Tailscale·ngrok·역방향 프록시 등으로 포트 3000만 외부에 노출**하면 백엔드 fetch가 동작
  (백엔드 8000은 외부로 열 필요 없음)

### 운영 환경 변수

| 변수 | 서비스 | 의미 | 기본값 |
|------|--------|------|--------|
| `BACKEND_INTERNAL_URL` | frontend | Next 서버 → 백엔드 내부 주소 | compose: `http://backend:8000` |
| `ALLOWED_ORIGINS` | backend | CORS 허용 출처 (직접 호출 시에만 필요) | `http://localhost:3000` |

> 절대 주소로 백엔드를 **직접** 호출하고 싶다면(프록시 미사용), 프론트 빌드 시
> `--build-arg NEXT_PUBLIC_API_URL=https://api.example.com` 를 주고 백엔드 `ALLOWED_ORIGINS`에
> 프론트 공개 주소를 추가하세요.

#### Tailscale로 외부 접속 예시

```bash
docker compose up -d --build      # 로컬에서 3000·8000 컨테이너 기동
tailscale serve 3000              # 프론트엔드만 테일넷에 노출 (HTTPS)
# 다른 기기 브라우저에서 https://<머신>.<테일넷>.ts.net 접속 → /api 는 자동 프록시됨
```

### 개별 빌드 / 클라우드 배포

```bash
# 백엔드만 (Render·Railway 등)
docker build -t filter-api .          # 컨텍스트 = 루트, db/ 포함 (DB_PATH=/app/db)
docker run -p 8000:8000 filter-api

# 프론트엔드만 — 프록시 대상 백엔드 주소를 빌드 인자로
docker build -t filter-web \
  --build-arg BACKEND_INTERNAL_URL=http://backend:8000 ./frontend
docker run -p 3000:3000 -e BACKEND_INTERNAL_URL=http://backend:8000 filter-web
```

이미지 크기(참고): 백엔드 ~309MB · 프론트엔드 ~280MB.
