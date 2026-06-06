import { SCENARIOS } from "@/lib/constants";
import type { Scenario } from "@/lib/types";

export default function ScenarioSelector({
  value,
  onChange,
}: {
  value: Scenario;
  onChange: (s: Scenario) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-slate-700 mb-2">1. 오염 시나리오</legend>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {SCENARIOS.map((s) => {
          const active = value === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(s.id)}
              aria-pressed={active}
              className={`flex flex-col items-start rounded-lg border p-3 text-left transition ${
                active
                  ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500"
                  : "border-slate-200 bg-white hover:border-teal-300"
              }`}
            >
              <span className="text-xl">{s.icon}</span>
              <span className="mt-1 text-sm font-semibold text-slate-800">{s.label}</span>
              <span className="text-[11px] text-slate-500 leading-tight">{s.desc}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
