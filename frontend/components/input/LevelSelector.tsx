import { LEVELS } from "@/lib/constants";
import type { Level } from "@/lib/types";

export default function LevelSelector({
  value,
  onChange,
}: {
  value: Level;
  onChange: (l: Level) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-slate-700 mb-2">3. 오염도</legend>
      <div className="grid grid-cols-3 gap-2">
        {LEVELS.map((l) => {
          const active = value === l.id;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => onChange(l.id)}
              aria-pressed={active}
              className={`rounded-lg border p-3 text-left transition ${
                active
                  ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500"
                  : "border-slate-200 bg-white hover:border-teal-300"
              }`}
            >
              <span className="text-sm font-semibold text-slate-800">{l.label}</span>
              <span className="block text-[11px] text-slate-500 leading-tight">{l.desc}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
