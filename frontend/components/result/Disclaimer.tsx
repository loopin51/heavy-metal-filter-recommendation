// 모든 결과 화면 하단에 항상 표시. 숨기거나 접을 수 없음 (금지사항 #4).

export default function Disclaimer({
  text,
  dbVersion,
}: {
  text: string;
  dbVersion: string;
}) {
  return (
    <section
      aria-label="추정치 신뢰성 안내"
      className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4"
    >
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-amber-900">
        ⚠️ 추정치 신뢰성 안내
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-amber-900">{text}</p>
      <p className="mt-3 border-t border-amber-200 pt-2 text-xs text-amber-700">
        데이터 출처: 동료심사 학술 문헌 14편 · DB 버전: {dbVersion} · 마지막 업데이트: 2026-06 ·
        본 서비스는 연구·교육 목적입니다.
      </p>
    </section>
  );
}
