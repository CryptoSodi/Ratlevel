const WIDTH = 600;
const HEIGHT = 200;
const PAD = 24;

interface SeriesPoint {
  label: string;
  value: number;
}

/** Lightweight SVG line/area chart — enough for mock analytics without a chart lib. */
export function LineChart({
  points,
  color = "var(--c-primary)",
  formatValue = (value: number) => `${value}`
}: {
  points: SeriesPoint[];
  color?: string;
  formatValue?: (value: number) => string;
}) {
  if (points.length < 2) {
    return <div className="muted">Not enough data yet.</div>;
  }

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const innerW = WIDTH - PAD * 2;
  const innerH = HEIGHT - PAD * 2;

  const coords = points.map((point, index) => ({
    x: PAD + (index / (points.length - 1)) * innerW,
    y: PAD + innerH - ((point.value - min) / range) * innerH
  }));
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const area = `${path} L${(PAD + innerW).toFixed(1)},${HEIGHT - PAD} L${PAD},${HEIGHT - PAD} Z`;
  const last = coords[coords.length - 1];
  const gradientId = `grad-${color.replace(/[^a-z0-9]/gi, "")}`;

  const labelStep = Math.ceil(points.length / 7);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ width: "100%", height: "auto", display: "block" }}
      role="img"
      aria-label={`Trend chart, latest ${formatValue(points[points.length - 1].value)}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.25" />
          <stop offset="1" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <text x={PAD} y={14} fill="var(--c-text-muted)" fontSize="11" fontWeight="700">
        {formatValue(max)}
      </text>
      <text x={PAD} y={HEIGHT - 6} fill="var(--c-text-muted)" fontSize="11" fontWeight="700">
        {formatValue(min)}
      </text>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="4.5" fill={color} stroke="var(--c-surface)" strokeWidth="2" />
      {points.map((point, index) =>
        index % labelStep === 0 ? (
          <text
            key={index}
            x={coords[index].x}
            y={HEIGHT - 6}
            fill="var(--c-text-muted)"
            fontSize="10"
            fontWeight="600"
            textAnchor="middle"
          >
            {index === 0 ? "" : point.label}
          </text>
        ) : null
      )}
    </svg>
  );
}

export function BarChart({
  points,
  color = "var(--c-primary)",
  formatValue = (value: number) => `${value}`
}: {
  points: SeriesPoint[];
  color?: string;
  formatValue?: (value: number) => string;
}) {
  if (points.length === 0) {
    return <div className="muted">No data yet.</div>;
  }

  const max = Math.max(...points.map((point) => point.value), 1);
  const innerW = WIDTH - PAD * 2;
  const innerH = HEIGHT - PAD * 2;
  const slot = innerW / points.length;
  const barW = Math.min(slot * 0.62, 42);
  const labelStep = Math.ceil(points.length / 9);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ width: "100%", height: "auto", display: "block" }}
      role="img"
      aria-label="Bar chart"
    >
      <text x={PAD} y={14} fill="var(--c-text-muted)" fontSize="11" fontWeight="700">
        {formatValue(max)}
      </text>
      {points.map((point, index) => {
        const height = (point.value / max) * innerH;
        const x = PAD + index * slot + (slot - barW) / 2;
        return (
          <g key={index}>
            <rect
              x={x}
              y={PAD + innerH - height}
              width={barW}
              height={Math.max(height, 1)}
              rx={4}
              fill={color}
              opacity={0.9}
            />
            {index % labelStep === 0 && (
              <text
                x={x + barW / 2}
                y={HEIGHT - 6}
                fill="var(--c-text-muted)"
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
              >
                {point.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
