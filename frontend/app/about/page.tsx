const REFERENCES: { id: string; cite: string; url?: string }[] = [
  { id: "BABEL2003", cite: "Babel, S. & Kurniawan, T.A. (2003). Low-cost adsorbents for heavy metals uptake from contaminated water. J. Hazard. Mater., 97, 219–243." },
  { id: "RIOS2008", cite: "Rios, C.A. et al. (2008). Removal of heavy metals from AMD using fly ash, natural clinker and synthetic zeolites. J. Hazard. Mater., 156, 23–35." },
  { id: "BAILEY2014", cite: "Bailey, S.E. et al. (2014). A review of potentially low-cost sorbents for heavy metals. Water Res.", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4148316/" },
  { id: "PMC9457549", cite: "Drużyński et al. (2022). Chitosan-Modified Biochars for Pb/Cd/Cu removal. Int. J. Mol. Sci.", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9457549/" },
  { id: "PMC7321104", cite: "Weißpflog et al. (2020). Solubility and Selectivity Effects of Anion on Chitosan Adsorption. Molecules.", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7321104/" },
  { id: "PMC10890072", cite: "Anawar et al. (2024). Biochar as Alternative for Heavy Metal Adsorption from Groundwaters. Water.", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10890072/" },
  { id: "PMC10511742", cite: "Biochar synthesis from tree leaves for Pb²⁺ removal. Sci. Rep.", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10511742/" },
  { id: "PMC10610860", cite: "PLA@CS/HAP 3D-Printed Filters for Cu removal. Polymers.", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10610860/" },
  { id: "PMC8398132", cite: "Rao et al. (2021). A Review of Adsorbents for Heavy Metal Decontamination. Water.", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8398132/" },
  { id: "LIU2022", cite: "Liu et al. (2022). Zeolite-based adsorbents: 4A and Na-P1 for Pb removal. Sci. Total Environ." },
  { id: "PMC4148316", cite: "Kefeni et al. (2014). Filter materials for metal removal from mine drainage — a review. Sci. Rep.", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4148316/" },
  { id: "PMC12566221", cite: "Cabrera et al. (2025). Biosorbent & Biopolymeric Materials for Heavy Metal Adsorption. Polymers.", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12566221/" },
  { id: "ACSOMEGA2024", cite: "Xu et al. (2024). Adsorption of Cu(II) and Pb(II) by Biochar Composites. ACS Omega." },
  { id: "PMC13013057", cite: "Zeolite/Chitosan carbonized composite (C-ZLCH) for Cu/Cr. PMC." , url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10057389/" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-2 text-base font-bold text-slate-800">{title}</h2>
      {children}
    </section>
  );
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">데이터 출처 및 서비스 안내</h1>
        <p className="mt-1 text-sm text-slate-500">
          본 서비스가 어떤 데이터에 근거하며, 어떤 한계를 갖는지 투명하게 공개합니다.
        </p>
      </div>

      <Section title="서비스 목적과 한계">
        <p className="text-sm leading-relaxed text-slate-700">
          이 서비스는 중금속 오염 조건(시나리오·금속·오염도·pH)에 대해 동료심사 학술 문헌에서
          추출한 흡착 데이터를 기반으로 다층 흡착 필터 구조를 추천하는{" "}
          <strong>과학적 근거 기반 추천 시스템</strong>입니다. 추천 결과의 모든 수치는
          데이터베이스 레코드에서 계산되며, 사용자는 각 레이어의 근거 레코드를 직접 확인할 수
          있습니다.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>모든 제거율은 실험실 <strong>배치 조건</strong> 문헌값에 배치→컬럼 보정(×0.40)을 적용한 이론적 추정값입니다.</li>
          <li>실제 현장 성능은 이론값의 50–80% 수준으로 나타날 수 있습니다.</li>
          <li>복수 금속 공존 시 경쟁 흡착 페널티가 적용되나, 실제 선택성을 완전히 반영하지는 못합니다.</li>
          <li>온도 효과·장기 파울링·수리학적 비선형성은 현재 모델에 반영되지 않았습니다.</li>
        </ul>
      </Section>

      <Section title="데이터 수집 방법론 요약">
        <p className="text-sm leading-relaxed text-slate-700">
          본 데이터베이스는 <strong>AI 보조 문헌 기반 데이터 추출</strong> 방식으로 구축되었습니다.
          PubMed/PMC, ScienceDirect, ACS 등에 수록된 리뷰·실험 논문에서 소재 × 중금속 흡착 성능
          데이터를 수동 추출·정규화했습니다.
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          {[
            ["소재", "12종"],
            ["중금속", "10종"],
            ["흡착 레코드", "55건"],
            ["참고문헌", "14편"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
              <p className="text-lg font-bold text-teal-700">{v}</p>
              <p className="text-xs text-slate-500">{k}</p>
            </div>
          ))}
        </dl>
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-700">데이터 신뢰도 등급</p>
          <ul className="mt-1 space-y-0.5">
            <li><b>high</b> — 복수 독립 연구에서 일관된 결과, 인용 50+</li>
            <li><b>medium</b> — 1~2편 논문 기반, 실험 조건 구체적 명시</li>
            <li><b>low</b> — 단일 연구 또는 간접 추정치, 검증 필요</li>
            <li><b>estimated</b> — 유사 소재로부터 추정, 실험 미확인</li>
          </ul>
          <p className="mt-2 text-slate-500">
            ※ 본 작업은 PRISMA 기반 체계적 문헌고찰(SLR)이 아닌 서비스 v1 지식 베이스이며,
            추후 체계적 검증·보완이 필요합니다.
          </p>
        </div>
      </Section>

      <Section title={`참고문헌 (${REFERENCES.length}편)`}>
        <ol className="space-y-2 text-sm text-slate-700">
          {REFERENCES.map((r, i) => (
            <li key={r.id} className="flex gap-2">
              <span className="text-slate-400">{i + 1}.</span>
              <span>
                <span className="font-mono text-xs text-teal-700">[{r.id}]</span>{" "}
                {r.url ? (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-slate-300 hover:text-teal-700"
                  >
                    {r.cite}
                  </a>
                ) : (
                  r.cite
                )}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="버전 정보">
        <p className="text-sm text-slate-600">
          DB 버전 <b>{process.env.NEXT_PUBLIC_DB_VERSION || "1.0"}</b> · 모델 버전 <b>1.0</b> ·
          마지막 업데이트 <b>2026-06</b>
        </p>
        <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-800">
          ⚠️ 이 서비스는 연구·교육 목적입니다. 실제 수처리 시설 설계 전 반드시 파일럿 실험 및
          전문가 검토를 받으시기 바랍니다.
        </p>
      </Section>
    </div>
  );
}
