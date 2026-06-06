"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getMaterials } from "@/lib/api";
import { materialRoleClass, TYPE_LABEL } from "@/lib/constants";
import { MATERIAL_COLORS, type Material } from "@/lib/types";
import MetalChip from "@/components/common/MetalChip";

type Tab = "all" | "mandatory" | "conditional" | "type";

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  useEffect(() => {
    getMaterials()
      .then(setMaterials)
      .catch((e) => setError(e instanceof Error ? e.message : "불러오기 실패"))
      .finally(() => setLoading(false));
  }, []);

  const types = useMemo(
    () => Array.from(new Set(materials.map((m) => m.type))),
    [materials],
  );

  const filtered = useMemo(() => {
    return materials.filter((m) => {
      if (tab === "mandatory") return materialRoleClass(m.id) === "mandatory";
      if (tab === "conditional") return materialRoleClass(m.id) === "conditional";
      if (tab === "type" && typeFilter) return m.type === typeFilter;
      return true;
    });
  }, [materials, tab, typeFilter]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-bold text-slate-900">소재 사전</h1>
      <p className="mt-1 text-sm text-slate-500">
        흡착 필터에 사용되는 소재 {materials.length || 12}종의 물성·역할·적합 중금속 정보입니다.
      </p>

      {/* 탭 */}
      <div className="mt-4 flex flex-wrap gap-2">
        {([
          ["all", "전체"],
          ["mandatory", "필수층"],
          ["conditional", "조건부층"],
          ["type", "유형별"],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              tab === id
                ? "bg-teal-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:border-teal-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 유형 서브필터 */}
      {tab === "type" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {types.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`rounded-md px-2.5 py-1 text-xs transition ${
                typeFilter === t
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {TYPE_LABEL[t] ?? t}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-6 text-sm text-rose-600">⚠️ {error} (백엔드 실행 여부를 확인하세요.)</p>}
      {loading && <p className="mt-6 text-sm text-slate-400">불러오는 중…</p>}

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => {
          const role = materialRoleClass(m.id);
          return (
            <Link
              key={m.id}
              href={`/materials/${m.id}`}
              className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300 hover:shadow"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-4 w-4 rounded"
                  style={{ background: MATERIAL_COLORS[m.id] ?? "#E0E0E0" }}
                  aria-hidden
                />
                <h2 className="font-semibold text-slate-800 group-hover:text-teal-700">
                  {m.name_kr}
                </h2>
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    role === "mandatory"
                      ? "bg-slate-200 text-slate-600"
                      : role === "conditional"
                        ? "bg-teal-100 text-teal-700"
                        : "bg-violet-100 text-violet-700"
                  }`}
                >
                  {role === "mandatory" ? "필수" : role === "conditional" ? "조건부" : "옵션"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">{m.name_en}</p>
              <p className="mt-2 text-sm text-slate-600">{m.layer_function}</p>
              {m.target_metals.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {m.target_metals.slice(0, 6).map((mt) => (
                    <MetalChip key={mt} metal={mt} />
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
