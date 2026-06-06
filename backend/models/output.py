"""출력 데이터 모델 (Pydantic v2)."""

from typing import Optional

from pydantic import BaseModel


class ThicknessRange(BaseModel):
    min_cm: int
    max_cm: int
    recommended_cm: int


class FilterLayer(BaseModel):
    slot: int
    material_id: str
    name_kr: str
    name_en: str
    role: str
    is_mandatory: bool
    trigger: Optional[str] = None  # 조건부 레이어만
    mechanism: str
    reaction_eq: str
    thickness: ThicknessRange
    target_metals: list[str]
    mechanism_detail: str  # 상세 설명 (2–3문장)
    optimal_pH: str
    qmax_summary: str  # "Pb²⁺: 815 mg/g" 형식
    regeneration: str
    supporting_record_ids: list[str]  # adsorption_data.json 레코드 ID
    reference: str  # 참고문헌 요약


class Warning(BaseModel):
    severity: str  # "info" | "caution" | "danger"
    code: str
    message: str
    action: str


class RemovalEstimate(BaseModel):
    metal: str
    estimated_pct: float  # 소수점 1자리
    confidence: str  # "high" | "medium" | "low"
    confidence_note: str  # 신뢰도 낮은 이유 설명
    limiting_layer: Optional[str] = None  # 병목 레이어 ID
    correction_applied: str  # "batch→column ×0.40, 경쟁흡착 페널티" 등
    supporting_records: list[str] = []  # 근거 레코드 ID


class DesignParams(BaseModel):
    total_thickness_min_cm: int
    total_thickness_max_cm: int
    layer_count: int
    HLR_m_h: float
    EBCT_min: float


class ConfidenceReport(BaseModel):
    score: float  # 0.0–1.0
    level: str  # "high" | "medium" | "low"
    note: str  # 신뢰도 낮은 항목 설명


class FilterRecommendation(BaseModel):
    filter_stack: list[FilterLayer]
    warnings: list[Warning]
    metal_removal: dict[str, RemovalEstimate]
    design_params: DesignParams
    confidence: ConfidenceReport
    db_version: str
    model_version: str
    disclaimer: str  # 면책 문구 (항상 포함)
