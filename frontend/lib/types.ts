// 백엔드 모델과 1:1 대응하는 타입 정의

export type Scenario =
  | "industrial"
  | "mining"
  | "agricultural"
  | "groundwater"
  | "urban";

export type MetalId =
  | "Pb2+"
  | "Cu2+"
  | "Cd2+"
  | "Cr3+"
  | "Cr6+"
  | "Hg2+"
  | "As3+"
  | "As5+"
  | "Zn2+"
  | "Ni2+";

export type Level = "low" | "medium" | "high";
export type PHRange = "acidic" | "neutral" | "alkaline";

export interface FilterInput {
  scenario: Scenario;
  metals: MetalId[];
  level: Level;
  pH_range: PHRange;
}

export interface ThicknessRange {
  min_cm: number;
  max_cm: number;
  recommended_cm: number;
}

export interface FilterLayer {
  slot: number;
  material_id: string;
  name_kr: string;
  name_en: string;
  role: string;
  is_mandatory: boolean;
  trigger: string | null;
  mechanism: string;
  reaction_eq: string;
  thickness: ThicknessRange;
  target_metals: string[];
  mechanism_detail: string;
  optimal_pH: string;
  qmax_summary: string;
  regeneration: string;
  supporting_record_ids: string[];
  reference: string;
}

export type Severity = "info" | "caution" | "danger";

export interface WarningItem {
  severity: Severity;
  code: string;
  message: string;
  action: string;
}

export type Confidence = "high" | "medium" | "low";

export interface RemovalEstimate {
  metal: string;
  estimated_pct: number;
  confidence: Confidence;
  confidence_note: string;
  limiting_layer: string | null;
  correction_applied: string;
  supporting_records: string[];
}

export interface DesignParams {
  total_thickness_min_cm: number;
  total_thickness_max_cm: number;
  layer_count: number;
  HLR_m_h: number;
  EBCT_min: number;
}

export interface ConfidenceReport {
  score: number;
  level: Confidence;
  note: string;
}

export interface FilterRecommendation {
  filter_stack: FilterLayer[];
  warnings: WarningItem[];
  metal_removal: Record<string, RemovalEstimate>;
  design_params: DesignParams;
  confidence: ConfidenceReport;
  db_version: string;
  model_version: string;
  disclaimer: string;
}

// 소재 / 중금속 / 시나리오 / 흡착 레코드 (DB 원본 형태 — 필요한 필드만 느슨하게 타이핑)
export interface Material {
  id: string;
  name_kr: string;
  name_en: string;
  type: string;
  sub_type: string;
  layer_function: string;
  position_in_filter: string;
  target_metals: string[];
  adsorption_mechanisms: string[];
  special_notes: string;
  references: string[];
  operational_parameters: Record<string, unknown>;
  chemical_properties: Record<string, unknown>;
  physical_properties: Record<string, unknown>;
}

export interface HeavyMetal {
  id: MetalId;
  name_kr: string;
  name_en: string;
  symbol: string;
  primary_charge: string;
  standards: Record<string, number | string | null>;
  common_sources: string[];
  health_effects: { acute: string; chronic: string; target_organs: string[] };
}

export interface ScenarioInfo {
  id: Scenario;
  label_kr: string;
  label_en: string;
  description: string;
  typical_metals: MetalId[];
  priority_metals: MetalId[];
  recommended_filter_level: Level;
}

export interface AdsorptionRecord {
  id: string;
  material_id: string;
  metal_id: string;
  qmax_mg_g: number | null;
  qmax_column_mg_g: number | null;
  removal_pct: number | null;
  pH_opt: number | string;
  conditions: string;
  data_quality: Confidence | "estimated";
  reference_id: string;
  notes: string;
}

// 소재별 고정 색상 팔레트 (FilterDiagram 등에서 공유)
export const MATERIAL_COLORS: Record<string, string> = {
  calcium_carbonate: "#BBDEFB",
  mno2: "#CE93D8",
  sand: "#FFF176",
  iron_oxide: "#FF8A65",
  zeolite_natural: "#4DB6AC",
  zeolite_4a: "#26A69A",
  activated_carbon: "#78909C",
  chitosan: "#F48FB1",
  biochar_pine: "#A1887F",
  biochar_modified: "#BCAAA4",
  hydroxyapatite: "#90CAF9",
  gravel: "#CFD8DC",
};

// 중금속 표시용 (위첨자)
const SUP: Record<string, string> = { "2+": "²⁺", "3+": "³⁺", "5+": "⁵⁺", "6+": "⁶⁺" };
export function metalDisplay(id: string): string {
  for (const [k, v] of Object.entries(SUP)) {
    if (id.endsWith(k)) return id.slice(0, -k.length) + v;
  }
  return id;
}
