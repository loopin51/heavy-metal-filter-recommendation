"""API 라우터."""

from fastapi import APIRouter, HTTPException

from ..engine.data_loader import get_db_version, load_db
from ..engine.recommender import recommend
from ..models.input import FilterInput
from ..models.output import FilterRecommendation

router = APIRouter(prefix="/api")


@router.post("/recommend", response_model=FilterRecommendation)
async def get_recommendation(inp: FilterInput) -> FilterRecommendation:
    try:
        db = load_db()
        return recommend(inp, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"추천 생성 실패: {e}") from e


@router.get("/materials")
async def get_materials() -> list[dict]:
    db = load_db()
    return db["materials"]["materials"]


@router.get("/materials/{material_id}")
async def get_material(material_id: str) -> dict:
    db = load_db()
    materials = {m["id"]: m for m in db["materials"]["materials"]}
    if material_id not in materials:
        raise HTTPException(status_code=404, detail="소재를 찾을 수 없습니다.")
    return materials[material_id]


@router.get("/metals")
async def get_metals() -> list[dict]:
    db = load_db()
    return db["heavy_metals"]["heavy_metals"]


@router.get("/scenarios")
async def get_scenarios() -> list[dict]:
    db = load_db()
    return db["scenarios"]["scenarios"]


@router.get("/adsorption/{record_id}")
async def get_adsorption_record(record_id: str) -> dict:
    """레코드 ID 로 흡착 실험 데이터 조회 (설명 가능성: 근거 추적용)."""
    db = load_db()
    records = {r["id"]: r for r in db["adsorption_data"]["records"]}
    if record_id not in records:
        raise HTTPException(status_code=404, detail="레코드를 찾을 수 없습니다.")
    return records[record_id]


@router.get("/db/version")
async def get_db_version_endpoint() -> dict:
    return get_db_version()


@router.get("/health")
async def health() -> dict:
    return {"status": "ok"}
