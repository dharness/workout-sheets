interface SparklineProps {
  values: number[];
  unit?: "volume" | "reps";
  onClick?: () => void;
}

const UNIT_LABEL: Record<"volume" | "reps", string> = {
  volume: "Volume (lbs × reps)",
  reps: "Total reps",
};

const WIDTH = 56;
const HEIGHT = 28;
const PAD = 3;

export function Sparkline({ values, unit, onClick }: SparklineProps) {
  const recent = values.slice(-8);

  if (recent.length < 2) {
    return <div className="sparkline sparkline-empty" />;
  }

  const min = Math.min(...recent);
  const max = Math.max(...recent);
  const range = max - min || 1;

  const point = (v: number, i: number) => {
    const x = PAD + (i / (recent.length - 1)) * (WIDTH - PAD * 2);
    const y = HEIGHT - PAD - ((v - min) / range) * (HEIGHT - PAD * 2);
    return [x, y] as const;
  };

  const points = recent.map((v, i) => point(v, i));
  const path = points.map(([x, y]) => `${x},${y}`).join(" ");
  const [lastX, lastY] = points[points.length - 1];
  const trendingUp = recent[recent.length - 1] >= recent[0];
  const title = unit ? `${UNIT_LABEL[unit]} — click for details` : "View full trend";

  return (
    <button
      type="button"
      className="sparkline-btn"
      onClick={onClick}
      title={title}
    >
      <svg className="sparkline" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT}>
        <polyline
          points={path}
          fill="none"
          stroke={trendingUp ? "#34a853" : "#e69138"}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={lastX} cy={lastY} r="2.25" fill={trendingUp ? "#34a853" : "#e69138"} />
      </svg>
    </button>
  );
}
