import type {
  AdsorptionRecord,
  FilterInput,
  FilterRecommendation,
  HeavyMetal,
  Material,
  ScenarioInfo,
} from "./types";

// 기본은 빈 문자열 = 같은 출처(상대 경로). 브라우저가 /api/* 를 자기 출처로 호출하면
// Next 서버(next.config.ts rewrites)가 백엔드로 프록시한다. → Tailscale/원격 접속에서도 동작.
// 절대 주소를 쓰고 싶으면 NEXT_PUBLIC_API_URL 로 덮어쓸 수 있다(직접 호출, CORS 필요).
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

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
