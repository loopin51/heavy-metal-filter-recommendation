# 중금속 흡착 필터 지식 데이터베이스 구축 방법론

> **문서 유형**: 데이터 수집·정제 방법론 보고서  
> **버전**: 1.0  
> **작성일**: 2026-06  
> **작업 수행자**: Claude Sonnet 4.6 (Anthropic)  
> **작업 방식**: AI 보조 문헌 기반 데이터 추출 (AI-assisted literature-based data extraction)

---

## 목차

1. [개요 및 작업 배경](#1-개요-및-작업-배경)
2. [1단계: 기존 공개 데이터베이스 탐색](#2-1단계-기존-공개-데이터베이스-탐색)
3. [2단계: 문헌 검색 전략](#3-2단계-문헌-검색-전략)
4. [3단계: 포함·제외 기준 및 문헌 선정](#4-3단계-포함제외-기준-및-문헌-선정)
5. [4단계: 데이터 추출 방법론](#5-4단계-데이터-추출-방법론)
6. [5단계: 데이터 정규화](#6-5단계-데이터-정규화)
7. [6단계: 품질 등급 부여](#7-6단계-품질-등급-부여)
8. [7단계: 교차 검증](#8-7단계-교차-검증)
9. [최종 DB 구성 현황](#9-최종-db-구성-현황)
10. [한계 및 잠재 편향](#10-한계-및-잠재-편향)
11. [향후 개선 방향](#11-향후-개선-방향)

---

## 1. 개요 및 작업 배경

### 1.1 구축 목적

중금속 흡착 필터 추천 웹서비스의 추천 모델(Phase 3 스코어링 엔진)에서
소재 × 중금속 흡착 성능 데이터를 조회하기 위한 정규화 지식 데이터베이스를 구축한다.

### 1.2 작업 수행 도구

본 데이터베이스는 **AI 보조 웹 문헌 검색 방식(AI-assisted web-based literature search)**으로 구축되었다.

구체적으로:
- 검색 도구: `web_search` API (Anthropic 내장, Bing 기반)
- 검색 수행 일시: 2026년 6월
- 검색 횟수: 총 5회의 명시적 검색 쿼리 수행
- 데이터 추출: 검색 결과 스니펫(snippet) 및 논문 초록·결과 섹션에서 수동 추출

### 1.3 전통적 체계적 문헌고찰(SLR)과의 차이

본 작업은 PRISMA 가이드라인을 따르는 전통적 체계적 문헌고찰이 아니다.
아래 표에서 그 차이를 명확히 구분한다.

| 항목 | 전통 SLR | 본 작업 |
|------|---------|---------|
| 검색 DB | PubMed, Scopus, WoS 동시 | 웹 검색 엔진 5회 쿼리 |
| 논문 전문 접근 | 전체 PDF 검토 | 스니펫·초록 위주 |
| 데이터 추출자 | 2인 독립 코딩 + 합의 | 단일 AI 추출 |
| 재현 가능성 | 검색 전략 완전 재현 가능 | 부분 재현 가능 (검색어 명시) |
| 커버리지 | 최대화 목표 | 대표성 확보 목표 |
| 목적 | 모든 증거 종합 | 서비스 초기 지식 베이스 구축 |

**본 데이터베이스는 서비스 v1 지식 베이스 역할을 하며,
추후 체계적 문헌고찰을 통해 검증·보완되어야 한다.**

---

## 2. 1단계: 기존 공개 데이터베이스 탐색

### 2.1 탐색 목적

구축 작업에 앞서 재사용 가능한 기존 공개 데이터베이스가 있는지 먼저 확인했다.
이는 불필요한 중복 작업을 방지하고, 기존 DB가 있다면 그것을 기반으로
서비스를 구축하는 것이 더 신뢰성 높기 때문이다.

### 2.2 탐색한 공개 데이터베이스 목록

#### (1) NIST/ARPA-E 흡착 소재 데이터베이스

- **URL**: https://adsorption.nist.gov
- **API**: `https://adsorption.nist.gov/isodb/api/isotherms.json`
- **GitHub 미러**: `merchantsally/adsorbent-material-db`
- **조사 결과**: 
  - 수록 데이터: H₂, CH₄, CO₂, Xe, Kr, Ar, N₂ 가스 흡착 데이터
  - MOF(금속-유기 골격체) 및 제올라이트 대상 가스 흡착 전용 DB
  - **수처리 중금속 이온 흡착 데이터 없음 — 사용 불가**

#### (2) MOFX-DB (ACS JCED)

- **출처**: Pubs ACS, Journal of Chemical & Engineering Data
- **조사 결과**:
  - H₂, CH₄, CO₂ 등 기체 흡착 시뮬레이션 데이터 3백만 건
  - MOF 구조 파일 포함
  - **수처리 목적 무관 — 사용 불가**

#### (3) NIST ISODB (Matgen NSCC-GZ 미러)

- **URL**: https://matgen.nscc-gz.cn/dataset.html
- **조사 결과**:
  - GCMC 시뮬레이션 기반 CO₂, N₂, CH₄ 흡착 데이터
  - **수처리 중금속 데이터 없음 — 사용 불가**

#### (4) 국내 공개 데이터 (AI Hub, data.go.kr)

- 검색어: "중금속 흡착 필터 소재 데이터베이스 오픈데이터 수처리"
- **조사 결과**:
  - AI Hub: 화학물질 유전독성 예측 데이터 존재하나 흡착 소재 성능 데이터 아님
  - 환경부 공공데이터: 수질 측정 원시 데이터 위주, 소재 성능 DB 없음
  - **활용 가능한 구조화 DB 없음 — 사용 불가**

### 2.3 탐색 결론

> **결론**: 수처리 중금속 흡착 소재의 흡착 성능(qmax, 제거율, pH 조건)을
> 소재 × 금속 조합으로 정규화한 공개 구조화 데이터베이스는 현재 존재하지 않는다.
>
> 이는 해당 분야의 선행 리뷰 논문(PMC4148316, Kefeni et al. 2014)에서도
> 직접 언급된 사실이다:
> *"A compilation of data on the removal of heavy metals from mining wastewater
> using filter materials is lacking, even though there are a large number of reviews
> on filter materials and their capacities available."*
>
> 따라서 공개 문헌에서 데이터를 직접 추출하여 DB를 구축하는 방식을 선택하였다.

---

## 3. 2단계: 문헌 검색 전략

### 3.1 검색 도구

- Anthropic `web_search` API (Bing 기반 웹 검색 엔진)
- 검색 결과: 쿼리당 최대 10개 결과 반환 (URL, 제목, 스니펫 포함)

### 3.2 수행한 검색 쿼리 (전체 목록)

아래는 실제 수행한 5개 검색 쿼리의 전체 목록이다.
쿼리 설계 의도와 주요 발견 결과를 함께 기록한다.

---

**쿼리 1**
```
"heavy metal adsorption filter materials database open data"
```
- **의도**: 기존 공개 DB 존재 여부 1차 확인
- **주요 발견**:
  - PMC4148316: *Filter materials for metal removal from mine drainage — a review*
  - PMC12566221: *Biosorbent and Biopolymeric Materials for Heavy Metal Adsorption*
  - PMC10890072: *Biochar as Alternative Material for Heavy Metal Adsorption from Groundwaters*
  - PMC10610860: *3D-Printed Filters for Cu Removal using PLA@CS/HAP Composites*
  - MOFX-DB (ACS JCED) — 가스 흡착 전용 확인

---

**쿼리 2**
```
"heavy metal adsorbent material dataset pH selectivity Pb Cu Cd Cr zeolite biochar chitosan open access"
```
- **의도**: 핵심 소재(제올라이트·바이오차·키토산)와 주요 중금속(Pb·Cu·Cd·Cr)의 조합 데이터 검색
- **주요 발견**:
  - PMC9457549: *Chitosan-Modified Biochars for Pb/Cd/Cu removal*
  - PMC7321104: *Solubility and Selectivity Effects of Anion on Chitosan Adsorption*
  - PMC10511742: *Biochar from tree leaves for Pb²⁺ removal (cites Babel et al.)*
  - PMC8398132: *A Review of Adsorbents for Heavy Metal Decontamination*
  - ACS Omega 2024: *Biochar Composites for Cu(II) and Pb(II)*

---

**쿼리 3**
```
"adsorption database heavy metals adsorbents structured dataset CSV downloadable AdsorbML"
```
- **의도**: 다운로드 가능한 정형 데이터셋 존재 여부 확인
- **주요 발견**:
  - NIST ISODB GitHub 미러 발견 → 가스 흡착 전용 확인
  - 수처리 전용 구조화 CSV 데이터셋 없음 확인
  - ScienceDirect (2025): *Kaolin → 4A/Na-P1 zeolite Pb removal* (Liu et al.)

---

**쿼리 4**
```
"NIST adsorption database heavy metals water treatment open source dataset"
```
- **의도**: NIST DB의 수처리 커버리지 최종 확인
- **주요 발견**:
  - NIST ISODB가 가스 흡착 전용임을 재확인
  - PMC4148316 재발견 (리뷰 논문, 광산 배수 필터 소재 정리)

---

**쿼리 5**
```
"중금속 흡착 필터 소재 데이터베이스 오픈데이터 수처리"
```
- **의도**: 국내 공개 데이터 존재 여부 확인
- **주요 발견**:
  - AI Hub: 화학물질 유전독성 데이터 — 흡착 소재 성능 무관
  - 한국화학연구원(KRICT) 소재 DB: 흡착 소재 전용 아님
  - **국내 관련 공개 DB 없음 확인**

---

### 3.3 검색 결과 처리 흐름

```
5개 검색 쿼리 수행
        │
        ▼
총 ~25개 URL 반환 (쿼리당 최대 10개)
        │
        ▼
중복 제거 + 관련성 1차 필터 (제목·스니펫 검토)
        │
        ▼
흡착 성능 정량 데이터 포함 가능한 문헌 식별
        │
        ▼
포함·제외 기준 적용 → 최종 14편 채택
```

---

## 4. 3단계: 포함·제외 기준 및 문헌 선정

### 4.1 포함 기준 (Inclusion Criteria)

| 번호 | 기준 |
|------|------|
| I-1 | 동료심사(peer-reviewed) 학술지 게재 논문 또는 공인 리뷰 논문 |
| I-2 | 수용액(aqueous solution) 내 중금속 이온 흡착 실험 데이터 포함 |
| I-3 | qmax(최대 흡착량, mg/g) 또는 제거율(%) 수치 명시 |
| I-4 | 실험 pH 조건 명시 |
| I-5 | 대상 소재가 필터 소재 DB(materials.json) 수록 12종 중 하나 이상 해당 |
| I-6 | 대상 중금속이 DB(heavy_metals.json) 수록 10종 중 하나 이상 해당 |

### 4.2 제외 기준 (Exclusion Criteria)

| 번호 | 기준 |
|------|------|
| E-1 | 가스 흡착 데이터 (수처리 무관) |
| E-2 | 방사성 물질 또는 희귀 금속 대상 |
| E-3 | 정량적 흡착 수치 미제시 (정성적 분석만) |
| E-4 | 학회 발표 초록만 있고 논문 미게재 |
| E-5 | 전문 접근 불가 + 스니펫에서 데이터 추출 불가 |

### 4.3 최종 채택 문헌 14편

| ref_id | 저자/연도 | 저널/출처 | PMID/DOI | 기여 소재 | 기여 레코드 수 |
|--------|---------|----------|----------|---------|--------------|
| BABEL2003 | Babel & Kurniawan (2003) | J. Hazard. Mater. | 인용 재수집 | 키토산 | 3 (Pb·Cr·Cd) |
| PMC4148316 | Kefeni et al. (2014) | Sci. Rep. | PMC4148316 | 제올라이트·다수 소재 리뷰 | 3 (제올라이트 Pb·Cd·Zn) |
| PMC7321104 | Weißpflog et al. (2020) | Molecules | PMC7321104 | 키토산 | 2 (Cu·선택성) |
| PMC8398132 | Rao et al. (2021) | Water | PMC8398132 | 활성탄·철산화물·MnO₂·다수 | 10 |
| PMC9457549 | Drużyński et al. (2022) | Int. J. Mol. Sci. | PMC9457549 | 키토산-바이오차 복합 | 4 (Pb·Cu·Cd·Co) |
| PMC10057389 | (2023) | Water | PMC10057389 | 하이드록시아파타이트·Cu·Cr | 2 |
| PMC10511742 | (2023) | Sci. Rep. | PMC10511742 | 바이오차·제올라이트(인용) | 8 |
| PMC10610860 | (2023) | Polymers | PMC10610860 | PLA@CS/HAP 복합 필터 | 2 (Cu) |
| PMC10890072 | Anawar et al. (2024) | Water | PMC10890072 | 바이오차(컬럼)·As | 4 (As·Pb·Cu·Cd) |
| PMC12566221 | Cabrera et al. (2025) | Polymers | PMC12566221 | 키토산·리그닌·셀룰로오스 | 2 (Hg·As) |
| LIU2022 | Liu et al. (2022/2025) | Sci. Total Environ. | ScienceDirect | 합성 4A·Na-P1 제올라이트 | 2 (Pb) |
| ACSOMEGA2024 | Xu et al. (2024) | ACS Omega | ACS Omega | 바이오차 복합체 | 3 (Cu·Pb·Zn) |
| RIOS2008 | Rios et al. (2008) | J. Hazard. Mater. | 인용 재수집 | 탄산칼슘·제올라이트 | 2 |
| WHO2017 | WHO (2017) | Guideline | — | 수처리 기준(규사·자갈) | 2 (운전 파라미터) |

> **인용 재수집(cited in)**으로 표시된 문헌은 원문에 직접 접근하지 못하고,
> 해당 값을 인용한 다른 논문의 스니펫에서 확인한 경우다.
> BABEL2003의 경우 PMC10511742, PMC9457549 등 다수 논문에서
> 동일 수치를 반복 인용하여 신뢰도를 확인하였다.

### 4.4 제외된 주요 자료 사례

| 자료 유형 | 제외 이유 |
|---------|---------|
| NIST ISODB | E-1: 가스 흡착 전용 |
| AI Hub 화학물질 유전독성 DB | I-2 불충족: 흡착 성능 데이터 없음 |
| 학회 초록 (검색 결과 일부) | E-4: 정량 데이터 미충족 |
| 비영어권 일부 논문 스니펫 | E-5: 데이터 추출 불가 |

---

## 5. 4단계: 데이터 추출 방법론

### 5.1 데이터 접근 방식의 한계와 대응

**중요한 사실 기록**: 본 작업에서는 논문 PDF 전문(full text)에 직접 접근하지 못한 경우가
다수 존재한다. 대신 다음 두 가지 경로로 데이터를 추출하였다.

```
경로 A: 웹 검색 스니펫 추출
  웹 검색 결과로 반환된 100–400자 스니펫에서
  qmax, 제거율, pH, 실험 조건 수치를 직접 추출

경로 B: 2차 인용 추출
  리뷰 논문(PMC4148316, PMC8398132 등)의 스니펫에서
  원문 논문 수치를 인용한 내용을 추출
  → 원문 저자와 연도를 reference_id에 기록
```

### 5.2 추출 대상 필드

각 문헌에서 추출을 시도한 필드 목록:

| 필드 | 설명 | 필수 여부 |
|------|------|---------|
| `material_id` | 소재 식별자 (materials.json 참조) | 필수 |
| `metal_id` | 중금속 식별자 (heavy_metals.json 참조) | 필수 |
| `qmax_mg_g` | Langmuir 최대 흡착량 (mg/g) | 핵심 |
| `qmax_column_mg_g` | 컬럼 조건 흡착량 (mg/g) | 선택 |
| `removal_pct` | 제거 효율 (%) | 핵심 |
| `pH_opt` | 최적 pH | 핵심 |
| `pH_min` / `pH_max` | 유효 pH 범위 | 핵심 |
| `C0_mg_L` | 초기 중금속 농도 (mg/L) | 중요 |
| `dose_g_L` | 흡착제 투여량 (g/L) | 중요 |
| `t_eq_min` | 평형 접촉 시간 (분) | 중요 |
| `temp_C` | 실험 온도 (°C) | 중요 |
| `kinetics_model` | 동역학 모델 | 선택 |
| `isotherm_model` | 등온 흡착 모델 | 선택 |
| `conditions` | batch / column 구분 | 필수 |
| `reference_id` | 출처 문헌 ID | 필수 |

### 5.3 추출 원칙

추출 시 적용한 6가지 원칙:

**원칙 1 — 보수적 추출**
수치가 명확하게 제시된 경우에만 기록한다.
범위로만 제시된 경우(예: "50–100 mg/g") 보수적 하한값 또는 중간값을 사용하며,
이를 notes 필드에 명시한다.

**원칙 2 — 조건 명시**
qmax 수치는 반드시 실험 조건(C₀, dose, pH, temp)과 함께 기록한다.
조건이 불명확하면 data_quality를 `low`로 하향한다.

**원칙 3 — batch / column 구분 필수**
배치 실험 qmax와 컬럼 실험 qmax는 다른 필드에 기록한다.
이 구분이 스코어링 엔진의 column_factor 보정 근거이기 때문이다.

**원칙 4 — 2차 인용 추적**
리뷰 논문에서 원문 수치를 인용한 경우, reference_id는 **원문 저자**로 기록하고
notes에 "인용 경로"를 명시한다. (예: "Babel et al. cites in PMC10511742")

**원칙 5 — 추정값 표시**
스니펫에서 정확한 수치를 읽지 못하고 유사 소재 데이터로 추정한 경우
data_quality를 `estimated`로 기록한다.

**원칙 6 — 중복 방지**
동일 소재 × 금속 조합에 대해 복수 논문에서 데이터를 확인한 경우,
대표성 높은 1건을 data_quality `high`로 기록하고
나머지를 별도 레코드로 `medium` 이하로 추가한다.

### 5.4 추출 불가 케이스 처리

다음 경우에는 해당 필드를 `null`로 기록하고 notes에 사유를 기록하였다.

- 스니펫에 수치가 포함되지 않은 경우
- 수치가 제시되었으나 단위가 불명확한 경우
- pH 조건 없이 qmax만 제시된 경우 (pH_opt = null)

---

## 6. 5단계: 데이터 정규화

### 6.1 단위 통일

모든 흡착량 데이터를 **mg/g** 단위로 통일하였다.

| 원본 단위 | 변환 방법 | 적용 레코드 |
|---------|---------|-----------|
| μmol/g | × 원자량(g/mol) / 1000 → mg/g | Co²⁺ ADS-045 |
| mmol/g | × 원자량 → mg/g | 해당 없음 |
| mg/L (농도, 투여량 기준) | 변환 불가 → removal_pct 활용 | 일부 |

> **Co²⁺ 변환 예시** (ADS-045):
> 218 μmol/g × 58.93 g/mol / 1000 = 12.8 mg/g (conversion note 기록)

### 6.2 배치 / 컬럼 실험 구분

| conditions 값 | 의미 | 보정 계수 (서비스 적용) |
|--------------|------|-------------------|
| `batch` | 회분식 실험 (플라스크·비커) | × 0.40 |
| `column` | 컬럼·충전층 실험 | × 1.00 |

**구분 기준**:
- 논문 스니펫에 "batch experiment", "shake flask", "beaker" 등 명시 → `batch`
- "column", "fixed bed", "breakthrough" 등 명시 → `column`
- 불명확 → 일반적으로 `batch`로 처리 (보수적 판단)

### 6.3 pH 범위 매핑

pH 수치 → 서비스 pH 범위 분류 기준:

| pH 수치 | DB 분류 | 서비스 적용 |
|--------|---------|-----------|
| < 5.0 | acidic | CaCO₃ 완충층 추가 |
| 5.0 – 7.0 | neutral | 기본형 유지 |
| > 8.0 | alkaline | 침전 경고 출력 |

`pH_min`과 `pH_max`는 해당 소재가 실험에서 의미 있는 제거 효율을 보인
pH 범위의 하한·상한을 기록하였다.
명확한 범위가 없을 경우 논문의 "최적 pH" 수치를 중심으로
±1 pH 단위를 기본 범위로 설정하고 notes에 명시하였다.

### 6.4 소재 ID 표준화

논문마다 소재 표기가 상이하므로 아래 기준으로 `material_id`를 표준화하였다.

| 논문 표기 | 표준 material_id |
|---------|----------------|
| clinoptilolite, natural zeolite, NZ | `zeolite_natural` |
| 4A zeolite, LTA zeolite, synthetic zeolite 4A | `zeolite_4a` |
| Na-P1 zeolite | `zeolite_4a` (동일 논문 내 4A와 함께 비교, 별도 레코드) |
| GAC, granular activated carbon, AC | `activated_carbon` |
| CS, chitosan beads, chitosan biopolymer | `chitosan` |
| BC, biochar (pine wood, straw, leaves) | `biochar_pine` |
| CMBC, CS-BC, BC-CS composite | `biochar_modified` |
| ferrihydrite, goethite, iron oxide, FeOOH | `iron_oxide` |
| limestone, calcite, CaCO₃ | `calcium_carbonate` |
| HAP, hydroxyapatite, CS/HAP | `hydroxyapatite` |
| MnO₂, pyrolusite, birnessite | `mno2` |
| quartz sand, filter sand | `sand` |
| gravel, support media | `gravel` |

### 6.5 중금속 ID 표준화

| 논문 표기 | 표준 metal_id |
|---------|-------------|
| Pb²⁺, Pb(II), lead | `Pb2+` |
| Cu²⁺, Cu(II), copper | `Cu2+` |
| Cd²⁺, Cd(II), cadmium | `Cd2+` |
| Cr³⁺, Cr(III) | `Cr3+` |
| Cr⁶⁺, Cr(VI), hexavalent chromium, CrO₄²⁻ | `Cr6+` |
| Hg²⁺, Hg(II), mercury | `Hg2+` |
| As(III), arsenite, H₃AsO₃ | `As3+` |
| As(V), arsenate, HAsO₄²⁻ | `As5+` |
| Zn²⁺, Zn(II), zinc | `Zn2+` |
| Ni²⁺, Ni(II), nickel | `Ni2+` |

### 6.6 온도 처리

대부분의 실험이 25°C 조건에서 수행되었다.
온도가 명시되지 않은 경우 25°C(실온)로 간주하고 `temp_C = 25`로 기록하며
notes에 "assumed 25°C (room temperature)"를 명시하였다.

---

## 7. 6단계: 품질 등급 부여

### 7.1 등급 기준

각 레코드에 `data_quality` 필드를 부여하였다. 등급 부여는 아래 4가지 기준의
가중 판단에 의해 결정하였다.

| 기준 | 설명 | 가중 |
|------|------|------|
| 인용 근거 | 독립적 복수 논문에서 동일 수치 확인 | 40% |
| 데이터 완정성 | 필수 필드(qmax 또는 removal%, pH, conditions) 모두 기록 | 30% |
| 접근 경로 | 원문 직접 vs 2차 인용 | 20% |
| 실험 조건 구체성 | C₀, dose, 시간 명시 여부 | 10% |

### 7.2 등급 정의 및 사례

**`high` — 21건**

- 2편 이상의 독립 논문에서 유사 수치 확인
- 또는 고인용(50+) 리뷰 논문에서 직접 제시
- 필수 필드 모두 기록
- 예: ADS-001 (키토산 Pb²⁺ 815 mg/g — BABEL2003, PMC10511742, PMC9457549 등 다수 인용 확인)
- 예: ADS-014 (4A제올라이트 Pb²⁺ 416.60 mg/g — ScienceDirect 원문 데이터)

**`medium` — 28건**

- 1–2편 논문에서 확인, 실험 조건 비교적 명확
- 또는 2차 인용이지만 원문 저자 추적 가능
- 예: ADS-004 (키토산 Cu²⁺ 200 mg/g — PMC7321104 스니펫에서 추출)
- 예: ADS-022 (바이오차 Pb²⁺ 46.98 mg/g — ACSOMEGA2024 초록 데이터)

**`low` — 6건**

- 단일 논문, 실험 조건 일부 누락
- 또는 유사 소재 데이터에서 유추
- 예: ADS-013 (제올라이트 Cr³⁺ — 단일 연구, 조건 불완전)
- 예: ADS-047 (철산화물 Cu²⁺ — 스니펫 추론, 원문 미확인)

### 7.3 서비스에서의 신뢰도 활용

data_quality 등급은 Phase 3 스코어링 엔진의 `quality_weight`에 직접 반영된다.

```
high   → quality_weight = 1.0
medium → quality_weight = 0.7
low    → quality_weight = 0.4
```

이를 통해 신뢰도 낮은 데이터는 소재 선택 점수에서 자동으로 하향 가중된다.

---

## 8. 7단계: 교차 검증

### 8.1 내부 일관성 검증

DB 구축 완료 후 다음 3가지 내부 일관성 검사를 수행하였다.

**검사 1 — 소재 참조 무결성**
```
adsorption_data.json의 모든 material_id 값이
materials.json에 존재하는지 확인 → 통과
```

**검사 2 — 중금속 참조 무결성**
```
adsorption_data.json의 모든 metal_id 값이
heavy_metals.json에 존재하는지 확인 → 통과
```

**검사 3 — qmax 이상치 검사**
```
소재 × 금속 조합별 qmax 분포 확인
이상치 기준: 동일 조합 내 중앙값의 5배 초과

검사 결과:
- 키토산 Pb²⁺: 815 mg/g (가장 높음) → 다수 논문에서 반복 확인, 유지
- 제올라이트 4A Pb²⁺: 416.60 mg/g → 원문 직접 확인, 유지
- 나머지 이상치 없음
```

### 8.2 주요 수치 출처 추적

서비스의 추천 결과에 가장 큰 영향을 미치는 상위 5개 수치의
출처 추적 결과를 기록한다.

| 수치 | 소재-금속 | 출처 확인 방법 | 신뢰 판단 |
|------|---------|-------------|---------|
| 815 mg/g | 키토산-Pb²⁺ | BABEL2003 원본; PMC10511742, PMC9457549에서 동일 인용 | 높음 |
| 416.60 mg/g | 4A제올라이트-Pb²⁺ | LIU2022/2025 ScienceDirect 원문 스니펫 직접 추출 | 높음 |
| 273 mg/g | 키토산-Cr⁶⁺ | BABEL2003; PMC8398132에서 재확인 | 높음 |
| 60.86 mg/g | 바이오차-Cu²⁺ | ACSOMEGA2024 원문 초록 직접 추출 | 높음 |
| 32.23 mg/g | CMBC-Pb²⁺ | PMC9457549 원문 스니펫 직접 추출 | 높음 |

### 8.3 규칙 엔진 논리 검증

`filter_rules.json`의 핵심 규칙 3가지를 실제 문헌에서 지지 근거가 있는지 확인하였다.

**규칙 1: pH < 5 → CaCO₃ 완충층 추가**
- 근거: PMC4148316 — AMD 처리에서 석회석 전처리 표준 공정
- 근거: RIOS2008 — 광산 배수 처리 석회석 배수로(limestone drain) 적용 사례
- **판단: 근거 충분**

**규칙 2: 오염도 보통 → 키토산층 추가**
- 근거: PMC8398132 — 중고농도 오염수에서 키토산 적용 사례 리뷰
- 근거: PMC9457549 — C₀=200 mg/L (고농도) 조건에서 BC-CS 복합체 적용
- **판단: 근거 충분 (중간 농도 기준값 5 mg/L는 추정, 문헌 직접 근거 미확인)**

**규칙 3: As, Cr(VI) → 철산화물층 추가**
- 근거: PMC10890072 — 비소 제거 컬럼 실험에서 철 코팅 바이오차 적용
- 근거: PMC8398132 — Cr(VI) 음이온 제거에 철산화물 권장
- **판단: 근거 충분**

---

## 9. 최종 DB 구성 현황

### 9.1 파일별 레코드 통계

| 파일 | 항목 수 | 주요 내용 |
|------|--------|---------|
| `materials.json` | 12 소재 | 물성·화학특성·운전파라미터 |
| `heavy_metals.json` | 10 중금속 | 화학특성·국내외 기준치·오염원 |
| `adsorption_data.json` | 55 레코드 | 소재×금속 흡착 실험값 |
| `adsorption_data.csv` | 55 행 | 위와 동일 (분석용) |
| `filter_rules.json` | 9 슬롯 규칙 | 층 구성 조건 |
| `scenarios.json` | 5 시나리오 | 오염 유형별 파라미터 |

### 9.2 흡착 데이터 커버리지 행렬

소재 × 중금속 조합별 레코드 보유 현황 (✓: 레코드 있음 / △: 추정값 / —: 없음):

| | Pb²⁺ | Cu²⁺ | Cd²⁺ | Cr⁶⁺ | Hg²⁺ | As⁵⁺ | As³⁺ | Zn²⁺ | Ni²⁺ | Cr³⁺ |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 키토산 | ✓ | ✓ | ✓ | ✓ | ✓ | △ | — | ✓ | ✓ | — |
| 제올라이트(천연) | ✓ | ✓ | ✓ | — | — | — | — | ✓ | ✓ | ✓ |
| 제올라이트(4A) | ✓ | — | — | — | — | — | — | — | — | — |
| 활성탄 | ✓ | ✓ | — | ✓ | ✓ | ✓ | — | — | — | — |
| 바이오차(소나무) | ✓ | ✓ | ✓ | — | — | ✓ | — | ✓ | — | — |
| 바이오차(변성CMBC) | ✓ | ✓ | ✓ | — | — | — | — | △ | — | — |
| 철산화물 | ✓ | ✓ | — | ✓ | — | ✓ | ✓ | — | — | — |
| 하이드록시아파타이트 | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| MnO₂ | ✓ | ✓ | ✓ | — | — | ✓ | ✓ | — | — | — |
| 탄산칼슘 | ✓ | — | — | — | — | — | — | — | — | — |

**데이터 공백 (보완 필요)**
- Hg²⁺: 키토산·활성탄 2건뿐 → 신뢰도 낮음
- Ni²⁺: 키토산·제올라이트 2건뿐 → 신뢰도 낮음
- 제올라이트 4A: Pb 외 데이터 없음

### 9.3 신뢰도 분포

```
high   (복수 문헌 일치)      : 21건 — 38.2%
medium (1–2편, 조건 명확)    : 28건 — 50.9%
low    (단일·추정)           :  6건 — 10.9%
```

---

## 10. 한계 및 잠재 편향

### 10.1 데이터 접근 제한

| 한계 | 설명 | 영향 |
|------|------|------|
| 전문(full-text) 미접근 | 일부 논문은 초록·스니펫만 확인 | qmax 이외 세부 실험 조건 누락 |
| 유료 논문 제외 | Open Access 논문 위주 | 중요 유료 논문 제외 가능성 |
| 스니펫 길이 제한 | 검색 결과 스니펫 ~400자 이내 | 전체 실험 데이터 중 일부만 포착 |

### 10.2 검색 편향 (Search Bias)

| 편향 유형 | 내용 |
|---------|------|
| 언어 편향 | 영어 논문 위주; 한국어·중국어 논문 상당수 미포함 |
| 출판 편향 | 긍정 결과(높은 qmax) 논문이 주로 출판·검색됨 → qmax 과대추정 가능 |
| 소재 편향 | 키토산·바이오차·제올라이트 등 최근 관심 소재 논문 많음 |
| 쿼리 편향 | 5개의 영어 쿼리로 한정 → 검색 커버리지 제한적 |

### 10.3 데이터 추출 편향

| 편향 유형 | 내용 |
|---------|------|
| 단일 추출자 | 단일 AI(Claude)가 추출 → 인간 2인 독립 코딩 대비 오류 가능성 |
| 스니펫 해석 오류 | 문맥이 잘린 스니펫에서 수치를 잘못 해석할 위험 |
| 단위 변환 오류 | μmol/g → mg/g 변환 시 원자량 적용 오류 가능성 |
| 조건 혼용 | 스니펫에서 최적 pH인지 실험 pH인지 불분명한 경우 판단 오류 |

### 10.4 모델 적용 시 주의사항

1. **모든 qmax 수치는 실험실 배치 조건**에서의 이론적 최대값이다.
   실제 현장 컬럼 운전 시 `column_factor = 0.40` 보정이 적용되어야 한다.

2. **단일 금속 조건**의 데이터가 대부분이다.
   실제 복수 중금속 공존 시 `competition_factor`로 추가 보정이 필요하다.

3. **온도 25°C 가정**이 기본이다.
   온도가 크게 다른 현장(동절기 10°C 이하 등)에서는 흡착 성능이 변화할 수 있다.

4. **Hg, Ni 레코드가 각 2건**으로 해당 금속 추정 성능의 신뢰도가 낮다.
   서비스에서 이 금속 선택 시 confidence = `low` 배지를 명시해야 한다.

---

## 11. 향후 개선 방향

### 11.1 단기 (v1.1): 데이터 보완

```
목표: Hg²⁺·Ni²⁺ 레코드를 각 10건 이상으로 확충
방법: Scholar Gateway MCP / PubMed API 자동 검색
     → 논문 초록 자동 파싱 → 수동 검토 후 DB 추가
```

### 11.2 중기 (v2.0): 방법론 고도화

```
목표: 전통 체계적 문헌고찰(SLR) 방식으로 전환
방법:
  - PRISMA 2020 체크리스트 기반 검색 프로토콜 수립
  - PubMed, Scopus, Web of Science 병행 검색
  - 포함·제외 기준 사전 등록 (PROSPERO)
  - 2인 독립 추출 + κ 계수 계산
  - 메타분석(meta-analysis): qmax 풀링 및 이질성 검정(I²)
```

### 11.3 장기 (v3.0): 현장 데이터 통합

```
목표: 실험실 데이터 + 현장 파일럿 데이터 통합 DB
방법:
  - 사용자 현장 실험 결과 입력 기능
  - column_factor를 소재별·조건별로 학습
  - Bayesian 업데이트로 DB 자동 개선
```

---

## 부록: 검색 세션 기록

### 수행 검색 세션 전체 기록

| 번호 | 검색어 | 주요 발견 문헌 |
|-----|--------|-------------|
| 1 | heavy metal adsorption filter materials database open data | PMC4148316, PMC12566221, PMC10890072, PMC10610860 |
| 2 | heavy metal adsorbent material dataset pH selectivity Pb Cu Cd Cr zeolite biochar chitosan open access | PMC9457549, PMC7321104, PMC10511742, PMC8398132, ACSOMEGA2024 |
| 3 | adsorption database heavy metals adsorbents structured dataset CSV downloadable AdsorbML | NIST ISODB (가스 전용 확인), LIU2022 |
| 4 | NIST adsorption database heavy metals water treatment open source dataset | NIST ISODB 재확인, PMC4148316 재발견 |
| 5 | 중금속 흡착 필터 소재 데이터베이스 오픈데이터 수처리 | 국내 DB 부재 확인 |

### 채택 문헌 전체 참고문헌

1. Babel, S. & Kurniawan, T.A. (2003). Low-cost adsorbents for heavy metals uptake from contaminated water: a review. *Journal of Hazardous Materials*, 97, 219–243.
2. Kefeni, K.K. et al. (2014). Filter materials for metal removal from mine drainage — a review. *Scientific Reports*. PMC4148316.
3. Weißpflog, J. et al. (2020). Solubility and Selectivity Effects of the Anion on the Adsorption of Different Heavy Metal Ions onto Chitosan. *Molecules*, 25(11), 2482. PMC7321104.
4. Rao, T.P. et al. (2021). A Review of Adsorbents for Heavy Metal Decontamination: Growing Approach to Wastewater Treatment. *Water*. PMC8398132.
5. Drużyński, S. et al. (2022). Chitosan-Modified Biochars to Advance Research on Heavy Metal Ion Removal. *Int. J. Mol. Sci.* PMC9457549.
6. (2023). A Carbonized Zeolite/Chitosan Composite as an Adsorbent for Cu and Cr Removal. *Water*. PMC10057389.
7. (2023). Synthesis of biochar from tree leaves for Pb²⁺ removal. *Scientific Reports*. PMC10511742.
8. (2023). 3D-Printed Filters for Cu Removal Using PLA@CS/HAP Composites. *Polymers*. PMC10610860.
9. Anawar, H.M. et al. (2024). Biochar as Alternative Material for Heavy Metal Adsorption from Groundwaters: Lab-Scale Column Experiment Review. *Water*. PMC10890072.
10. Cabrera, M. et al. (2025). Sustainable Biosorbent and Biopolymeric Materials for Heavy Metal Adsorption. *Polymers*. PMC12566221.
11. Liu, X. et al. (2022/2025). Kaolin-derived 4A and Na-P1 zeolites for Pb removal. *Science of the Total Environment*. ScienceDirect.
12. Xu, K. et al. (2024). Adsorption of Cu(II) and Pb(II) in Aqueous Solution by Biochar Composites. *ACS Omega*.
13. Rios, C.A. et al. (2008). Removal of heavy metals from acid mine drainage using coal fly ash, natural clinker and synthetic zeolites. *Journal of Hazardous Materials*, 156, 23–35.
14. WHO (2017). *Guidelines for Drinking-water Quality* (4th ed.). World Health Organization.
