# 중금속 흡착 필터 추천 웹서비스 개발 요청서
## (코딩 에이전트용 구현 가이드)

> **대상**: Claude Code 또는 동등한 코딩 에이전트  
> **작성일**: 2026-06  
> **우선 읽을 문서**: `project_spec.md` → `model_design.md` → `db/README.md` → 이 문서  
> **핵심 요건**: 신뢰성(Trustworthiness) + 설명 가능성(Explainability)

---

## 0. 시작 전 필독 사항

### 0.1 이 프로젝트의 본질

이 서비스는 **과학적 근거 기반 추천 시스템**이다.
추천 결과의 모든 수치는 동료심사 학술 문헌에서 추출한 데이터(`db/adsorption_data.json`)에
직접 연결되어야 하며, 사용자는 "왜 이 소재가 추천되었는가"를 언제든 확인할 수 있어야 한다.

**절대 원칙**:
- 추천 결과를 임의로 생성하거나 하드코딩하지 않는다
- 모든 성능 수치는 DB 레코드에서 계산된 값이어야 한다
- 신뢰도가 낮은 수치는 반드시 시각적으로 구분하여 표시한다
- 모델의 한계와 보정 계수를 결과 화면에 항상 명시한다

### 0.2 프로젝트 파일 구조

```
프로젝트 루트/
├── db/                              # 지식 데이터베이스 (수정 금지)
│   ├── README.md
│   ├── materials.json               # 흡착 소재 12종
│   ├── heavy_metals.json            # 중금속 10종
│   ├── adsorption_data.json         # 흡착 실험 데이터 55건
│   ├── adsorption_data.csv          # 위와 동일 (분석용)
│   ├── filter_rules.json            # 필터 구성 규칙
│   └── scenarios.json               # 오염 시나리오 5종
├── model_design.md                  # 추천 모델 상세 설계
├── project_spec.md                  # 프로젝트 스펙
├── db_construction_methodology.md   # 데이터 수집·정제 방법론
└── dev_request.md                   # 이 문서
```

구현 후 구조 (목표):
```
프로젝트 루트/
├── db/                              # 그대로 유지
├── backend/                         # FastAPI 백엔드
│   ├── main.py
│   ├── models/
│   ├── routers/
│   ├── engine/                      # 추천 모델 엔진
│   └── tests/
├── frontend/                        # Next.js 프론트엔드
│   ├── app/
│   ├── components/
│   └── lib/
└── docs/                            # 기존 md 파일들
    ├── model_design.md
    ├── project_spec.md
    └── db_construction_methodology.md
```

---

## 1. 백엔드 구현 요구사항

### 1.1 기술 스택

```
Python 3.12+
FastAPI (최신 안정 버전)
Pydantic v2
uvicorn (개발) / gunicorn + uvicorn worker (운영)
pytest (테스트)
ruff (린터)
uv (패키지 매니저)
```

### 1.2 프로젝트 초기화

```bash
# 프로젝트 초기화
uv init backend
cd backend
uv add fastapi uvicorn pydantic

# 개발 의존성
uv add --dev pytest pytest-asyncio httpx ruff
```

`pyproject.toml` 필수 설정:
```toml
[project]
name = "filter-recommendation-api"
version = "1.0.0"
requires-python = ">=3.12"

[tool.ruff]
line-length = 100
```

### 1.3 데이터 모델 (Pydantic)

`backend/models/input.py`:
```python
from pydantic import BaseModel, field_validator
from enum import Enum
from typing import Optional

class Scenario(str, Enum):
    industrial  = "industrial"
    mining      = "mining"
    agricultural = "agricultural"
    groundwater = "groundwater"
    urban       = "urban"

class MetalId(str, Enum):
    Pb  = "Pb2+"
    Cu  = "Cu2+"
    Cd  = "Cd2+"
    Cr3 = "Cr3+"
    Cr6 = "Cr6+"
    Hg  = "Hg2+"
    As3 = "As3+"
    As5 = "As5+"
    Zn  = "Zn2+"
    Ni  = "Ni2+"

class Level(str, Enum):
    low    = "low"
    medium = "medium"
    high   = "high"

class PHRange(str, Enum):
    acidic  = "acidic"
    neutral = "neutral"
    alkaline = "alkaline"

class FilterInput(BaseModel):
    scenario  : Scenario
    metals    : list[MetalId]
    level     : Level
    pH_range  : PHRange

    @field_validator("metals")
    @classmethod
    def metals_not_empty(cls, v):
        if not v:
            raise ValueError("중금속을 1개 이상 선택해야 합니다.")
        return v
```

`backend/models/output.py`:
```python
from pydantic import BaseModel
from typing import Optional

class ThicknessRange(BaseModel):
    min_cm       : int
    max_cm       : int
    recommended_cm : int

class FilterLayer(BaseModel):
    slot          : int
    material_id   : str
    name_kr       : str
    name_en       : str
    role          : str
    is_mandatory  : bool
    trigger       : Optional[str]          # 조건부 레이어만
    mechanism     : str
    reaction_eq   : str
    thickness     : ThicknessRange
    target_metals : list[str]
    mechanism_detail : str                 # 상세 설명 (2–3문장)
    optimal_pH    : str
    qmax_summary  : str                    # "Pb²⁺: 815 mg/g" 형식
    regeneration  : str
    supporting_record_ids : list[str]      # adsorption_data.json 레코드 ID
    reference     : str                    # 참고문헌 요약

class Warning(BaseModel):
    severity : str   # "info" | "caution" | "danger"
    code     : str
    message  : str
    action   : str

class RemovalEstimate(BaseModel):
    metal           : str
    estimated_pct   : float                # 소수점 1자리
    confidence      : str   # "high" | "medium" | "low"
    confidence_note : str                  # 신뢰도 낮은 이유 설명
    limiting_layer  : str                  # 병목 레이어 ID
    correction_applied : str               # "batch→column ×0.40, 경쟁흡착 페널티" 등

class DesignParams(BaseModel):
    total_thickness_min_cm : int
    total_thickness_max_cm : int
    layer_count            : int
    HLR_m_h               : float
    EBCT_min              : float

class ConfidenceReport(BaseModel):
    score : float   # 0.0–1.0
    level : str     # "high" | "medium" | "low"
    note  : str     # 신뢰도 낮은 항목 설명

class FilterRecommendation(BaseModel):
    filter_stack  : list[FilterLayer]
    warnings      : list[Warning]
    metal_removal : dict[str, RemovalEstimate]
    design_params : DesignParams
    confidence    : ConfidenceReport
    db_version    : str
    model_version : str
    disclaimer    : str   # 면책 문구 (항상 포함)
```

### 1.4 데이터 로더 구현

`backend/engine/data_loader.py`:

서버 시작 시 모든 DB 파일을 메모리에 로드한다.
파일 경로는 환경 변수 `DB_PATH`로 설정 (기본값: `../db`).

```python
import json
from pathlib import Path
from functools import lru_cache

@lru_cache(maxsize=1)
def load_db() -> dict:
    db_path = Path(os.getenv("DB_PATH", "../db"))
    return {
        "materials":       json.loads((db_path / "materials.json").read_text()),
        "heavy_metals":    json.loads((db_path / "heavy_metals.json").read_text()),
        "adsorption_data": json.loads((db_path / "adsorption_data.json").read_text()),
        "filter_rules":    json.loads((db_path / "filter_rules.json").read_text()),
        "scenarios":       json.loads((db_path / "scenarios.json").read_text()),
    }
```

**요구사항**:
- 서버 시작 시 DB 로드 실패하면 즉시 종료 (불완전한 상태 운영 방지)
- DB 버전 정보를 `/api/db/version`에서 반환
- DB 파일 수정 없이 서버 재시작으로 갱신 가능해야 함

### 1.5 추천 엔진 구현 (핵심)

`backend/engine/recommender.py`에 3개 Phase를 구현한다.
**`model_design.md`의 알고리즘을 정확하게 구현할 것.**

---

#### Phase 1: 전처리

```python
CATION_METALS = {"Pb2+", "Cu2+", "Cd2+", "Cr3+", "Hg2+", "Zn2+", "Ni2+"}
ANION_METALS  = {"Cr6+", "As3+", "As5+"}

def preprocess(inp: FilterInput) -> dict:
    metals_set = set(inp.metals)
    return {
        "cations": metals_set & CATION_METALS,
        "anions":  metals_set & ANION_METALS,
        "level":   inp.level,
        "pH_range": inp.pH_range,
        "scenario": inp.scenario,
        "all_metals": metals_set,
    }
```

---

#### Phase 2: 규칙 엔진

슬롯 템플릿 9개를 정의하고 아래 규칙을 **이 순서대로** 적용한다.

```python
def build_slot_template() -> list[dict]:
    """9개 슬롯의 초기 상태 반환. is_active=False인 슬롯은 조건부."""
    return [
        {"slot": 1, "material_id": "calcium_carbonate", "is_active": False, "is_mandatory": False, "trigger": None},
        {"slot": 2, "material_id": "mno2",              "is_active": False, "is_mandatory": False, "trigger": None},
        {"slot": 3, "material_id": "sand",              "is_active": True,  "is_mandatory": True,  "trigger": None},
        {"slot": 4, "material_id": "iron_oxide",        "is_active": False, "is_mandatory": False, "trigger": None},
        {"slot": 5, "material_id": "zeolite_natural",   "is_active": True,  "is_mandatory": True,  "trigger": None},
        {"slot": 6, "material_id": "activated_carbon",  "is_active": True,  "is_mandatory": True,  "trigger": None},
        {"slot": 7, "material_id": "chitosan",          "is_active": False, "is_mandatory": False, "trigger": None},
        {"slot": 8, "material_id": "biochar_modified",  "is_active": False, "is_mandatory": False, "trigger": None},
        {"slot": 9, "material_id": "gravel",            "is_active": True,  "is_mandatory": True,  "trigger": None},
    ]

def apply_pH_rules(template, pH_range) -> tuple[list, list]:
    """pH 규칙 적용. (template, warnings) 반환."""
    warnings = []
    if pH_range == "acidic":
        template[0]["is_active"] = True
        template[0]["trigger"] = "유입 pH < 5 (산성)"
    elif pH_range == "alkaline":
        warnings.append({
            "severity": "caution",
            "code": "ALKALINE_PRECIPITATION",
            "message": (
                "pH 8 이상에서는 Fe, Mn, Al 등이 M(OH)ₙ 형태로 침전되어 "
                "흡착 필터를 급격히 막을 수 있습니다."
            ),
            "action": (
                "응집–침전 전처리 공정 적용 강력 권장. "
                "필터 교체 주기를 일반 조건 대비 30–50% 단축 운영."
            ),
        })
    return template, warnings

def apply_level_rules(template, level) -> list:
    if level in ("medium", "high"):
        template[6]["is_active"] = True     # slot 7: chitosan
        template[6]["trigger"] = "오염도 = 보통 또는 높음"
    if level == "high":
        template[7]["is_active"] = True     # slot 8: biochar_modified
        template[7]["trigger"] = "오염도 = 높음"
    return template

def apply_metal_rules(template, classified, warnings) -> tuple[list, list]:
    if classified["anions"]:
        template[3]["is_active"] = True     # slot 4: iron_oxide
        anion_list = ", ".join(sorted(classified["anions"]))
        template[3]["trigger"] = f"{anion_list} 음이온 제거"

    if "As3+" in classified["anions"]:
        template[1]["is_active"] = True     # slot 2: mno2
        template[1]["trigger"] = "As(III) → As(V) 산화 전처리"
        warnings.append({
            "severity": "caution",
            "code": "AS3_OXIDATION_REQUIRED",
            "message": "As(III) 존재 확인 — MnO₂ 산화층이 철산화물층 전에 필수 배치됩니다.",
            "action": "As(III)와 As(V) 구분 분석 후 현장 적용 권장.",
        })

    if "Hg2+" in classified["cations"]:
        warnings.append({
            "severity": "info",
            "code": "HG_ENHANCED_AC",
            "message": "수은(Hg) 존재 시 황 함침(S-impregnated) 활성탄이 표준 GAC 대비 효율 2–3배 향상됩니다.",
            "action": "활성탄층에 S-impregnated GAC 사용 검토.",
        })

    if classified["anions"] and classified["cations"]:
        if "Cr6+" in classified["anions"]:
            warnings.append({
                "severity": "caution",
                "code": "CR6_PH_CONFLICT",
                "message": "Cr(VI) 음이온 제거 최적 pH(3–5)와 양이온 흡착 최적 pH(5–8)가 충돌합니다.",
                "action": "Cr(VI) 전처리 환원(Fe²⁺/SO₂) 후 중화하여 단계별 처리를 검토하세요.",
            })

    return template, warnings

def run_rule_engine(inp: FilterInput, classified: dict) -> tuple[list, list]:
    """Phase 2 전체 실행. (active_layers, warnings) 반환."""
    template = build_slot_template()
    template, warnings = apply_pH_rules(template, inp.pH_range)
    template = apply_level_rules(template, inp.level)
    template, warnings = apply_metal_rules(template, classified, warnings)
    active = [s for s in template if s["is_active"]]
    return active, warnings
```

---

#### Phase 3: 스코어링

**설명 가능성 핵심 요구사항**: 각 계산 단계의 보정 계수와 근거를 기록한다.

```python
COLUMN_FACTOR = 0.40  # 배치→컬럼 보정 (model_design.md 섹션 5.4)

def get_ph_factor(material_pH_min: float, material_pH_max: float, pH_range: str) -> float:
    """pH 범위 호환 계수. 완전 일치=1.0, 부분=0.6, 불일치=0.2"""
    ph_map = {"acidic": 4.0, "neutral": 6.0, "alkaline": 9.0}
    input_ph = ph_map[pH_range]
    if material_pH_min <= input_ph <= material_pH_max:
        return 1.0
    elif (abs(input_ph - material_pH_min) <= 1.0 or
          abs(input_ph - material_pH_max) <= 1.0):
        return 0.6
    return 0.2

def get_competition_factor(n_metals: int) -> float:
    """경쟁 흡착 페널티. n_metals=1 → 1.0, n=3 → 0.77"""
    return 1.0 / (1.0 + 0.1 * n_metals)

def lookup_removal(material_id: str, metal_id: str, db: dict) -> dict | None:
    """adsorption_data에서 최고 품질 레코드 조회."""
    quality_order = {"high": 0, "medium": 1, "low": 2, "estimated": 3}
    records = [
        r for r in db["adsorption_data"]["records"]
        if r["material_id"] == material_id and r["metal_id"] == metal_id
    ]
    if not records:
        return None
    return min(records, key=lambda r: quality_order.get(r["data_quality"], 99))

def estimate_removal_per_layer(
    material_id: str,
    metal_id: str,
    pH_range: str,
    db: dict,
    material_info: dict,
) -> dict | None:
    """레이어 하나의 단일 금속 제거율 추정. None=데이터 없음."""
    record = lookup_removal(material_id, metal_id, db)
    if not record or record.get("removal_pct") is None:
        return None

    ph_min = record.get("pH_min", 4.0)
    ph_max = record.get("pH_max", 9.0)
    try:
        ph_min = float(ph_min)
        ph_max = float(ph_max)
    except (TypeError, ValueError):
        ph_min, ph_max = 4.0, 9.0

    base      = record["removal_pct"] / 100.0
    col_f     = 1.0 if record.get("conditions") == "column" else COLUMN_FACTOR
    ph_f      = get_ph_factor(ph_min, ph_max, pH_range)
    adjusted  = base * col_f * ph_f

    return {
        "adjusted": adjusted,
        "record_id": record["id"],
        "data_quality": record["data_quality"],
        "conditions": record.get("conditions", "batch"),
        "col_factor_applied": col_f,
        "ph_factor_applied": ph_f,
    }

def compute_cumulative_removal(
    active_layers: list[dict],
    metals: set[str],
    pH_range: str,
    db: dict,
) -> dict:
    """
    금속별 누적 제거율 계산.
    R_total = 1 - Π(1 - R_i)
    반환: {metal_id: RemovalEstimate 딕셔너리}
    """
    n_metals = len(metals)
    comp_f   = get_competition_factor(n_metals)
    results  = {}

    for metal in metals:
        layer_contributions = []
        record_ids = []
        qualities  = []

        for layer in active_layers:
            mat_id  = layer["material_id"]
            est     = estimate_removal_per_layer(mat_id, metal, pH_range, db, {})
            if est is None:
                continue
            r_i     = est["adjusted"] * comp_f
            layer_contributions.append((mat_id, r_i))
            record_ids.append(est["record_id"])
            qualities.append(est["data_quality"])

        if not layer_contributions:
            # 데이터 없음 — 추정 불가
            results[metal] = {
                "metal": metal,
                "estimated_pct": None,
                "confidence": "low",
                "confidence_note": f"{metal}에 대한 흡착 데이터 없음. 현장 실험 필수.",
                "limiting_layer": None,
                "correction_applied": "N/A",
                "supporting_records": [],
            }
            continue

        # 누적 제거율
        survival = 1.0
        for _, r_i in layer_contributions:
            survival *= (1.0 - min(r_i, 0.999))   # 100% 방지
        R_total = (1.0 - survival) * 100.0

        # 병목 레이어 (가장 낮은 기여도)
        limiting = min(layer_contributions, key=lambda x: x[1])[0]

        # 신뢰도
        q_order  = {"high": 0, "medium": 1, "low": 2, "estimated": 3}
        worst_q  = max(qualities, key=lambda q: q_order.get(q, 99))
        conf_map = {"high": "high", "medium": "medium", "low": "low", "estimated": "low"}
        confidence = conf_map.get(worst_q, "low")

        correction_note = (
            f"배치→컬럼 보정 ×{COLUMN_FACTOR if any(l.get('conditions') != 'column' for _, _ in layer_contributions) else 1.0}, "
            f"pH 호환 계수 적용, "
            f"경쟁 흡착 페널티 ×{comp_f:.2f} (금속 {n_metals}종)"
        )

        results[metal] = {
            "metal": metal,
            "estimated_pct": round(R_total, 1),
            "confidence": confidence,
            "confidence_note": (
                "데이터 품질이 낮은 레코드 사용됨 — 현장 검증 권장."
                if worst_q in ("low", "estimated") else ""
            ),
            "limiting_layer": limiting,
            "correction_applied": correction_note,
            "supporting_records": record_ids,
        }

    return results
```

---

#### 통합 실행 함수

```python
def recommend(inp: FilterInput, db: dict) -> FilterRecommendation:
    DISCLAIMER = (
        "본 서비스의 모든 흡착 성능 추정치는 실험실 배치 조건 문헌값에 "
        "배치→컬럼 보정(×0.40)을 적용한 이론적 추정값입니다. "
        "실제 현장 성능은 이론값의 50–80% 수준으로 나타날 수 있습니다. "
        "실제 수처리 시설 설계 전 반드시 파일럿 실험 및 전문가 검토를 받으시기 바랍니다."
    )

    classified       = preprocess(inp)
    active_layers, warnings = run_rule_engine(inp, classified)
    removal_estimates = compute_cumulative_removal(
        active_layers, set(inp.metals), inp.pH_range, db
    )

    # 항상 포함하는 경고 (COLUMN_CORRECTION)
    warnings.append({
        "severity": "info",
        "code": "COLUMN_CORRECTION",
        "message": "제거율 추정치는 배치→컬럼 보정(×0.40)이 적용된 보수적 수치입니다.",
        "action": "현장 적용 전 파일럿 컬럼 실험을 통한 재검증을 권장합니다.",
    })

    # FilterLayer 조립 (materials.json에서 세부 정보 가져오기)
    filter_stack = []
    materials_map = {m["id"]: m for m in db["materials"]["materials"]}
    thickness_rules = db["filter_rules"]["layer_thickness_recommendations_cm"]

    for layer in active_layers:
        mat = materials_map[layer["material_id"]]
        t   = thickness_rules.get(layer["material_id"], {"min": 10, "max": 20, "high_load": 20})
        level = inp.level
        rec_t = t["high_load"] if level == "high" else (t["min"] + t["max"]) // 2

        # supporting_records: 이 레이어가 실제로 사용한 레코드 ID
        supporting = []
        for metal in inp.metals:
            r = lookup_removal(layer["material_id"], metal, db)
            if r:
                supporting.append(r["id"])

        filter_stack.append(FilterLayer(
            slot          = layer["slot"],
            material_id   = mat["id"],
            name_kr       = mat["name_kr"],
            name_en       = mat["name_en"],
            role          = mat["layer_function"],
            is_mandatory  = layer["is_mandatory"],
            trigger       = layer.get("trigger"),
            mechanism     = mat["adsorption_mechanisms"][0] if mat["adsorption_mechanisms"] else "",
            reaction_eq   = mat["chemical_properties"].get("key_surface_group", ""),
            thickness     = ThicknessRange(
                min_cm=t["min"], max_cm=t["max"], recommended_cm=rec_t
            ),
            target_metals = mat["target_metals"],
            mechanism_detail = mat["special_notes"],
            optimal_pH    = mat["operational_parameters"]["optimal_pH_range"]
                            if isinstance(mat["operational_parameters"]["optimal_pH_range"], str)
                            else str(mat["operational_parameters"]["optimal_pH_range"]),
            qmax_summary  = mat["operational_parameters"].get("qmax", ""),
            regeneration  = mat["operational_parameters"].get("regeneration", ""),
            supporting_record_ids = list(set(supporting)),
            reference     = ", ".join(mat.get("references", [])),
        ))

    # 신뢰도 집계
    all_confidences = [v["confidence"] for v in removal_estimates.values()]
    conf_order = {"high": 0, "medium": 1, "low": 2}
    worst_conf = max(all_confidences, key=lambda c: conf_order.get(c, 99)) if all_confidences else "low"
    conf_score = {"high": 0.85, "medium": 0.65, "low": 0.40}.get(worst_conf, 0.4)

    total_min = sum(thickness_rules.get(l["material_id"], {}).get("min", 10) for l in active_layers)
    total_max = sum(thickness_rules.get(l["material_id"], {}).get("max", 20) for l in active_layers)

    return FilterRecommendation(
        filter_stack  = filter_stack,
        warnings      = [Warning(**w) for w in warnings],
        metal_removal = {k: RemovalEstimate(**v) for k, v in removal_estimates.items()
                         if v.get("estimated_pct") is not None},
        design_params = DesignParams(
            total_thickness_min_cm = total_min,
            total_thickness_max_cm = total_max,
            layer_count            = len(active_layers),
            HLR_m_h               = 2.0,
            EBCT_min              = 18.5,
        ),
        confidence = ConfidenceReport(
            score = conf_score,
            level = worst_conf,
            note  = "신뢰도 낮은 레코드 사용됨." if worst_conf == "low" else "",
        ),
        db_version    = "1.0",
        model_version = "1.0",
        disclaimer    = DISCLAIMER,
    )
```

### 1.6 API 라우터 구현

`backend/routers/recommend.py`:

```python
from fastapi import APIRouter, HTTPException, Depends
from ..models.input import FilterInput
from ..models.output import FilterRecommendation
from ..engine.recommender import recommend
from ..engine.data_loader import load_db

router = APIRouter(prefix="/api")

@router.post("/recommend", response_model=FilterRecommendation)
async def get_recommendation(inp: FilterInput):
    try:
        db = load_db()
        return recommend(inp, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"추천 생성 실패: {str(e)}")

@router.get("/materials")
async def get_materials():
    db = load_db()
    return db["materials"]["materials"]

@router.get("/materials/{material_id}")
async def get_material(material_id: str):
    db = load_db()
    materials = {m["id"]: m for m in db["materials"]["materials"]}
    if material_id not in materials:
        raise HTTPException(status_code=404, detail="소재를 찾을 수 없습니다.")
    return materials[material_id]

@router.get("/metals")
async def get_metals():
    db = load_db()
    return db["heavy_metals"]["heavy_metals"]

@router.get("/scenarios")
async def get_scenarios():
    db = load_db()
    return db["scenarios"]["scenarios"]

@router.get("/db/version")
async def get_db_version():
    return {"db_version": "1.0", "model_version": "1.0", "last_updated": "2026-06"}

@router.get("/health")
async def health():
    return {"status": "ok"}
```

`backend/main.py`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers.recommend import router
import os

app = FastAPI(
    title="중금속 흡착 필터 추천 API",
    version="1.0.0",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(router)

@app.on_event("startup")
async def startup():
    from .engine.data_loader import load_db
    try:
        load_db()
        print("✅ DB 로드 완료")
    except Exception as e:
        print(f"❌ DB 로드 실패: {e}")
        raise SystemExit(1)
```

### 1.7 테스트 구현

`backend/tests/test_engine.py`:

아래 20개 케이스를 **모두 통과**해야 한다.

```python
import pytest
from ..models.input import FilterInput, Scenario, MetalId, Level, PHRange
from ..engine.recommender import recommend
from ..engine.data_loader import load_db

@pytest.fixture
def db():
    return load_db()

def make_input(**kwargs):
    defaults = dict(
        scenario=Scenario.industrial,
        metals=[MetalId.Pb],
        level=Level.low,
        pH_range=PHRange.neutral,
    )
    defaults.update(kwargs)
    return FilterInput(**defaults)

# ── 오염도 규칙 ──────────────────────────────────────────
def test_level_low_no_chitosan_no_biochar(db):
    result = recommend(make_input(level=Level.low), db)
    ids = [l.material_id for l in result.filter_stack]
    assert "chitosan" not in ids
    assert "biochar_modified" not in ids

def test_level_medium_has_chitosan_no_biochar(db):
    result = recommend(make_input(level=Level.medium), db)
    ids = [l.material_id for l in result.filter_stack]
    assert "chitosan" in ids
    assert "biochar_modified" not in ids

def test_level_high_has_chitosan_and_biochar(db):
    result = recommend(make_input(level=Level.high), db)
    ids = [l.material_id for l in result.filter_stack]
    assert "chitosan" in ids
    assert "biochar_modified" in ids

# ── pH 규칙 ──────────────────────────────────────────────
def test_pH_acidic_adds_calcium_carbonate_first(db):
    result = recommend(make_input(pH_range=PHRange.acidic), db)
    assert result.filter_stack[0].material_id == "calcium_carbonate"

def test_pH_neutral_no_calcium_carbonate(db):
    result = recommend(make_input(pH_range=PHRange.neutral), db)
    ids = [l.material_id for l in result.filter_stack]
    assert "calcium_carbonate" not in ids

def test_pH_alkaline_has_warning(db):
    result = recommend(make_input(pH_range=PHRange.alkaline), db)
    codes = [w.code for w in result.warnings]
    assert "ALKALINE_PRECIPITATION" in codes

# ── 금속 특화 규칙 ────────────────────────────────────────
def test_As5_adds_iron_oxide(db):
    result = recommend(make_input(metals=[MetalId.As5]), db)
    ids = [l.material_id for l in result.filter_stack]
    assert "iron_oxide" in ids

def test_As3_adds_mno2_and_iron_oxide(db):
    result = recommend(make_input(metals=[MetalId.As3]), db)
    ids = [l.material_id for l in result.filter_stack]
    assert "mno2" in ids
    assert "iron_oxide" in ids

def test_Cr6_adds_iron_oxide(db):
    result = recommend(make_input(metals=[MetalId.Cr6]), db)
    ids = [l.material_id for l in result.filter_stack]
    assert "iron_oxide" in ids

def test_Pb_only_no_iron_oxide(db):
    result = recommend(make_input(metals=[MetalId.Pb], level=Level.low), db)
    ids = [l.material_id for l in result.filter_stack]
    assert "iron_oxide" not in ids

# ── 필수 레이어 항상 포함 ─────────────────────────────────
def test_mandatory_layers_always_present(db):
    result = recommend(make_input(metals=[MetalId.Pb]), db)
    ids = [l.material_id for l in result.filter_stack]
    for required in ["sand", "zeolite_natural", "activated_carbon", "gravel"]:
        assert required in ids

def test_gravel_always_last(db):
    result = recommend(make_input(metals=[MetalId.Pb, MetalId.As5], level=Level.high, pH_range=PHRange.acidic), db)
    assert result.filter_stack[-1].material_id == "gravel"

def test_calcium_carbonate_always_first_when_acidic(db):
    result = recommend(make_input(metals=[MetalId.As3, MetalId.Pb], level=Level.high, pH_range=PHRange.acidic), db)
    assert result.filter_stack[0].material_id == "calcium_carbonate"

# ── 설명 가능성 ───────────────────────────────────────────
def test_each_layer_has_supporting_records_or_mandatory(db):
    result = recommend(make_input(metals=[MetalId.Pb, MetalId.Cu], level=Level.medium), db)
    for layer in result.filter_stack:
        if not layer.is_mandatory:
            # 조건부 레이어는 trigger 명시 필수
            assert layer.trigger is not None and len(layer.trigger) > 0

def test_disclaimer_always_present(db):
    result = recommend(make_input(), db)
    assert result.disclaimer is not None and len(result.disclaimer) > 50

def test_column_correction_warning_always_present(db):
    result = recommend(make_input(), db)
    codes = [w.code for w in result.warnings]
    assert "COLUMN_CORRECTION" in codes

# ── 엣지 케이스 ───────────────────────────────────────────
def test_all_metals_no_crash(db):
    all_metals = list(MetalId)
    result = recommend(make_input(metals=all_metals, level=Level.high, pH_range=PHRange.acidic), db)
    assert len(result.filter_stack) > 0

def test_single_metal_hg(db):
    result = recommend(make_input(metals=[MetalId.Hg], level=Level.medium), db)
    codes = [w.code for w in result.warnings]
    assert "HG_ENHANCED_AC" in codes

def test_Cr6_and_Pb_conflict_warning(db):
    result = recommend(make_input(metals=[MetalId.Cr6, MetalId.Pb], level=Level.high), db)
    codes = [w.code for w in result.warnings]
    assert "CR6_PH_CONFLICT" in codes

def test_removal_estimate_has_correction_note(db):
    result = recommend(make_input(metals=[MetalId.Pb, MetalId.Cu], level=Level.medium), db)
    for metal, est in result.metal_removal.items():
        assert est.correction_applied is not None and len(est.correction_applied) > 0
```

---

## 2. 프론트엔드 구현 요구사항

### 2.1 기술 스택

```
Next.js 15 (App Router)
React 19
TypeScript
Tailwind CSS v4
pnpm
```

```bash
pnpm create next-app frontend --typescript --tailwind --app
cd frontend
pnpm add lucide-react
```

### 2.2 컴포넌트 구조

```
frontend/
├── app/
│   ├── page.tsx                  # 메인 (입력 + 결과)
│   ├── materials/
│   │   ├── page.tsx              # 소재 사전
│   │   └── [id]/page.tsx        # 소재 상세
│   └── about/page.tsx           # 데이터 출처 안내
├── components/
│   ├── input/
│   │   ├── ScenarioSelector.tsx
│   │   ├── MetalSelector.tsx
│   │   ├── LevelSelector.tsx
│   │   └── PHSelector.tsx
│   ├── result/
│   │   ├── FilterDiagram.tsx    # SVG 단면도 (핵심)
│   │   ├── LayerList.tsx
│   │   ├── LayerCard.tsx
│   │   ├── LayerDetail.tsx      # 클릭 시 상세 패널
│   │   ├── WarningBanner.tsx
│   │   ├── RemovalTable.tsx     # 추정 제거율 표
│   │   ├── ConfidenceBadge.tsx
│   │   └── Disclaimer.tsx
│   └── common/
│       ├── MetalChip.tsx
│       └── QualityBadge.tsx     # data_quality 배지
└── lib/
    ├── api.ts                   # API 호출 함수
    └── types.ts                 # 타입 정의 (백엔드 모델과 동일)
```

### 2.3 핵심 컴포넌트 요구사항

#### FilterDiagram.tsx (필수 구현)

- SVG로 수직 필터 단면도 렌더링
- 각 레이어는 소재별 고유 색상으로 구분
- 레이어 클릭 시 해당 레이어 강조 + `onLayerSelect` 콜백 호출
- 유입수(위) → 처리수(아래) 방향 화살표 표시
- 조건부 레이어는 점선 테두리로 필수 레이어와 구분
- 레이어 수가 가변적 (최소 4개, 최대 9개)
- 모바일 반응형 (뷰포트 너비에 따라 SVG 스케일링)
- `role="img"`, `<title>`, `<desc>` 접근성 요소 필수

소재별 색상 팔레트 (고정값 사용):

```typescript
export const MATERIAL_COLORS: Record<string, string> = {
  calcium_carbonate : "#BBDEFB",
  mno2              : "#CE93D8",
  sand              : "#FFF176",
  iron_oxide        : "#FF8A65",
  zeolite_natural   : "#4DB6AC",
  zeolite_4a        : "#26A69A",
  activated_carbon  : "#78909C",
  chitosan          : "#F48FB1",
  biochar_modified  : "#BCAAA4",
  gravel            : "#CFD8DC",
}
```

#### LayerDetail.tsx (설명 가능성 핵심)

레이어 상세 패널에 반드시 포함할 정보:

1. **소재명** (한국어 + 영문)
2. **반응식** (monospace 폰트, 박스 강조)
3. **상세 설명** (2–3문장)
4. **세부 수치** (두께, 최적 pH, 재생 방법 — 2×2 그리드)
5. **적합 중금속** (칩 목록)
6. **데이터 근거** — `supporting_record_ids` 목록 표시
   - 각 레코드 ID 클릭 시 해당 레코드 정보 표시 (조건, 수치, 문헌)
7. **참고문헌** (클릭 시 PubMed/DOI 외부 링크)

#### RemovalTable.tsx (설명 가능성 핵심)

추정 제거율 표에 반드시 포함할 정보:

| 중금속 | 추정 제거율 | 신뢰도 | 보정 내용 | 병목 레이어 |
|--------|------------|--------|---------|-----------|
| Pb²⁺  | 94.2%      | 🟢 높음 | 배치→컬럼 ×0.40, 경쟁흡착 ×0.83 | 제올라이트 |

- 신뢰도 배지: 🟢 높음 / 🟡 보통 / 🔴 낮음
- `confidence_note` 값이 있으면 ⚠️ 아이콘과 함께 표시
- `correction_applied` 전체를 툴팁으로 제공

#### WarningBanner.tsx

severity에 따른 배너 스타일:

| severity | 배경 색상 | 아이콘 |
|---------|---------|--------|
| `info`    | 파란색 계열 | ℹ️ |
| `caution` | 주황색 계열 | ⚠️ |
| `danger`  | 빨간색 계열 | 🚨 |

- `danger` 경고는 결과 최상단에 고정
- `info` 경고는 결과 하단에 접혀 있다가 클릭 시 확장

#### Disclaimer.tsx

**모든 결과 화면 하단에 항상 표시. 숨기거나 접을 수 없음.**

```
⚠️ 추정치 신뢰성 안내
[disclaimer 필드 전체 내용]
데이터 출처: 동료심사 학술 문헌 14편 | DB 버전: 1.0 | 마지막 업데이트: 2026-06
```

### 2.4 API 연동

`frontend/lib/api.ts`:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function getRecommendation(input: FilterInput): Promise<FilterRecommendation> {
  const res = await fetch(`${API_URL}/api/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || "추천 생성에 실패했습니다.")
  }
  return res.json()
}
```

- 로딩 상태: 스켈레톤 UI (분석 버튼 클릭 후 결과 수신 전)
- 오류 상태: 오류 메시지 인라인 표시
- 타임아웃: 10초 (이후 재시도 안내)

### 2.5 소재 사전 페이지 (/materials)

- `/api/materials`에서 전체 소재 목록 조회
- 카드 그리드 (3열 desktop, 2열 tablet, 1열 mobile)
- 각 카드: 소재명, 역할, 대상 금속 칩 목록
- 필터링 탭: 전체 / 필수층 / 조건부층 / 유형

### 2.6 정보 페이지 (/about)

다음 내용 포함:
- 서비스 목적 및 한계 설명
- 데이터 수집 방법론 요약 (`db_construction_methodology.md` 내용 기반)
- 전체 참고문헌 목록 (14편)
- DB 버전 및 최종 업데이트 날짜
- "이 서비스는 연구·교육 목적입니다" 안내

---

## 3. 설명 가능성(Explainability) 구현 체크리스트

**이 체크리스트는 구현 완료 기준이다. 모든 항목을 충족해야 한다.**

### 3.1 추천 근거 추적성

- [ ] 각 FilterLayer의 `supporting_record_ids`가 실제 `adsorption_data.json` 레코드 ID를 참조함
- [ ] LayerDetail 패널에서 record ID → 레코드 세부 정보 조회 기능 구현
- [ ] 각 레코드의 data_quality가 UI에 표시됨 (high/medium/low 배지)
- [ ] 참고문헌 DOI/PMID가 외부 링크로 연결됨

### 3.2 수치 투명성

- [ ] 모든 추정 제거율에 `correction_applied` 설명이 함께 표시됨
- [ ] column_factor(0.40) 적용 사실을 항상 경고로 표시
- [ ] 경쟁 흡착 페널티 계수가 결과에 명시됨
- [ ] 신뢰도 낮은(low/estimated) 데이터 사용 시 별도 경고 표시

### 3.3 규칙 투명성

- [ ] 조건부 레이어(is_mandatory=False)의 `trigger` 조건이 UI에 표시됨
- [ ] pH=alkaline 시 경고가 결과보다 먼저 표시됨
- [ ] 경고 코드와 함께 구체적인 조치 방법이 출력됨

### 3.4 한계 고지

- [ ] Disclaimer 컴포넌트가 모든 결과 화면에 항상 표시됨 (숨기기 불가)
- [ ] confidence.level이 "low"인 경우 별도 경고 추가
- [ ] /about 페이지에 데이터 수집 방법론 요약 제공

---

## 4. 환경 설정 및 배포

### 4.1 환경 변수

**백엔드 (.env)**:
```
DB_PATH=../db
MODEL_VERSION=1.0
ALLOWED_ORIGINS=http://localhost:3000
LOG_LEVEL=INFO
```

**프론트엔드 (.env.local)**:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_DB_VERSION=1.0
```

### 4.2 로컬 개발 실행

```bash
# 백엔드
cd backend
uv run uvicorn main:app --reload --port 8000

# 프론트엔드
cd frontend
pnpm dev
```

### 4.3 Docker 컨테이너 (백엔드)

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN pip install uv && uv sync --frozen
COPY . .
EXPOSE 8000
CMD ["uv", "run", "gunicorn", "main:app",
     "-w", "4", "-k", "uvicorn.workers.UvicornWorker",
     "--bind", "0.0.0.0:8000"]
```

### 4.4 배포 플랫폼

- **프론트엔드**: Vercel (Next.js 공식 지원, 자동 배포)
- **백엔드**: Render 또는 Railway (Docker 컨테이너 배포)
- `db/` 폴더를 백엔드 컨테이너에 포함하여 배포

---

## 5. 구현 순서 (권장)

```
Step 1: 백엔드 데이터 로더 구현 및 단위 테스트 통과
Step 2: 추천 엔진 Phase 1 (전처리) 구현 및 테스트
Step 3: 추천 엔진 Phase 2 (규칙 엔진) 구현 및 테스트
        → 특히 오염도·pH 규칙 테스트 케이스 전부 통과
Step 4: 추천 엔진 Phase 3 (스코어링) 구현 및 테스트
Step 5: FastAPI 라우터 완성 + /docs 확인
Step 6: 프론트엔드 입력 폼 컴포넌트 구현
Step 7: API 연동 및 타입 정의
Step 8: FilterDiagram (SVG) 컴포넌트 구현
Step 9: LayerDetail + 설명 가능성 체크리스트 구현
Step 10: 경고 배너 + Disclaimer 컴포넌트
Step 11: 소재 사전 페이지
Step 12: /about 페이지
Step 13: 전체 통합 테스트 20개 케이스 통과 확인
Step 14: 배포 설정
```

---

## 6. 금지 사항

다음 행위는 이 프로젝트에서 **절대 금지**한다.

1. 추천 결과를 하드코딩하거나 임의로 생성하는 것
2. adsorption_data.json 데이터를 거치지 않고 제거율 수치를 출력하는 것
3. column_factor, competition_factor 보정 없이 qmax를 제거율로 직접 사용하는 것
4. Disclaimer 컴포넌트를 숨기거나 접거나 제거하는 것
5. data_quality = "estimated"인 레코드를 신뢰도 높음으로 표시하는 것
6. db/ 폴더 내 JSON 파일의 구조를 무단으로 변경하는 것
7. 결과 화면에서 supporting_record_ids를 비워두는 것 (데이터 없음 시 "없음" 명시)

---

## 7. 최종 검수 기준

배포 전 아래 기준을 모두 충족해야 한다.

| 기준 | 방법 |
|------|------|
| 백엔드 단위 테스트 20개 전부 통과 | `pytest` |
| 오염도 규칙 3가지 모두 정확 작동 | 테스트 케이스 확인 |
| pH 규칙 3가지 모두 정확 작동 | 테스트 케이스 확인 |
| Disclaimer 모든 화면에 표시 | 수동 확인 |
| 신뢰도 배지 정상 표시 | 수동 확인 |
| supporting_record_ids가 실제 레코드 ID와 일치 | DB 교차 확인 |
| 모바일(360px) 레이아웃 정상 | 브라우저 개발자 도구 |
| SVG 접근성 요소 포함 | HTML 검사 |
| /about 페이지 참고문헌 14편 표시 | 수동 확인 |
| API 응답 시간 < 1초 | curl 측정 |
