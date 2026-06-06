"use client";

import { MATERIAL_COLORS, type FilterLayer } from "@/lib/types";

const WIDTH = 320;
const PAD_TOP = 38;
const PAD_BOTTOM = 38;
const MIN_H = 34;
const MAX_H = 64;
const GAP = 3;

// recommended 두께를 [MIN_H, MAX_H] 픽셀로 매핑
function bandHeight(rec: number, min: number, max: number): number {
  if (max <= min) return MIN_H;
  const t = Math.max(0, Math.min(1, (rec - min) / (max - min)));
  return MIN_H + t * (MAX_H - MIN_H);
}

export default function FilterDiagram({
  layers,
  selectedSlot,
  onLayerSelect,
}: {
  layers: FilterLayer[];
  selectedSlot: number | null;
  onLayerSelect: (slot: number) => void;
}) {
  const recMin = Math.min(...layers.map((l) => l.thickness.recommended_cm));
  const recMax = Math.max(...layers.map((l) => l.thickness.recommended_cm));

  const bands = layers.map((l) => bandHeight(l.thickness.recommended_cm, recMin, recMax));
  const stackH = bands.reduce((a, b) => a + b + GAP, -GAP);
  const totalH = PAD_TOP + stackH + PAD_BOTTOM;

  // 누적 오프셋으로 각 레이어의 top 위치 계산 (렌더 중 외부 변수 변형 없이)
  const placed = layers.map((l, i) => {
    const top = PAD_TOP + bands.slice(0, i).reduce((a, b) => a + b + GAP, 0);
    return { layer: l, top, h: bands[i] };
  });

  return (
    <svg
      role="img"
      aria-label="추천 필터 수직 단면도"
      viewBox={`0 0 ${WIDTH} ${totalH}`}
      className="w-full h-auto max-w-[360px] mx-auto select-none"
    >
      <title>중금속 흡착 필터 수직 단면도</title>
      <desc>
        유입수가 상단에서 유입되어 {layers.length}개 흡착 레이어를 차례로 통과한 뒤 하단으로
        처리수가 배출됩니다. 점선 테두리는 조건부 레이어, 실선은 필수 레이어입니다. 각 레이어를
        클릭하면 상세 정보를 볼 수 있습니다.
      </desc>

      {/* 유입수 화살표 (위) */}
      <g>
        <line x1={WIDTH / 2} y1={6} x2={WIDTH / 2} y2={PAD_TOP - 8} stroke="#0ea5e9" strokeWidth={2} />
        <polygon
          points={`${WIDTH / 2 - 5},${PAD_TOP - 14} ${WIDTH / 2 + 5},${PAD_TOP - 14} ${WIDTH / 2},${PAD_TOP - 6}`}
          fill="#0ea5e9"
        />
        <text x={WIDTH / 2 + 10} y={20} fontSize={11} fill="#0369a1">
          유입수 (오염수)
        </text>
      </g>

      {placed.map(({ layer, top, h }) => {
        const selected = selectedSlot === layer.slot;
        const fill = MATERIAL_COLORS[layer.material_id] ?? "#E0E0E0";
        return (
          <g
            key={layer.slot}
            onClick={() => onLayerSelect(layer.slot)}
            className="cursor-pointer"
            tabIndex={0}
            role="button"
            aria-label={`슬롯 ${layer.slot}: ${layer.name_kr}${layer.is_mandatory ? " (필수)" : " (조건부)"}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onLayerSelect(layer.slot);
              }
            }}
          >
            <rect
              x={selected ? 14 : 20}
              y={top}
              width={selected ? WIDTH - 28 : WIDTH - 40}
              height={h}
              rx={6}
              fill={fill}
              stroke={selected ? "#0f766e" : "#64748b"}
              strokeWidth={selected ? 3 : 1.2}
              strokeDasharray={layer.is_mandatory ? "0" : "6 4"}
            />
            <text
              x={WIDTH / 2}
              y={top + h / 2 - 2}
              textAnchor="middle"
              fontSize={12}
              fontWeight={600}
              fill="#1e293b"
            >
              {layer.name_kr}
            </text>
            <text
              x={WIDTH / 2}
              y={top + h / 2 + 12}
              textAnchor="middle"
              fontSize={9}
              fill="#475569"
            >
              {layer.thickness.recommended_cm}cm · {layer.is_mandatory ? "필수" : "조건부"}
            </text>
            <text x={26} y={top + 13} fontSize={9} fill="#334155" fontWeight={700}>
              {layer.slot}
            </text>
          </g>
        );
      })}

      {/* 처리수 화살표 (아래) */}
      <g>
        <line
          x1={WIDTH / 2}
          y1={totalH - PAD_BOTTOM + 8}
          x2={WIDTH / 2}
          y2={totalH - 8}
          stroke="#0d9488"
          strokeWidth={2}
        />
        <polygon
          points={`${WIDTH / 2 - 5},${totalH - 14} ${WIDTH / 2 + 5},${totalH - 14} ${WIDTH / 2},${totalH - 4}`}
          fill="#0d9488"
        />
        <text x={WIDTH / 2 + 10} y={totalH - 14} fontSize={11} fill="#0f766e">
          처리수 (정화수)
        </text>
      </g>
    </svg>
  );
}
