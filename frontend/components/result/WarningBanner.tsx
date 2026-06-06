"use client";

import { useState } from "react";
import type { Severity, WarningItem } from "@/lib/types";

const STYLE: Record<Severity, { bg: string; border: string; icon: string; title: string }> = {
  info: { bg: "bg-sky-50", border: "border-sky-200", icon: "ℹ️", title: "text-sky-800" },
  caution: { bg: "bg-amber-50", border: "border-amber-200", icon: "⚠️", title: "text-amber-800" },
  danger: { bg: "bg-rose-50", border: "border-rose-300", icon: "🚨", title: "text-rose-800" },
};

function Banner({ w }: { w: WarningItem }) {
  const s = STYLE[w.severity] ?? STYLE.info;
  return (
    <div className={`rounded-lg border ${s.bg} ${s.border} p-3`}>
      <div className="flex gap-2">
        <span aria-hidden className="text-base leading-none">
          {s.icon}
        </span>
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${s.title}`}>
            {w.message}
            <span className="ml-1.5 rounded bg-white/60 px-1 py-px font-mono text-[10px] text-slate-500">
              {w.code}
            </span>
          </p>
          {w.action && <p className="mt-0.5 text-xs text-slate-600">조치: {w.action}</p>}
        </div>
      </div>
    </div>
  );
}

export default function WarningBanner({ warnings }: { warnings: WarningItem[] }) {
  const [open, setOpen] = useState(false);
  const danger = warnings.filter((w) => w.severity === "danger");
  const caution = warnings.filter((w) => w.severity === "caution");
  const info = warnings.filter((w) => w.severity === "info");

  return (
    <div className="space-y-2">
      {/* danger: 최상단 고정 */}
      {danger.map((w) => (
        <Banner key={w.code} w={w} />
      ))}
      {caution.map((w) => (
        <Banner key={w.code} w={w} />
      ))}

      {/* info: 접힘 → 클릭 시 확장 */}
      {info.length > 0 && (
        <div className="rounded-lg border border-sky-200 bg-sky-50">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-sky-800"
          >
            <span>ℹ️ 참고 안내 {info.length}건</span>
            <span className="text-xs">{open ? "접기 ▲" : "펼치기 ▼"}</span>
          </button>
          {open && (
            <div className="space-y-2 px-3 pb-3">
              {info.map((w) => (
                <Banner key={w.code} w={w} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
