# 백엔드 컨테이너 이미지 (빌드 컨텍스트 = 저장소 루트)
# db/ 폴더를 이미지에 포함하여 배포한다.
FROM python:3.12-slim

WORKDIR /app

# uv 설치
RUN pip install --no-cache-dir uv

# 의존성 먼저 설치 (레이어 캐시 활용)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# 애플리케이션 + 지식 DB 복사
COPY backend ./backend
COPY db ./db

ENV DB_PATH=/app/db \
    MODEL_VERSION=1.0 \
    ALLOWED_ORIGINS=http://localhost:3000 \
    PYTHONPATH=/app \
    PYTHONUNBUFFERED=1

EXPOSE 8000

# gunicorn + uvicorn worker (운영). 패키지 경로는 backend.main:app
# (PYTHONPATH=/app 로 backend 패키지 임포트 보장)
CMD ["uv", "run", "gunicorn", "backend.main:app", \
     "-w", "4", "-k", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000"]
