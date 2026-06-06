"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getMaterial } from "@/lib/api";
import { TYPE_LABEL } from "@/lib/constants";
import { MATERIAL_COLORS, type Material } from "@/lib/types";
import MetalChip from "@/components/common/MetalChip";

function KV({ data }: { data: Record<string, unknown> }) {
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
      {Object.entries(data).map(([k, v]) => (
        <div key={k} className="flex flex-col rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5">
          <dt className="text-[11px] uppercase tracking-wide text-slate-400">{k}</dt>
          <dd className="text-sm text-slate-700">
            {typeof v === "object" && v !== null
              ? Object.entries(v as Record<string, unknown>)
                  .map(([kk, vv]) => `${kk}: ${vv}`)
                  .join(" · ")
              : Array.isArray(v)
                ? (v as unknown[]).join(", ")
                : String(v)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function MaterialDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [mat, setMat] = useState<Material | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getMaterial(id)
      .then(setMat)
      .catch((e) => setError(e instanceof Error ? e.message : "불러오기 실패"));
  }, [id]);

  if (error)
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-rose-600">⚠️ {error}</p>
        <Link href="/materials" className="mt-3 inline-block text-sm text-teal-600 underline">
          ← 소재 사전으로
        </Link>
      </div>
    );

  if (!mat)
    return <div className="mx-auto max-w-4xl px-4 py-10 text-sm text-slate-400">불러오는 중…</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Link href="/materials" className="text-sm text-teal-600 underline">
        ← 소재 사전
      </Link>

      <div className="mt-3 flex items-center gap-3">
        <span
          className="h-8 w-8 rounded-lg"
          style={{ background: MATERIAL_COLORS[mat.id] ?? "#E0E0E0" }}
          aria-hidden
        />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{mat.name_kr}</h1>
          <p className="text-sm text-slate-400">
            {mat.name_en} · {TYPE_LABEL[mat.type] ?? mat.type}
          </p>
        </div>
      </div>

      <section className="mt-5 space-y-5">
        <Card title="역할">
          <p className="text-sm text-slate-700">{mat.layer_function}</p>
          <p className="mt-1 text-xs text-slate-500">{mat.position_in_filter}</p>
        </Card>

        {mat.target_metals.length > 0 && (
          <Card title="적합 중금속">
            <div className="flex flex-wrap gap-1.5">
              {mat.target_metals.map((m) => (
                <MetalChip key={m} metal={m} />
              ))}
            </div>
          </Card>
        )}

        {mat.adsorption_mechanisms.length > 0 && (
          <Card title="흡착 메커니즘">
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {mat.adsorption_mechanisms.map((m, i) => (
                <li key={i} className="reaction-box text-[13px]">
                  {m}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card title="운전 파라미터">
          <KV data={mat.operational_parameters} />
        </Card>

        <Card title="화학적 특성">
          <KV data={mat.chemical_properties} />
        </Card>

        <Card title="물리적 특성">
          <KV data={mat.physical_properties} />
        </Card>

        {mat.special_notes && (
          <Card title="특이사항">
            <p className="text-sm leading-relaxed text-slate-700">{mat.special_notes}</p>
          </Card>
        )}

        {mat.references.length > 0 && (
          <Card title="참고문헌">
            <ul className="space-y-0.5 text-sm text-slate-600">
              {mat.references.map((r, i) => (
                <li key={i}>· {r}</li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-semibold text-slate-700">{title}</h2>
      {children}
    </div>
  );
}
