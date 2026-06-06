"use client";

import { useMemo, useState } from "react";
import { getRecommendation } from "@/lib/api";
import type { FilterRecommendation, Level, MetalId, PHRange, Scenario } from "@/lib/types";
import ScenarioSelector from "@/components/input/ScenarioSelector";
import MetalSelector from "@/components/input/MetalSelector";
import LevelSelector from "@/components/input/LevelSelector";
import PHSelector from "@/components/input/PHSelector";
import FilterDiagram from "@/components/result/FilterDiagram";
import LayerList from "@/components/result/LayerList";
import LayerDetail from "@/components/result/LayerDetail";
import WarningBanner from "@/components/result/WarningBanner";
import RemovalTable from "@/components/result/RemovalTable";
import ConfidenceBadge from "@/components/result/ConfidenceBadge";
import Disclaimer from "@/components/result/Disclaimer";

function ResultSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-40 rounded bg-slate-200" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-96 rounded-xl bg-slate-200" />
        <div className="h-96 rounded-xl bg-slate-200" />
      </div>
    </div>
  );
}

export default function Home() {
  const [scenario, setScenario] = useState<Scenario>("industrial");
  const [metals, setMetals] = useState<MetalId[]>(["Pb2+"]);
  const [level, setLevel] = useState<Level>("medium");
  const [phRange, setPhRange] = useState<PHRange>("neutral");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FilterRecommendation | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const selectedLayer = useMemo(
    () => result?.filter_stack.find((l) => l.slot === selectedSlot) ?? null,
    [result, selectedSlot],
  );

  async function analyze() {
    if (metals.length === 0) {
      setError("중금속을 1개 이상 선택해야 합니다.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rec = await getRecommendation({ scenario, metals, level, pH_range: phRange });
      setResult(rec);
      setSelectedSlot(rec.filter_stack[0]?.slot ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <section className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">중금속 흡착 필터 추천</h1>
        <p className="mt-1 text-sm text-slate-500">
          오염 조건을 입력하면 동료심사 문헌 데이터를 기반으로 다층 흡착 필터 구조를 추천하고,
          각 레이어의 과학적 근거를 함께 제시합니다.
        </p>
      </section>

      {/* 입력 폼 */}
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <ScenarioSelector value={scenario} onChange={setScenario} />
        <MetalSelector value={metals} onChange={setMetals} />
        <div className="grid gap-5 sm:grid-cols-2">
          <LevelSelector value={level} onChange={setLevel} />
          <PHSelector value={phRange} onChange={setPhRange} />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={analyze}
            disabled={loading}
            className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? "분석 중…" : "필터 분석하기"}
          </button>
          {metals.length === 0 && (
            <span className="text-xs text-rose-500">중금속을 1개 이상 선택하세요.</span>
          )}
        </div>
      </div>

      {/* 오류 */}
      {error && (
        <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          ⚠️ {error}
        </div>
      )}

      {/* 결과 */}
      <div className="mt-6">
        {loading && <ResultSkeleton />}

        {!loading && result && (
          <div className="space-y-6">
            {/* 경고 (danger/caution 상단, info 하단 접힘은 컴포넌트 내부 처리) */}
            <WarningBanner warnings={result.warnings} />

            <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_1fr]">
              {/* 단면도 + 레이어 목록 */}
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-700">
                  필터 단면도 ({result.filter_stack.length}층)
                </h2>
                <FilterDiagram
                  layers={result.filter_stack}
                  selectedSlot={selectedSlot}
                  onLayerSelect={setSelectedSlot}
                />
                <LayerList
                  layers={result.filter_stack}
                  selectedSlot={selectedSlot}
                  onSelect={setSelectedSlot}
                />
              </div>

              {/* 선택 레이어 상세 */}
              <div className="space-y-4">
                {selectedLayer ? (
                  <LayerDetail layer={selectedLayer} />
                ) : (
                  <p className="text-sm text-slate-500">레이어를 선택하면 상세 정보가 표시됩니다.</p>
                )}
              </div>
            </div>

            {/* 추정 제거율 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">금속별 추정 제거율</h2>
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  종합 신뢰도
                  <ConfidenceBadge level={result.confidence.level} />
                  <span className="font-mono">{result.confidence.score.toFixed(2)}</span>
                </span>
              </div>
              <RemovalTable removal={result.metal_removal} layers={result.filter_stack} />
            </div>

            {/* 설계 파라미터 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">설계 파라미터</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat
                  label="총 두께"
                  value={`${result.design_params.total_thickness_min_cm}–${result.design_params.total_thickness_max_cm} cm`}
                />
                <Stat label="레이어 수" value={`${result.design_params.layer_count}층`} />
                <Stat label="HLR" value={`${result.design_params.HLR_m_h} m/h`} />
                <Stat label="EBCT" value={`${result.design_params.EBCT_min} 분`} />
              </div>
            </div>

            {/* 면책 — 항상 표시 */}
            <Disclaimer text={result.disclaimer} dbVersion={result.db_version} />
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-10 text-center text-sm text-slate-400">
            조건을 입력하고 <span className="font-semibold text-slate-500">필터 분석하기</span>를
            누르면 추천 결과가 여기에 표시됩니다.
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
