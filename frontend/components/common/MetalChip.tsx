import { metalDisplay } from "@/lib/types";

export default function MetalChip({
  metal,
  active = false,
  onClick,
}: {
  metal: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition";
  const cls = active
    ? "bg-teal-600 border-teal-600 text-white"
    : "bg-slate-50 border-slate-300 text-slate-700";
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${base} ${cls} hover:border-teal-400`}>
        {metalDisplay(metal)}
      </button>
    );
  }
  return <span className={`${base} ${cls}`}>{metalDisplay(metal)}</span>;
}
