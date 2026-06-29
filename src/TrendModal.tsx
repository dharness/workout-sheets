import { useState, type MouseEvent } from "react";
import type { TrendPoint } from "./sheets";

interface TrendModalProps {
  exercise: string;
  points: TrendPoint[];
  onClose: () => void;
}

const WIDTH = 560;
const HEIGHT = 220;
const PAD = 28;

const UNIT_LABEL: Record<"volume" | "reps", string> = {
  volume: "Volume (lbs × reps, summed across sets)",
  reps: "Total reps (summed across sets)",
};

export function TrendModal({ exercise, points, onClose }: TrendModalProps) {
  // Default to the most recent point so the detail table is always shown —
  // this keeps the modal a constant size instead of resizing on hover.
  const [hoverIndex, setHoverIndex] = useState(points.length - 1);
  const unit = points[points.length - 1]?.unit;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => ({
    x: PAD + (i / (points.length - 1 || 1)) * (WIDTH - PAD * 2),
    y: HEIGHT - PAD - ((p.value - min) / range) * (HEIGHT - PAD * 2),
    ...p,
  }));

  const pathD = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");

  const handleMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    coords.forEach((c, i) => {
      const dist = Math.abs(c.x - relX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  };

  const hovered = coords[hoverIndex];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{exercise}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {unit && <p className="modal-subtitle">{UNIT_LABEL[unit]}</p>}

        {points.length < 2 ? (
          <p className="modal-empty">Not enough history yet.</p>
        ) : (
          <>
            <svg
              className="trend-chart"
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              width="100%"
              height={HEIGHT}
              onMouseMove={handleMove}
              onClick={handleMove}
            >
              <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2" />
              <line
                x1={hovered.x}
                x2={hovered.x}
                y1={PAD / 2}
                y2={HEIGHT - PAD / 2}
                stroke="#cbd5e1"
                strokeDasharray="3 3"
              />
              {coords.map((c, i) => (
                <circle
                  key={i}
                  cx={c.x}
                  cy={c.y}
                  r={i === hoverIndex ? 4.5 : 2.5}
                  fill="#2563eb"
                />
              ))}
            </svg>
            <div className="trend-tooltip">
              <strong>{hovered.label}</strong>
              <table className="trend-detail-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Set 1</th>
                    <th>Set 2</th>
                    <th>Set 3</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>lbs</th>
                    <td>{hovered.sets[0] || "—"}</td>
                    <td>{hovered.sets[2] || "—"}</td>
                    <td>{hovered.sets[4] || "—"}</td>
                  </tr>
                  <tr>
                    <th>reps</th>
                    <td>{hovered.sets[1] || "—"}</td>
                    <td>{hovered.sets[3] || "—"}</td>
                    <td>{hovered.sets[5] || "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
