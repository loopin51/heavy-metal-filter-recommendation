import type { Level, MetalId, PHRange, Scenario } from "./types";

export const SCENARIOS: { id: Scenario; label: string; desc: string; icon: string }[] = [
  { id: "industrial", label: "산업 폐수", desc: "도금·염색·제련·반도체 공정", icon: "🏭" },
  { id: "mining", label: "광산 배수 (AMD)", desc: "산성 광산 배수·광미 침출수", icon: "⛏️" },
  { id: "agricultural", label: "농업용수", desc: "농약·비료 잔류, 관개수", icon: "🌱" },
  { id: "groundwater", label: "지하수", desc: "자연 용출·매립 침출", icon: "💧" },
  { id: "urban", label: "도시 비점오염", desc: "도로·주차장·지붕 유출수", icon: "🏙️" },
];

export const METALS: { id: MetalId; charge: "cation" | "anion" }[] = [
  { id: "Pb2+", charge: "cation" },
  { id: "Cu2+", charge: "cation" },
  { id: "Cd2+", charge: "cation" },
  { id: "Cr3+", charge: "cation" },
  { id: "Cr6+", charge: "anion" },
  { id: "Hg2+", charge: "cation" },
  { id: "As3+", charge: "anion" },
  { id: "As5+", charge: "anion" },
  { id: "Zn2+", charge: "cation" },
  { id: "Ni2+", charge: "cation" },
];

export const LEVELS: { id: Level; label: string; desc: string }[] = [
  { id: "low", label: "낮음", desc: "< 5 mg/L · 음용수·경미한 오염" },
  { id: "medium", label: "보통", desc: "5–100 mg/L · 비점·경미한 산업폐수" },
  { id: "high", label: "높음", desc: "> 100 mg/L · 산업·광산 고농도" },
];

export const PH_RANGES: { id: PHRange; label: string; desc: string }[] = [
  { id: "acidic", label: "산성", desc: "pH < 5" },
  { id: "neutral", label: "중성", desc: "pH 5–7" },
  { id: "alkaline", label: "염기성", desc: "pH > 8" },
];

export const SCENARIO_LABEL: Record<Scenario, string> = Object.fromEntries(
  SCENARIOS.map((s) => [s.id, s.label]),
) as Record<Scenario, string>;

// 슬롯 템플릿 기준 분류 (filter_rules.json base_layer_order)
export const MANDATORY_MATERIALS = ["sand", "zeolite_natural", "activated_carbon", "gravel"];
export const CONDITIONAL_MATERIALS = [
  "calcium_carbonate",
  "mno2",
  "iron_oxide",
  "chitosan",
  "biochar_modified",
];

export function materialRoleClass(id: string): "mandatory" | "conditional" | "optional" {
  if (MANDATORY_MATERIALS.includes(id)) return "mandatory";
  if (CONDITIONAL_MATERIALS.includes(id)) return "conditional";
  return "optional";
}

export const TYPE_LABEL: Record<string, string> = {
  inorganic_mineral: "무기 광물",
  inorganic_oxide: "무기 산화물",
  carbon_based: "탄소계",
  bio_based_polymer: "바이오 고분자",
};
