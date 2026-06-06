import type { Confidence } from "@/lib/types";

const MAP: Record<Confidence, { icon: string; label: string; cls: string }> = {
  high: { icon: "🟢", label: "높음", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  medium: { icon: "🟡", label: "보통", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  low: { icon: "🔴", label: "낮음", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

export default function ConfidenceBadge({
  level,
  withLabel = true,
}: {
  level: Confidence;
  withLabel?: boolean;
}) {
  const m = MAP[level] ?? MAP.low;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${m.cls}`}
    >
      <span aria-hidden>{m.icon}</span>
      {withLabel && m.label}
    </span>
  );
}
