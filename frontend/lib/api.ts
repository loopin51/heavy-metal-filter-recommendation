import type {
  AdsorptionRecord,
  FilterInput,
  FilterRecommendation,
  HeavyMetal,
  Material,
  ScenarioInfo,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TIMEOUT_MS = 10_000;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    if (!res.ok) {
      let detail = "요청에 실패했습니다.";
      try {
        const err = await res.json();
        detail = err.detail || detail;
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("응답 시간이 초과되었습니다 (10초). 잠시 후 다시 시도해주세요.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export function getRecommendation(input: FilterInput): Promise<FilterRecommendation> {
  return request<FilterRecommendation>("/api/recommend", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export const getMaterials = () => request<Material[]>("/api/materials");
export const getMaterial = (id: string) => request<Material>(`/api/materials/${id}`);
export const getMetals = () => request<HeavyMetal[]>("/api/metals");
export const getScenarios = () => request<ScenarioInfo[]>("/api/scenarios");
export const getAdsorptionRecord = (id: string) =>
  request<AdsorptionRecord>(`/api/adsorption/${id}`);
