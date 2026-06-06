import { METALS } from "@/lib/constants";
import { metalDisplay, type MetalId } from "@/lib/types";

export default function MetalSelector({
  value,
  onChange,
}: {
  value: MetalId[];
  onChange: (m: MetalId[]) => void;
}) {
  const toggle = (id: MetalId) => {
    onChange(value.includes(id) ? value.filter((m) => m !== id) : [...value, id]);
  };

  return (
    <fieldset>
      <legend className="text-sm font-semibold text-slate-700 mb-2">
        2. 대상 중금속 <span className="font-normal text-slate-400">(1개 이상 선택)</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {METALS.map((m) => {
          const active = value.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.id)}
              aria-pressed={active}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                active
                  ? "border-teal-500 bg-teal-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-teal-300"
              }`}
            >
              {metalDisplay(m.id)}
              <span
                className={`ml-1.5 text-[10px] ${active ? "text-teal-100" : "text-slate-400"}`}
              >
                {m.charge === "anion" ? "음이온" : "양이온"}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
