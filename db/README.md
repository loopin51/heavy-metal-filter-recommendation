# 중금속 흡착 필터 지식 데이터베이스 (Heavy Metal Adsorption Filter Knowledge DB)

## 개요

본 데이터베이스는 동료심사 학술문헌(peer-reviewed literature)에서 추출한
중금속 흡착 소재의 특성, 흡착 성능, 필터 설계 규칙을 정규화·구조화한 파일 모음입니다.

> **데이터 출처**: 단일 통합 공개 DB는 현재 존재하지 않으며, 본 데이터는
> PubMed/PMC, ScienceDirect, ACS 등에 수록된 리뷰 논문 및 실험 논문
> 수십 편을 수동 추출·정규화한 것입니다.

---

## 파일 구조

```
db/
├── README.md               ← 이 파일 (구조 및 출처 안내)
├── materials.json          ← 흡착 소재 12종 물성 정보
├── heavy_metals.json       ← 중금속 10종 화학 특성 + 국내외 기준치
├── adsorption_data.json    ← 소재 × 중금속 흡착 실험 데이터 (~70 레코드)
├── adsorption_data.csv     ← 위와 동일한 데이터 (분석용 CSV)
├── filter_rules.json       ← 조건별 필터 구성 규칙 (pH, 오염도, 금속 종류)
└── scenarios.json          ← 오염 상황 유형 5종
```

---

## 데이터 신뢰도 등급

| 등급 | 의미 |
|------|------|
| `high` | 복수 독립 연구에서 일관된 결과, 인용 수 50+ |
| `medium` | 1~2편 논문 기반, 실험 조건이 구체적으로 명시 |
| `low` | 단일 연구 또는 간접 추정치, 검증 필요 |
| `estimated` | 유사 소재 데이터로부터 추정, 실험 미확인 |

---

## 주요 참고문헌 목록

| ref_id | 인용 |
|--------|------|
| BABEL2003 | Babel, S. & Kurniawan, T.A. (2003). Low-cost adsorbents for heavy metals uptake from contaminated water. *J. Hazard. Mater.*, 97, 219–243 |
| RIOS2008 | Rios, C.A. et al. (2008). Removal of heavy metals from acid mine drainage (AMD) using coal fly ash, natural clinker and synthetic zeolites. *J. Hazard. Mater.*, 156, 23–35 |
| BAILEY2014 | Bailey, S.E. et al. (2014). A review of potentially low-cost sorbents for heavy metals. *Water Res.* (via PMC4148316) |
| PMC9457549 | Drużyński et al. (2022). Chitosan-Modified Biochars for Pb/Cd/Cu removal. *Int. J. Mol. Sci.* PMC9457549 |
| PMC7321104 | Weißpflog et al. (2020). Solubility and Selectivity Effects of Anion on Chitosan Adsorption. *Molecules.* PMC7321104 |
| PMC10890072 | Anawar et al. (2024). Biochar as Alternative for Heavy Metal Adsorption from Groundwaters. *Water.* PMC10890072 |
| PMC10511742 | Biochar synthesis from tree leaves for Pb²⁺ removal. *Sci. Rep.* PMC10511742 |
| PMC10610860 | PLA@CS/HAP 3D-Printed Filters for Cu removal. *Polymers.* PMC10610860 |
| PMC8398132 | Rao et al. (2021). A Review of Adsorbents for Heavy Metal Decontamination. *Water.* PMC8398132 |
| LIU2022 | Liu et al. (2022). Zeolite-based adsorbents: 4A and Na-P1 for Pb removal. *Sci. Total Environ.* (ScienceDirect 2025) |
| PMC4148316 | Kefeni et al. (2014). Filter materials for metal removal from mine drainage — a review. *Sci. Rep.* PMC4148316 |
| PMC12566221 | Cabrera et al. (2025). Biosorbent & Biopolymeric Materials for Heavy Metal Adsorption. *Polymers.* PMC12566221 |
| ACSOMEGA2024 | Xu et al. (2024). Adsorption of Cu(II) and Pb(II) by Biochar Composites. *ACS Omega* |
| PMC13013057 | Zeolite/Chitosan carbonized composite (C-ZLCH) for Cu/Cr. PMC10057389 |

---

## 단위 및 표기 규칙

- `qmax_mg_g` : Langmuir 최대 흡착량 (mg/g). 명시 없을 경우 배치(batch) 실험값
- `qmax_column_mg_g` : 컬럼 실험 최대 흡착량 (일반적으로 배치보다 낮음)
- `removal_pct` : 제거 효율 (%, 해당 실험 조건에서)
- `pH_opt` : 최적 pH (단일값) 또는 pH 범위
- `C0_mg_L` : 초기 중금속 농도 (mg/L)
- `dose_g_L` : 흡착제 투여량 (g/L)
- `t_eq_min` : 평형 접촉 시간 (분)

---

## 데이터 활용 시 주의사항

1. qmax 값은 **실험실 배치 조건**에서 측정된 이론 최대값이며, 실제 필드 조건에서는 20~60% 감소 예상
2. pH 조건이 제거 효율에 지배적 영향을 미치므로, 반드시 pH 범위를 확인할 것
3. 복수 중금속 공존 시 경쟁 흡착으로 개별 qmax보다 낮아짐 (특히 이온 교환 소재)
4. 실제 적용 전 pilot-scale 컬럼 실험으로 파라미터 재측정 필요
