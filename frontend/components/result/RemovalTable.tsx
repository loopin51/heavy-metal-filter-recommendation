import { metalDisplay, type FilterLayer, type RemovalEstimate } from "@/lib/types";
import ConfidenceBadge from "./ConfidenceBadge";

export default function RemovalTable({
  removal,
  layers,
}: {
  removal: Record<string, RemovalEstimate>;
  layers: FilterLayer[];
}) {
  const nameOf = (id: string | null) => {
    if (!id) return "—";
    return layers.find((l) => l.material_id === id)?.name_kr ?? id;
  };

  const rows = Object.values(removal);
  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        선택한 금속에 대한 흡착 데이터가 부족하여 제거율을 추정할 수 없습니다. 현장 실험이
        필요합니다.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
            <th className="py-2 pr-3 font-medium">중금속</th>
            <th className="py-2 pr-3 font-medium">추정 제거율</th>
            <th className="py-2 pr-3 font-medium">신뢰도</th>
            <th className="py-2 pr-3 font-medium">보정 내용</th>
            <th className="py-2 font-medium">병목 레이어</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.metal} className="border-b border-slate-100 align-top">
              <td className="py-2.5 pr-3 font-semibold text-slate-800">
                {metalDisplay(r.metal)}
              </td>
              <td className="py-2.5 pr-3">
                <span className="font-semibold text-slate-800">{r.estimated_pct.toFixed(1)}%</span>
              </td>
              <td className="py-2.5 pr-3">
                <div className="flex flex-col gap-1">
                  <ConfidenceBadge level={r.confidence} />
                  {r.confidence_note && (
                    <span className="text-[11px] text-rose-600" title={r.confidence_note}>
                      ⚠️ {r.confidence_note}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-2.5 pr-3 text-xs text-slate-600">
                <span title={r.correction_applied}>{r.correction_applied}</span>
              </td>
              <td className="py-2.5 text-xs text-slate-600">{nameOf(r.limiting_layer)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-slate-400">
        ※ 보정 내용·신뢰도 사유에 마우스를 올리면 전체 설명이 표시됩니다. 모든 수치는 배치→컬럼
        보정과 경쟁 흡착 페널티가 적용된 보수적 추정치입니다.
      </p>
    </div>
  );
}
