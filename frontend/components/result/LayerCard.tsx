import { MATERIAL_COLORS, type FilterLayer } from "@/lib/types";

export default function LayerCard({
  layer,
  selected,
  onClick,
}: {
  layer: FilterLayer;
  selected: boolean;
  onClick: () => void;
}) {
  const color = MATERIAL_COLORS[layer.material_id] ?? "#E0E0E0";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition ${
        selected
          ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500"
          : "border-slate-200 bg-white hover:border-teal-300"
      }`}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-xs font-bold text-slate-700"
        style={{ background: color }}
      >
        {layer.slot}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-slate-800">{layer.name_kr}</span>
          {!layer.is_mandatory && (
            <span className="rounded-full bg-teal-100 px-1.5 py-px text-[10px] font-medium text-teal-700">
              조건부
            </span>
          )}
        </span>
        <span className="block truncate text-[11px] text-slate-500">{layer.role}</span>
      </span>
      <span className="shrink-0 text-[11px] text-slate-400">{layer.thickness.recommended_cm}cm</span>
    </button>
  );
}
