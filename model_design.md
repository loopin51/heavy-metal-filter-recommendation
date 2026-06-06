# 중금속 흡착 필터 구조 추천 모델 설계서

> 버전 1.0 · 2026-06
> 본 문서는 구현 사양이 아닌 **설계 명세(design specification)**입니다.
> 실제 구현 전 실험 검증 및 추가 문헌 수집이 선행되어야 합니다.

---

## 1. 설계 철학

### 1.1 모델 유형 선택: 규칙 기반 + 스코어링 하이브리드

순수 ML(머신러닝) 모델 대신 **규칙 기반(Rule-based) + 점수 기반(Scoring) 하이브리드**를 선택한 이유:

| 기준 | 순수 ML | 규칙+스코어링 하이브리드 |
|------|---------|----------------------|
| 학습 데이터 | 수천~수만 건 필요 | DB 55 레코드로 동작 가능 |
| 해석 가능성 | 낮음 (블랙박스) | 높음 (각 추천 근거 제시 가능) |
| 과학적 신뢰성 | 학습 편향 위험 | 문헌 메커니즘 직접 반영 |
| 업데이트 | 재학습 필요 | DB 행 추가로 즉시 반영 |
| 엣지 케이스 | 예측 불가 | 명시적 예외 처리 가능 |

- Phase 2(규칙 엔진)는 **결정론적(deterministic)**: 동일 입력 → 항상 동일 슬롯 구성
- Phase 3(스코어링)는 **데이터 주도적**: DB 값으로 성능 추정 및 후보 소재 랭킹
- 향후 데이터가 축적(200+ 레코드)되면 소재 선택 단계에 경량 ML 모델(랜덤 포레스트 등) 도입 가능

---

## 2. 입력/출력 스키마 (I/O Schema)

### 2.1 입력 (FilterInput)

```
FilterInput {
  scenario     : enum { industrial | mining | agricultural | groundwater | urban }
  metals       : List<enum { Pb2+ | Cu2+ | Cd2+ | Cr3+ | Cr6+ | Hg2+ | As3+ | As5+ | Zn2+ | Ni2+ }>
                 (1개 이상, 최대 10개)
  level        : enum { low | medium | high }
                 저 = <5 mg/L / 보통 = 5–100 mg/L / 높음 = >100 mg/L 기준
  pH_range     : enum { acidic | neutral | alkaline }
                 산성 = pH<5 / 중성 = pH 5–7 / 염기성 = pH>8

  optional {
    initial_conc_mg_L   : Float   기본값: level 중앙값
    target_removal_pct  : Float   기본값: 95.0
    flow_rate_m3_day    : Float   HLR 계산용
  }
}
```

### 2.2 출력 (FilterRecommendation)

```
FilterRecommendation {
  filter_stack : List<FilterLayer>   순서대로 정렬된 레이어 목록
  warnings     : List<Warning>       경고·주의사항
  metal_removal: Map<MetalId, RemovalEstimate>   금속별 추정 제거율
  design_params: DesignParameters    두께·HLR·재생 주기 등
  confidence   : ConfidenceReport    데이터 신뢰도 평가

  FilterLayer {
    slot        : Int           슬롯 번호 (1–9)
    material_id : String        materials.json 참조키
    role        : String        층 기능 설명
    is_mandatory: Bool          필수 여부
    trigger     : String        활성화 조건 (조건부 레이어만)
    thickness   : { min, max, unit: "cm" }
    mechanism   : String        흡착 메커니즘 설명
    reaction_eq : String        핵심 반응식
    target_metals: List<MetalId>
    supporting_records: List<String>   adsorption_data ID 목록
  }

  Warning {
    severity : enum { info | caution | danger }
    code     : String   예: "ALKALINE_PRECIPITATION"
    message  : String
    action   : String   권고 조치
  }

  RemovalEstimate {
    metal           : MetalId
    estimated_pct   : Float   누적 제거율 추정치
    confidence      : enum { high | medium | low }
    limiting_layer  : String  병목 레이어 ID
  }

  DesignParameters {
    total_thickness_cm : { min, max }
    HLR_m_h           : Float   수리학적 부하율
    EBCT_min          : Float   빈 베드 접촉 시간
    backwash_schedule : String
    regen_schedule    : Map<MaterialId, String>
  }
}
```

---

## 3. 3단계 파이프라인 상세 설계

### Phase 1 — 전처리 (Pre-processing)

**1-1. 입력 유효성 검사**

```
validate(input):
  if metals.isEmpty():
    raise InvalidInput("중금속을 1개 이상 선택하세요")
  if metals 중 heavy_metals.json에 없는 ID:
    raise InvalidInput("지원하지 않는 중금속: {id}")
  if scenario not in SCENARIOS:
    raise InvalidInput("지원하지 않는 오염 유형")
```

**1-2. 금속 전하 분류기 (Metal Charge Classifier)**

모든 흡착 전략의 출발점. 중금속을 전하에 따라 두 그룹으로 분류한다.

```
classify_metals(metals):
  cations = []   → 양이온 처리 전략 (이온교환·킬레이트)
  anions  = []   → 음이온 처리 전략 (철산화물·정전기 흡착)

  CATION_METALS = { Pb2+, Cu2+, Cd2+, Cr3+, Hg2+, Zn2+, Ni2+ }
  ANION_METALS  = { Cr6+, As3+, As5+ }

  for m in metals:
    if m in CATION_METALS: cations.append(m)
    if m in ANION_METALS:  anions.append(m)

  return { cations, anions }
```

분류 결과가 이후 슬롯 4(철산화물층) 활성화 여부를 결정한다.

**1-3. 시나리오-오염도 정규화**

```
normalize_severity(scenario, level, metals):
  # 시나리오별 권장 오염도 상향 조정
  if scenario == "mining" and level == "low":
    recommended_level = "medium"   # AMD는 항상 최소 medium 권장
    add_note: "광산 배수는 복합 오염 빈번 — 보통 이상 권장"
  
  if "Hg2+" in metals and level == "low":
    recommended_level = "medium"   # 수은은 극미량에도 독성
    add_note: "Hg 존재 시 오염도 보통 이상 권장"
  
  return recommended_level
```

---

### Phase 2 — 규칙 엔진 (Rule Engine)

규칙 엔진의 핵심 자료구조는 **슬롯 템플릿(Slot Template)**이다.
9개 슬롯은 고정된 순서를 가지며, 각 슬롯은 `active/inactive` 상태를 가진다.

**2-1. 슬롯 템플릿 초기화**

```
SlotTemplate = [
  { slot: 1, material: "calcium_carbonate", active: False, mandatory: False },
  { slot: 2, material: "mno2",              active: False, mandatory: False },
  { slot: 3, material: "sand",              active: True,  mandatory: True  },
  { slot: 4, material: "iron_oxide",        active: False, mandatory: False },
  { slot: 5, material: "zeolite_natural",   active: True,  mandatory: True  },
  { slot: 6, material: "activated_carbon",  active: True,  mandatory: True  },
  { slot: 7, material: "chitosan",          active: False, mandatory: False },
  { slot: 8, material: "biochar_modified",  active: False, mandatory: False },
  { slot: 9, material: "gravel",            active: True,  mandatory: True  },
]
```

**2-2. pH 규칙 적용**

```
apply_pH_rules(template, pH_range):
  if pH_range == "acidic":
    template[slot=1].active = True        # 탄산칼슘 완충층 활성화
    template[slot=1].trigger = "pH < 5"

  elif pH_range == "alkaline":
    add_warning(
      severity = "caution",
      code     = "ALKALINE_PRECIPITATION",
      message  = "pH > 8: 금속 수산화물 침전 가능성",
      action   = "응집-침전 전처리 공정 적용 권장; 필터 교체 주기 30–50% 단축"
    )

  # neutral: 변경 없음
```

**2-3. 오염도 수준 규칙 적용**

```
apply_level_rules(template, level):
  if level in { "medium", "high" }:
    template[slot=7].active = True        # 키토산층 활성화
    template[slot=7].trigger = "오염도 ≥ 보통"

  if level == "high":
    template[slot=8].active = True        # 바이오차층 활성화
    template[slot=8].trigger = "오염도 = 높음"
```

**2-4. 금속 특화 규칙 적용**

```
apply_metal_rules(template, classified_metals):
  # 음이온 금속 존재 → 철산화물층
  if classified_metals.anions:
    template[slot=4].active = True
    template[slot=4].trigger = str(classified_metals.anions) + " 음이온 제거"

  # As(III) 특수 처리 (산화 필요)
  if "As3+" in classified_metals.anions:
    template[slot=2].active = True
    template[slot=2].trigger = "As(III) → As(V) 산화 전처리"
    add_warning(
      severity = "caution",
      code     = "AS3_OXIDATION_REQUIRED",
      message  = "As(III) 확인 — MnO₂ 산화층이 철산화물층 전에 필수 배치"
    )

  # Hg → 활성탄 설정 강화
  if "Hg2+" in classified_metals.cations:
    template[slot=6].config["priority"] = "mercury"
    template[slot=6].config["note"] = "황 함침(S-impregnated) GAC 권장"
```

**2-5. 활성 슬롯 추출 및 정렬**

```
finalize_stack(template):
  active_layers = [s for s in template if s.active == True]
  active_layers.sort(key=lambda s: s.slot)   # 슬롯 번호 순 정렬
  return active_layers
```

---

### Phase 3 — 스코어링 엔진 (Scoring Engine)

**3-1. 소재 점수 함수 S(material, metal, conditions)**

슬롯에 복수의 후보 소재가 있을 때 최적 소재를 선택하는 함수.

```
S(material, metal, conditions) =
    0.35 × removal_pct / 100          # 실험 제거율 (최대 가중)
  + 0.30 × norm_qmax(material, metal) # qmax 정규화 [0, 1]
  + 0.20 × pH_compat(material, pH_range) # pH 호환성
  + 0.10 × quality_weight(data_quality)  # 데이터 신뢰도
  + 0.05 × availability_score(material)  # 국내 조달 용이성

where:
  norm_qmax(m, met) = qmax(m, met) / max(qmax(*, met) in DB)

  pH_compat:
    완전 일치 (pH_range ∩ material.optPH ≠ ∅) → 1.0
    부분 일치 (경계 ±1 pH 단위)               → 0.6
    불일치                                     → 0.2

  quality_weight:
    "high"      → 1.0
    "medium"    → 0.7
    "low"       → 0.4
    "estimated" → 0.2

  availability_score:
    "용이" → 1.0  "전문업체" → 0.7  "실험실 제조" → 0.4
```

**3-2. 누적 제거율 R_total(metal)**

각 레이어가 독립적으로 작동한다고 가정한 직렬 제거 모델.

```
R_total(metal) = 1 − Π_{i ∈ active_layers} (1 − R_i(metal))

R_i(metal) = DB_removal_i(metal)
           × column_factor           # 배치→컬럼 보정 (기본값 0.40)
           × pH_factor_i             # pH 범위 보정 (0.2–1.0)
           × competition_factor      # 경쟁 흡착 페널티

where:
  competition_factor = 1 / (1 + 0.1 × n_metals)
    예: n_metals=3 → factor=0.77 (약 23% 감소)

  DB_removal_i(metal):
    adsorption_data.json에서 material_id=i, metal_id=metal 레코드 조회
    복수 레코드 시 → quality 가중 평균 사용

  column_factor 보정 로직:
    if adsorption_data.conditions == "column": column_factor = 1.0
    elif adsorption_data.conditions == "batch": column_factor = 0.40
    (배치 qmax 대비 컬럼 효율은 평균 40% 수준 — PMC10890072 기준)
```

**3-3. 신뢰도 점수 C**

```
C = 0.6 × (high_quality_records / total_records_used)
  + 0.3 × (covered_metals / input_metals)
  + 0.1 × pH_condition_match_rate

해석:
  C ≥ 0.8 → 높음 (high data coverage)
  C 0.5–0.8 → 보통 (medium coverage)
  C < 0.5 → 낮음 (low coverage, 추가 문헌 수집 권고)
```

---

## 4. 충돌 해결 규칙 (Conflict Resolution)

### 4.1 pH 충돌 — 공존 금속의 최적 pH가 다를 때

예: Cr(VI)는 pH 3–5 최적, 키토산의 양이온 흡착은 pH 5–9 최적

```
resolve_pH_conflict(metals, pH_range):
  if Cr6+ in metals AND (Pb2+ or Cu2+ or Cd2+) in metals:
    → Cr(VI) 전처리 환원(Fe²⁺/SO₂) 후 pH 조정 권고 경고 출력
    → 필터 내 pH는 보편 최적(5–7)으로 고정
    → Cr(VI) 제거 레이어(iron_oxide)는 가장 앞에 배치
```

### 4.2 As(III) + As(V) 동시 존재

```
if As3+ in metals AND As5+ in metals:
  → As(III) 규칙 적용 (더 보수적)
  → MnO₂ 슬롯 2 활성화
  → 경고: "As(III)와 As(V) 공존 — 산화층 필수"
```

### 4.3 고농도(high) + 단일 금속

```
if level == "high" AND len(metals) == 1:
  → 복합층 추가보다 핵심 레이어 두께 증대 우선
  → 해당 금속에 최고 S 점수 소재의 두께를 high_load 값으로 설정
  → 이 경우 바이오차 슬롯 비활성화 고려 (경제성 우선)
```

### 4.4 염기성 pH + 다중 중금속

```
if pH_range == "alkaline":
  → 금속 수산화물 침전 가능 → 필터 앞단 응집-침전조 권고 경고
  → if level == "high" AND pH_range == "alkaline":
       add_warning(severity="danger", code="HIGH_ALKALINE_LOAD",
                   message="고농도 염기성 조건 — 필터보다 화학 침전 공정이 우선적")
```

---

## 5. 두께 계산 로직

```
thickness(material, level, HLR):
  base = filter_rules.layer_thickness_recommendations[material]
  
  if level == "high":
    target = base.high_load
  elif level == "medium":
    target = (base.min + base.max) / 2
  else:  # low
    target = base.min

  # HLR 보정: 유량이 높으면 두께 증가
  if HLR > 8:  # m/h 초과
    target = target × 1.25
  
  return { min: base.min, recommended: target, max: base.high_load }
```

EBCT(Empty Bed Contact Time) 계산:

```
EBCT_min = thickness_cm / (HLR_m_h × 100 / 60)
목표: 키토산/바이오차 레이어는 EBCT ≥ 15분 확보
```

---

## 6. 경고 시스템 (Warning System)

| 코드 | 심각도 | 발생 조건 | 출력 메시지 요약 |
|------|--------|-----------|-----------------|
| `ALKALINE_PRECIPITATION` | caution | pH > 8 | 수산화물 침전 → 응집-침전 전처리 |
| `AS3_OXIDATION_REQUIRED` | caution | As(III) 포함 | MnO₂ 산화층 필수 |
| `CR6_pH_CONFLICT` | caution | Cr(VI) + 양이온 혼합 | pH 충돌 → 단계별 pH 처리 |
| `HG_ENHANCED_AC` | info | Hg 포함 | 황 함침 활성탄 권고 |
| `HIGH_ALKALINE_LOAD` | danger | level=high + pH=alkaline | 화학 침전 공정 우선 고려 |
| `LOW_CONFIDENCE` | info | C < 0.5 | 해당 금속 데이터 부족, 검증 필요 |
| `COLUMN_CORRECTION` | info | 항상 | 모든 추정치는 배치→컬럼 보정(×0.4) 포함 |
| `COMPETITIVE_PENALTY` | info | n_metals > 1 | 복수 금속 공존 시 개별 제거율 감소 가능 |

---

## 7. 데이터 흐름 요약 (Data Flow)

```
[사용자 입력]
    │
    ▼
[Phase 1: 전처리]
  heavy_metals.json ── 금속 특성·전하 분류
  scenarios.json    ── 시나리오별 파라미터 로드
    │
    ▼
[Phase 2: 규칙 엔진]
  filter_rules.json ─┬─ 슬롯 템플릿 초기화
                     ├─ pH 규칙 적용 (slot 1 ±)
                     ├─ Level 규칙 적용 (slot 7, 8 ±)
                     └─ Metal 규칙 적용 (slot 2, 4 ±)
    │
    ▼
[Phase 3: 스코어링]
  adsorption_data.json ── DB_removal 조회
  materials.json       ── 소재 물성·가용성 조회
    │
    ├─ S() 계산 → 후보 소재 랭킹
    ├─ R_total() 계산 → 누적 제거율 추정
    └─ C() 계산 → 신뢰도 평가
    │
    ▼
[FilterRecommendation 출력]
  filter_stack / warnings / metal_removal / design_params / confidence
```

---

## 8. 한계 및 주의사항

### 8.1 현재 모델의 주요 한계

| 한계 | 영향 | 보완 방향 |
|------|------|-----------|
| `column_factor = 0.40` 고정값 | 소재별 실제 비율 상이 (0.2–0.7 범위) | 컬럼 레코드 확충 후 소재별 계수 학습 |
| 경쟁 흡착 단순 페널티 공식 | 금속 조합별 실제 선택성 반영 안 됨 | 다중 금속 공존 배치 실험 데이터 필요 |
| 온도 효과 미반영 | 모든 데이터가 ~25°C 기준 | 온도 보정 계수 (van't Hoff) 추가 |
| 장기 파울링 미모델 | 운전 시간에 따른 성능 저하 무시 | 필드 데이터 누적 후 감쇠 모델 적용 |
| 레이어 간 독립 가정 | 실제: 상류층 영향이 하류층 성능 변화 | 직렬 반응기 연동 모델로 고도화 |
| 수리학적 특성 단순화 | EBCT·HLR이 흡착 효율에 비선형 영향 | Thomas 모델, BDST 모델 도입 |

### 8.2 qmax 해석 시 필수 주의사항

모델이 출력하는 제거율 추정치는 다음을 가정한 이론값이다.

- 단일 금속 배치 실험 qmax에서 `column_factor=0.40` 보정
- 복수 금속 공존 페널티 `1/(1+0.1×n)` 추가 보정
- 실제 현장 적용 전 반드시 **파일럿 스케일 컬럼 실험** 필요

현장 제거율은 이론 추정치의 **50–80% 수준**으로 보수적으로 기대하는 것이 타당하다.

---

## 9. 확장 경로 (Future Extensions)

### 9.1 단기 (데이터 확충)

- Scholar Gateway MCP + PubMed API로 논문 200편 추가 수집
- 특히 Hg(2건), Ni(2건) 레코드 집중 확충
- 컬럼 실험(batch가 아닌 column) 레코드 비율 현재 5% → 30% 목표

### 9.2 중기 (모델 고도화)

- 소재 선택에 랜덤 포레스트 분류기 도입 (데이터 200+ 레코드 이후)
- Thomas/BDST 등 컬럼 파괴(breakthrough) 모델 통합
- 경제성 분석 모듈: CAPEX/OPEX 추정 자동화

### 9.3 장기 (피드백 루프)

- 사용자 현장 결과 입력 → DB 자동 갱신
- Bayesian 업데이트로 column_factor를 소재별로 학습
- 다국어(영문) 버전 및 WHO 가이드라인 실시간 연동

---

## 10. 검증 계획

모델 출시 전 다음 두 단계 검증이 필요하다.

**Step 1 — 내부 검증 (hold-out 테스트)**

```
DB 55개 레코드 중 10개를 검증 세트로 분리
R_total 추정치와 실험 removal_pct 비교
허용 오차: ±15% 이내

검증 지표:
  MAE (Mean Absolute Error) < 10%
  Coverage: 추정 제거율 ≥ 실제 × 0.85 (보수적 추정)
```

**Step 2 — 파일럿 컬럼 실험 검증**

```
선택 케이스 3종:
  (a) Pb + Cu, 보통, 중성 → 기본 4층 + 키토산
  (b) As + Cr(VI), 높음, 산성 → 풀 스택 (MnO₂ + 철산화물 포함)
  (c) Hg, 보통, 중성 → 활성탄 강화 스택

측정 항목: 유입/유출 농도, 파괴 시간, qmax(컬럼)
결과로 column_factor 및 competition_factor 재보정
```
