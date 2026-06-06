"""추천 엔진 — model_design.md 의 3단계 파이프라인 구현.

Phase 1 전처리 → Phase 2 규칙 엔진 → Phase 3 스코어링.
모든 성능 수치는 adsorption_data.json 레코드에서 계산되며,
보정 계수와 근거(레코드 ID)를 함께 기록해 설명 가능성을 보장한다.
"""

from .data_loader import get_db_version
from ..models.input import FilterInput
from ..models.output import (
    ConfidenceReport,
    DesignParams,
    FilterLayer,
    FilterRecommendation,
    RemovalEstimate,
    ThicknessRange,
    Warning,
)

# ── 상수 ──────────────────────────────────────────────────────────────
CATION_METALS = {"Pb2+", "Cu2+", "Cd2+", "Cr3+", "Hg2+", "Zn2+", "Ni2+"}
ANION_METALS = {"Cr6+", "As3+", "As5+"}

COLUMN_FACTOR = 0.40  # 배치→컬럼 보정 (model_design.md 섹션 3-2 / 5.4)

DISCLAIMER = (
    "본 서비스의 모든 흡착 성능 추정치는 실험실 배치 조건 문헌값에 "
    "배치→컬럼 보정(×0.40)을 적용한 이론적 추정값입니다. "
    "실제 현장 성능은 이론값의 50–80% 수준으로 나타날 수 있습니다. "
    "실제 수처리 시설 설계 전 반드시 파일럿 실험 및 전문가 검토를 받으시기 바랍니다."
)

_SUPERSCRIPT = {"2+": "²⁺", "3+": "³⁺", "5+": "⁵⁺", "6+": "⁶⁺"}


def _metal_display(metal_id: str) -> str:
    """'Pb2+' -> 'Pb²⁺'."""
    for suffix, sup in _SUPERSCRIPT.items():
        if metal_id.endswith(suffix):
            return metal_id[: -len(suffix)] + sup
    return metal_id


# ── Phase 1: 전처리 ───────────────────────────────────────────────────
def preprocess(inp: FilterInput) -> dict:
    metals_set = {m.value for m in inp.metals}
    return {
        "cations": metals_set & CATION_METALS,
        "anions": metals_set & ANION_METALS,
        "level": inp.level.value,
        "pH_range": inp.pH_range.value,
        "scenario": inp.scenario.value,
        "all_metals": metals_set,
    }


# ── Phase 2: 규칙 엔진 ────────────────────────────────────────────────
def build_slot_template() -> list[dict]:
    """9개 슬롯의 초기 상태. is_active=False 슬롯은 조건부."""
    return [
        {"slot": 1, "material_id": "calcium_carbonate", "is_active": False, "is_mandatory": False, "trigger": None},
        {"slot": 2, "material_id": "mno2", "is_active": False, "is_mandatory": False, "trigger": None},
        {"slot": 3, "material_id": "sand", "is_active": True, "is_mandatory": True, "trigger": None},
        {"slot": 4, "material_id": "iron_oxide", "is_active": False, "is_mandatory": False, "trigger": None},
        {"slot": 5, "material_id": "zeolite_natural", "is_active": True, "is_mandatory": True, "trigger": None},
        {"slot": 6, "material_id": "activated_carbon", "is_active": True, "is_mandatory": True, "trigger": None},
        {"slot": 7, "material_id": "chitosan", "is_active": False, "is_mandatory": False, "trigger": None},
        {"slot": 8, "material_id": "biochar_modified", "is_active": False, "is_mandatory": False, "trigger": None},
        {"slot": 9, "material_id": "gravel", "is_active": True, "is_mandatory": True, "trigger": None},
    ]


def apply_pH_rules(template: list[dict], pH_range: str) -> tuple[list[dict], list[dict]]:
    """pH 규칙 적용. (template, warnings) 반환."""
    warnings: list[dict] = []
    if pH_range == "acidic":
        template[0]["is_active"] = True
        template[0]["trigger"] = "유입 pH < 5 (산성)"
    elif pH_range == "alkaline":
        warnings.append(
            {
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
            }
        )
    return template, warnings


def apply_level_rules(template: list[dict], level: str) -> list[dict]:
    if level in ("medium", "high"):
        template[6]["is_active"] = True  # slot 7: chitosan
        template[6]["trigger"] = "오염도 = 보통 또는 높음"
    if level == "high":
        template[7]["is_active"] = True  # slot 8: biochar_modified
        template[7]["trigger"] = "오염도 = 높음"
    return template


def apply_metal_rules(
    template: list[dict], classified: dict, warnings: list[dict]
) -> tuple[list[dict], list[dict]]:
    if classified["anions"]:
        template[3]["is_active"] = True  # slot 4: iron_oxide
        anion_list = ", ".join(sorted(classified["anions"]))
        template[3]["trigger"] = f"{anion_list} 음이온 제거"

    if "As3+" in classified["anions"]:
        template[1]["is_active"] = True  # slot 2: mno2
        template[1]["trigger"] = "As(III) → As(V) 산화 전처리"
        warnings.append(
            {
                "severity": "caution",
                "code": "AS3_OXIDATION_REQUIRED",
                "message": "As(III) 존재 확인 — MnO₂ 산화층이 철산화물층 전에 필수 배치됩니다.",
                "action": "As(III)와 As(V) 구분 분석 후 현장 적용 권장.",
            }
        )

    if "Hg2+" in classified["cations"]:
        warnings.append(
            {
                "severity": "info",
                "code": "HG_ENHANCED_AC",
                "message": (
                    "수은(Hg) 존재 시 황 함침(S-impregnated) 활성탄이 표준 GAC 대비 "
                    "효율 2–3배 향상됩니다."
                ),
                "action": "활성탄층에 S-impregnated GAC 사용 검토.",
            }
        )

    if classified["anions"] and classified["cations"]:
        if "Cr6+" in classified["anions"]:
            warnings.append(
                {
                    "severity": "caution",
                    "code": "CR6_PH_CONFLICT",
                    "message": (
                        "Cr(VI) 음이온 제거 최적 pH(3–5)와 양이온 흡착 최적 pH(5–8)가 충돌합니다."
                    ),
                    "action": "Cr(VI) 전처리 환원(Fe²⁺/SO₂) 후 중화하여 단계별 처리를 검토하세요.",
                }
            )

    return template, warnings


def run_rule_engine(inp: FilterInput, classified: dict) -> tuple[list[dict], list[dict]]:
    """Phase 2 전체 실행. (active_layers, warnings) 반환."""
    template = build_slot_template()
    template, warnings = apply_pH_rules(template, inp.pH_range.value)
    template = apply_level_rules(template, inp.level.value)
    template, warnings = apply_metal_rules(template, classified, warnings)
    active = [s for s in template if s["is_active"]]  # 슬롯 순서 보존
    return active, warnings


# ── Phase 3: 스코어링 ─────────────────────────────────────────────────
def get_ph_factor(material_pH_min: float, material_pH_max: float, pH_range: str) -> float:
    """pH 범위 호환 계수. 완전 일치=1.0, 부분=0.6, 불일치=0.2."""
    ph_map = {"acidic": 4.0, "neutral": 6.0, "alkaline": 9.0}
    input_ph = ph_map[pH_range]
    if material_pH_min <= input_ph <= material_pH_max:
        return 1.0
    if abs(input_ph - material_pH_min) <= 1.0 or abs(input_ph - material_pH_max) <= 1.0:
        return 0.6
    return 0.2


def get_competition_factor(n_metals: int) -> float:
    """경쟁 흡착 페널티. n_metals=1 → 1.0, n=3 → 0.77."""
    return 1.0 / (1.0 + 0.1 * n_metals)


def lookup_removal(material_id: str, metal_id: str, db: dict) -> dict | None:
    """adsorption_data 에서 최고 품질 레코드 조회."""
    quality_order = {"high": 0, "medium": 1, "low": 2, "estimated": 3}
    records = [
        r
        for r in db["adsorption_data"]["records"]
        if r["material_id"] == material_id and r["metal_id"] == metal_id
    ]
    if not records:
        return None
    return min(records, key=lambda r: quality_order.get(r["data_quality"], 99))


def _coerce_ph(value, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def estimate_removal_per_layer(
    material_id: str, metal_id: str, pH_range: str, db: dict
) -> dict | None:
    """레이어 하나의 단일 금속 제거율 추정. None = 데이터 없음."""
    record = lookup_removal(material_id, metal_id, db)
    if not record or record.get("removal_pct") is None:
        return None

    ph_min = _coerce_ph(record.get("pH_min", 4.0), 4.0)
    ph_max = _coerce_ph(record.get("pH_max", 9.0), 9.0)

    base = record["removal_pct"] / 100.0
    col_f = 1.0 if record.get("conditions") == "column" else COLUMN_FACTOR
    ph_f = get_ph_factor(ph_min, ph_max, pH_range)
    adjusted = base * col_f * ph_f

    return {
        "adjusted": adjusted,
        "record_id": record["id"],
        "data_quality": record["data_quality"],
        "conditions": record.get("conditions", "batch"),
        "col_factor_applied": col_f,
        "ph_factor_applied": ph_f,
    }


def compute_cumulative_removal(
    active_layers: list[dict], metals: set[str], pH_range: str, db: dict
) -> dict:
    """금속별 누적 제거율 계산.  R_total = 1 - Π(1 - R_i)."""
    n_metals = len(metals)
    comp_f = get_competition_factor(n_metals)
    results: dict = {}

    for metal in metals:
        layer_contributions: list[tuple[str, float]] = []
        record_ids: list[str] = []
        qualities: list[str] = []
        conditions_used: list[str] = []

        for layer in active_layers:
            mat_id = layer["material_id"]
            est = estimate_removal_per_layer(mat_id, metal, pH_range, db)
            if est is None:
                continue
            r_i = est["adjusted"] * comp_f
            layer_contributions.append((mat_id, r_i))
            record_ids.append(est["record_id"])
            qualities.append(est["data_quality"])
            conditions_used.append(est["conditions"])

        if not layer_contributions:
            results[metal] = {
                "metal": metal,
                "estimated_pct": None,
                "confidence": "low",
                "confidence_note": f"{metal}에 대한 흡착 데이터 없음. 현장 실험 필수.",
                "limiting_layer": None,
                "correction_applied": "N/A (데이터 없음)",
                "supporting_records": [],
            }
            continue

        # 누적 제거율
        survival = 1.0
        for _, r_i in layer_contributions:
            survival *= 1.0 - min(r_i, 0.999)  # 100% 방지
        r_total = (1.0 - survival) * 100.0

        # 병목 레이어 (가장 낮은 기여도)
        limiting = min(layer_contributions, key=lambda x: x[1])[0]

        # 신뢰도 (사용된 레코드 중 최저 품질 기준)
        q_order = {"high": 0, "medium": 1, "low": 2, "estimated": 3}
        worst_q = max(qualities, key=lambda q: q_order.get(q, 99))
        conf_map = {"high": "high", "medium": "medium", "low": "low", "estimated": "low"}
        confidence = conf_map.get(worst_q, "low")

        used_batch = any(c != "column" for c in conditions_used)
        col_note = f"×{COLUMN_FACTOR}" if used_batch else "×1.0 (컬럼 데이터)"
        correction_note = (
            f"배치→컬럼 보정 {col_note}, "
            f"pH 호환 계수 적용, "
            f"경쟁 흡착 페널티 ×{comp_f:.2f} (금속 {n_metals}종)"
        )

        results[metal] = {
            "metal": metal,
            "estimated_pct": round(r_total, 1),
            "confidence": confidence,
            "confidence_note": (
                "데이터 품질이 낮은 레코드 사용됨 — 현장 검증 권장."
                if worst_q in ("low", "estimated")
                else ""
            ),
            "limiting_layer": limiting,
            "correction_applied": correction_note,
            "supporting_records": record_ids,
        }

    return results


# ── 보조: 소재 메타데이터에서 표시용 필드 구성 ─────────────────────────
def _build_reaction_eq(mat: dict) -> str:
    """대표 반응식 추출 — 화살표(→)를 포함한 첫 메커니즘, 없으면 표면기."""
    for mech in mat.get("adsorption_mechanisms", []):
        if "→" in mech or "⇌" in mech:
            return mech
    return mat.get("chemical_properties", {}).get("key_surface_group", "")


def _build_qmax_summary(material_id: str, metals: list[str], db: dict) -> str:
    """선택 금속에 대한 최고 품질 레코드의 qmax 요약. 예: 'Pb²⁺: 815 mg/g'."""
    parts: list[str] = []
    for metal in metals:
        rec = lookup_removal(material_id, metal, db)
        if not rec:
            continue
        qmax = rec.get("qmax_mg_g")
        if qmax is None:
            qmax = rec.get("qmax_column_mg_g")
            suffix = " mg/g (컬럼)"
        else:
            suffix = " mg/g"
        if qmax is not None:
            parts.append(f"{_metal_display(metal)}: {qmax}{suffix}")
    return " · ".join(parts)


def _optimal_ph_str(mat: dict) -> str:
    raw = mat["operational_parameters"]["optimal_pH_range"]
    if isinstance(raw, str):
        return raw
    if isinstance(raw, dict):
        return "; ".join(f"{k}: {v}" for k, v in raw.items())
    return str(raw)


# ── 통합 실행 함수 ────────────────────────────────────────────────────
def recommend(inp: FilterInput, db: dict) -> FilterRecommendation:
    classified = preprocess(inp)
    active_layers, warnings = run_rule_engine(inp, classified)

    # 충돌 해결(model_design.md §4.4): 고농도 + 염기성 → danger
    if inp.level.value == "high" and inp.pH_range.value == "alkaline":
        warnings.append(
            {
                "severity": "danger",
                "code": "HIGH_ALKALINE_LOAD",
                "message": (
                    "고농도 염기성 조건 — 흡착 필터보다 화학적 침전(응집–침전) 공정이 "
                    "우선적으로 권장됩니다."
                ),
                "action": "필터 전단에 응집–침전조를 배치하고, 필터는 후처리 용도로 운영하세요.",
            }
        )

    metals_list = [m.value for m in inp.metals]
    removal_estimates = compute_cumulative_removal(
        active_layers, set(metals_list), inp.pH_range.value, db
    )

    # 항상 포함하는 경고 (COLUMN_CORRECTION)
    warnings.append(
        {
            "severity": "info",
            "code": "COLUMN_CORRECTION",
            "message": "제거율 추정치는 배치→컬럼 보정(×0.40)이 적용된 보수적 수치입니다.",
            "action": "현장 적용 전 파일럿 컬럼 실험을 통한 재검증을 권장합니다.",
        }
    )

    # 복수 금속 공존 경고
    if len(metals_list) > 1:
        warnings.append(
            {
                "severity": "info",
                "code": "COMPETITIVE_PENALTY",
                "message": (
                    f"중금속 {len(metals_list)}종 공존 — 경쟁 흡착으로 개별 제거율이 "
                    f"감소할 수 있습니다 (페널티 ×{get_competition_factor(len(metals_list)):.2f})."
                ),
                "action": "다중 금속 공존 조건의 파일럿 실험을 권장합니다.",
            }
        )

    # FilterLayer 조립 (materials.json 에서 세부 정보 가져오기)
    filter_stack: list[FilterLayer] = []
    materials_map = {m["id"]: m for m in db["materials"]["materials"]}
    thickness_rules = db["filter_rules"]["layer_thickness_recommendations_cm"]
    level = inp.level.value

    for layer in active_layers:
        mat = materials_map[layer["material_id"]]
        t = thickness_rules.get(layer["material_id"], {"min": 10, "max": 20, "high_load": 20})
        rec_t = t["high_load"] if level == "high" else (t["min"] + t["max"]) // 2

        # supporting_records: 이 레이어가 선택 금속에 대해 실제 참조한 레코드 ID
        supporting: list[str] = []
        for metal in metals_list:
            r = lookup_removal(layer["material_id"], metal, db)
            if r:
                supporting.append(r["id"])

        filter_stack.append(
            FilterLayer(
                slot=layer["slot"],
                material_id=mat["id"],
                name_kr=mat["name_kr"],
                name_en=mat["name_en"],
                role=mat["layer_function"],
                is_mandatory=layer["is_mandatory"],
                trigger=layer.get("trigger"),
                mechanism=(
                    mat["adsorption_mechanisms"][0] if mat["adsorption_mechanisms"] else "물리적 여과/지지"
                ),
                reaction_eq=_build_reaction_eq(mat),
                thickness=ThicknessRange(min_cm=t["min"], max_cm=t["max"], recommended_cm=rec_t),
                target_metals=mat["target_metals"],
                mechanism_detail=mat["special_notes"],
                optimal_pH=_optimal_ph_str(mat),
                qmax_summary=_build_qmax_summary(layer["material_id"], metals_list, db),
                regeneration=mat["operational_parameters"].get("regeneration", ""),
                supporting_record_ids=sorted(set(supporting)),
                reference=", ".join(mat.get("references", [])),
            )
        )

    # 신뢰도 집계
    all_confidences = [v["confidence"] for v in removal_estimates.values()]
    conf_order = {"high": 0, "medium": 1, "low": 2}
    worst_conf = (
        max(all_confidences, key=lambda c: conf_order.get(c, 99)) if all_confidences else "low"
    )
    conf_score = {"high": 0.85, "medium": 0.65, "low": 0.40}.get(worst_conf, 0.4)

    # 신뢰도 낮음 경고
    if worst_conf == "low":
        warnings.append(
            {
                "severity": "info",
                "code": "LOW_CONFIDENCE",
                "message": "일부 금속의 추정 신뢰도가 낮습니다 (저품질 또는 누락 데이터).",
                "action": "해당 금속은 현장 실험으로 성능을 반드시 재검증하세요.",
            }
        )

    total_min = sum(
        thickness_rules.get(lyr["material_id"], {}).get("min", 10) for lyr in active_layers
    )
    total_max = sum(
        thickness_rules.get(lyr["material_id"], {}).get("max", 20) for lyr in active_layers
    )

    version = get_db_version(db)

    return FilterRecommendation(
        filter_stack=filter_stack,
        warnings=[Warning(**w) for w in warnings],
        metal_removal={
            k: RemovalEstimate(**v)
            for k, v in removal_estimates.items()
            if v.get("estimated_pct") is not None
        },
        design_params=DesignParams(
            total_thickness_min_cm=total_min,
            total_thickness_max_cm=total_max,
            layer_count=len(active_layers),
            HLR_m_h=2.0,
            EBCT_min=18.5,
        ),
        confidence=ConfidenceReport(
            score=conf_score,
            level=worst_conf,
            note="신뢰도 낮은 레코드 사용됨." if worst_conf == "low" else "",
        ),
        db_version=version["db_version"],
        model_version=version["model_version"],
        disclaimer=DISCLAIMER,
    )
