import { PH_RANGES } from "@/lib/constants";
import type { PHRange } from "@/lib/types";

export default function PHSelector({
  value,
  onChange,
}: {
  value: PHRange;
  onChange: (p: PHRange) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-slate-700 mb-2">4. 유입수 pH</legend>
      <div className="grid grid-cols-3 gap-2">
        {PH_RANGES.map((p) => {
          const active = value === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.id)}
              aria-pressed={active}
              className={`rounded-lg border p-3 text-left transition ${
                active
                  ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500"
                  : "border-slate-200 bg-white hover:border-teal-300"
              }`}
            >
              <span className="text-sm font-semibold text-slate-800">{p.label}</span>
              <span className="block text-[11px] text-slate-500">{p.desc}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
