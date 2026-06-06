// adsorption_data 의 data_quality 배지.
// 금지사항 #5: estimated 를 "높음"으로 표시하지 않는다.

const MAP: Record<string, { label: string; cls: string }> = {
  high: { label: "high · 높음", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  medium: { label: "medium · 보통", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  low: { label: "low · 낮음", cls: "bg-rose-100 text-rose-800 border-rose-200" },
  estimated: { label: "estimated · 추정", cls: "bg-slate-200 text-slate-600 border-slate-300" },
};

export default function QualityBadge({ quality }: { quality: string }) {
  const m = MAP[quality] ?? MAP.estimated;
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${m.cls}`}
    >
      {m.label}
    </span>
  );
}
