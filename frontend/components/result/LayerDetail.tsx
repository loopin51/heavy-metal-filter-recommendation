"use client";

import { useEffect, useState } from "react";
import { getAdsorptionRecord } from "@/lib/api";
import { MATERIAL_COLORS, metalDisplay, type AdsorptionRecord, type FilterLayer } from "@/lib/types";
import MetalChip from "@/components/common/MetalChip";
import QualityBadge from "@/components/common/QualityBadge";

// reference_id → 외부 링크 (PMID/PMC/DOI 추정)
function referenceLink(refId: string): string | null {
  const id = refId.trim();
  if (/^PMC\d+$/i.test(id)) return `https://www.ncbi.nlm.nih.gov/pmc/articles/${id}/`;
  if (/^\d{6,}$/.test(id)) return `https://pubmed.ncbi.nlm.nih.gov/${id}/`;
  // 저자-연도 형식은 검색 링크로
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(id)}`;
}

function RecordRow({ id }: { id: string }) {
  const [rec, setRec] = useState<AdsorptionRecord | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    getAdsorptionRecord(id)
      .then((r) => alive && setRec(r))
      .catch(() => alive && setErr(true));
    return () => {
      alive = false;
    };
  }, [id]);

  if (err) return <li className="text-xs text-slate-400">{id} (조회 실패)</li>;
  if (!rec) return <li className="text-xs text-slate-400 animate-pulse">{id} 불러오는 중…</li>;

  const qmax = rec.qmax_mg_g ?? rec.qmax_column_mg_g;
  const link = referenceLink(rec.reference_id);
  return (
    <li className="rounded-md border border-slate-200 bg-white p-2.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono font-semibold text-slate-700">{rec.id}</span>
        <QualityBadge quality={rec.data_quality} />
      </div>
      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-slate-600">
        <span>금속: {metalDisplay(rec.metal_id)}</span>
        <span>제거율: {rec.removal_pct ?? "—"}%</span>
        <span>qmax: {qmax != null ? `${qmax} mg/g` : "—"}</span>
        <span>조건: {rec.conditions}</span>
        <span>최적 pH: {String(rec.pH_opt)}</span>
        <span>
          문헌:{" "}
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 underline"
            >
              {rec.reference_id}
            </a>
          ) : (
            rec.reference_id
          )}
        </span>
      </div>
      {rec.notes && <p className="mt-1 text-[11px] text-slate-500">{rec.notes}</p>}
    </li>
  );
}

export default function LayerDetail({ layer }: { layer: FilterLayer }) {
  const color = MATERIAL_COLORS[layer.material_id] ?? "#E0E0E0";
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      {/* 1. 소재명 */}
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 rounded" style={{ background: color }} aria-hidden />
        <h3 className="text-base font-bold text-slate-800">{layer.name_kr}</h3>
        <span className="text-sm text-slate-400">{layer.name_en}</span>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium ${
            layer.is_mandatory
              ? "bg-slate-200 text-slate-600"
              : "bg-teal-100 text-teal-700"
          }`}
        >
          {layer.is_mandatory ? "필수층" : "조건부층"}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">슬롯 {layer.slot} · {layer.role}</p>

      {layer.trigger && (
        <p className="mt-2 rounded-md bg-teal-50 px-2 py-1 text-xs text-teal-700">
          ⚙️ 활성화 조건: {layer.trigger}
        </p>
      )}

      {/* 2. 반응식 */}
      {layer.reaction_eq && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-600">반응식 / 표면기</p>
          <pre className="reaction-box mt-1 overflow-x-auto rounded-md border border-slate-300 bg-slate-900 px-3 py-2 text-xs text-emerald-200">
            {layer.reaction_eq}
          </pre>
        </div>
      )}

      {/* 3. 상세 설명 */}
      <div className="mt-3">
        <p className="text-xs font-semibold text-slate-600">메커니즘 상세</p>
        <p className="mt-1 text-sm text-slate-700 leading-relaxed">
          {layer.mechanism}. {layer.mechanism_detail}
        </p>
      </div>

      {/* 4. 세부 수치 2×2 */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Detail label="두께" value={`${layer.thickness.min_cm}–${layer.thickness.max_cm}cm (권장 ${layer.thickness.recommended_cm}cm)`} />
        <Detail label="최적 pH" value={layer.optimal_pH} />
        <Detail label="재생 방법" value={layer.regeneration || "—"} />
        <Detail label="대표 qmax" value={layer.qmax_summary || "—"} />
      </div>

      {/* 5. 적합 중금속 */}
      {layer.target_metals.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-600 mb-1">적합 중금속</p>
          <div className="flex flex-wrap gap-1">
            {layer.target_metals.map((m) => (
              <MetalChip key={m} metal={m} />
            ))}
          </div>
        </div>
      )}

      {/* 6. 데이터 근거 (supporting_record_ids) */}
      <div className="mt-3">
        <p className="text-xs font-semibold text-slate-600 mb-1">
          데이터 근거 (adsorption_data.json 레코드)
        </p>
        {layer.supporting_record_ids.length > 0 ? (
          <ul className="space-y-1.5">
            {layer.supporting_record_ids.map((id) => (
              <RecordRow key={id} id={id} />
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-400">
            없음 — 이 레이어는 선택한 금속에 대한 직접 흡착 레코드가 없습니다 (물리적 전처리·지지
            기능).
          </p>
        )}
      </div>

      {/* 7. 참고문헌 */}
      {layer.reference && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-600 mb-1">참고문헌</p>
          <div className="flex flex-wrap gap-1.5">
            {layer.reference.split(",").map((r, i) => {
              const ref = r.trim();
              if (!ref) return null;
              const link = referenceLink(ref);
              return link ? (
                <a
                  key={i}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-teal-600 underline"
                >
                  {ref}
                </a>
              ) : (
                <span
                  key={i}
                  className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-500"
                >
                  {ref}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-slate-700">{value}</p>
    </div>
  );
}
