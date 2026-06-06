import type { FilterLayer } from "@/lib/types";
import LayerCard from "./LayerCard";

export default function LayerList({
  layers,
  selectedSlot,
  onSelect,
}: {
  layers: FilterLayer[];
  selectedSlot: number | null;
  onSelect: (slot: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      {layers.map((l) => (
        <LayerCard
          key={l.slot}
          layer={l}
          selected={selectedSlot === l.slot}
          onClick={() => onSelect(l.slot)}
        />
      ))}
    </div>
  );
}
