"""FastAPI 진입점."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .engine.data_loader import load_db
from .routers.recommend import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 서버 시작 시 DB 로드 — 실패하면 즉시 종료(불완전 상태 운영 방지)
    try:
        load_db()
        print("✅ DB 로드 완료")
    except Exception as e:  # noqa: BLE001
        print(f"❌ DB 로드 실패: {e}")
        raise SystemExit(1) from e
    yield


app = FastAPI(
    title="중금속 흡착 필터 추천 API",
    version="1.0.0",
    docs_url="/docs",
    lifespan=lifespan,
)

_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
async def root() -> dict:
    return {"service": "중금속 흡착 필터 추천 API", "docs": "/docs", "health": "/api/health"}
