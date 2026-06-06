"""지식 DB 로더.

서버 시작 시 모든 DB 파일을 메모리에 로드한다.
경로는 환경 변수 ``DB_PATH`` 로 설정하며, 미설정 시 저장소 루트의 ``db/`` 폴더를
이 파일 위치 기준으로 자동 해석한다 (실행 디렉터리에 무관하게 동작).
"""

import json
import os
from functools import lru_cache
from pathlib import Path

# backend/engine/data_loader.py -> backend/engine -> backend -> <repo root>
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_DEFAULT_DB_PATH = _REPO_ROOT / "db"

_REQUIRED_FILES = {
    "materials": "materials.json",
    "heavy_metals": "heavy_metals.json",
    "adsorption_data": "adsorption_data.json",
    "filter_rules": "filter_rules.json",
    "scenarios": "scenarios.json",
}


def _resolve_db_path() -> Path:
    env = os.getenv("DB_PATH")
    if env:
        p = Path(env)
        if not p.is_absolute():
            # 상대 경로는 현재 작업 디렉터리 기준으로 시도하되,
            # 존재하지 않으면 저장소 루트 기준으로 폴백한다.
            cwd_candidate = Path.cwd() / p
            if cwd_candidate.exists():
                return cwd_candidate
            root_candidate = (_REPO_ROOT / p).resolve()
            if root_candidate.exists():
                return root_candidate
            return cwd_candidate
        return p
    return _DEFAULT_DB_PATH


@lru_cache(maxsize=1)
def load_db() -> dict:
    """모든 DB 파일을 읽어 단일 dict 로 반환한다.

    파일이 하나라도 없거나 JSON 파싱에 실패하면 예외를 발생시켜
    불완전한 상태로 서버가 기동되지 않도록 한다.
    """
    db_path = _resolve_db_path()
    if not db_path.exists():
        raise FileNotFoundError(f"DB 경로를 찾을 수 없습니다: {db_path}")

    db: dict = {}
    for key, filename in _REQUIRED_FILES.items():
        file_path = db_path / filename
        if not file_path.exists():
            raise FileNotFoundError(f"필수 DB 파일 누락: {file_path}")
        db[key] = json.loads(file_path.read_text(encoding="utf-8"))

    db["_db_path"] = str(db_path)
    return db


def get_db_version(db: dict | None = None) -> dict:
    """DB / 모델 버전 메타데이터."""
    db = db or load_db()
    return {
        "db_version": db.get("materials", {}).get("metadata", {}).get("version", "1.0"),
        "model_version": os.getenv("MODEL_VERSION", "1.0"),
        "last_updated": db.get("materials", {}).get("metadata", {}).get("created", "2026-06"),
    }
