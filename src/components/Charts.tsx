import { useState, type ReactNode } from 'react';

interface Tip {
  x: number;
  y: number;
  text: string;
}

/** Shared hover tooltip. Positioned in % so it tracks the responsive SVG. */
function Tooltip({ tip, vw, vh }: { tip: Tip | null; vw: number; vh: number }) {
  if (!tip) return null;
  return (
    <div
      className="chart-tooltip"
      style={{ left: `${(tip.x / vw) * 100}%`, top: `${(tip.y / vh) * 100}%` }}
    >
      {tip.text}
    </div>
  );
}

function niceMax(value: number): number {
  if (value <= 0) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

export interface BarDatum {
  key: string;
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarDatum[];
  /** Reference line, e.g. the daily calorie target. */
  target?: number;
  targetLabel?: string;
  unit?: string;
  /** Show every nth x label to stop them colliding. */
  labelEvery?: number;
}

const VW = 520;
const VH = 180;
const PAD = { top: 14, right: 10, bottom: 24, left: 38 };

export function BarChart({
  data,
  target,
  targetLabel,
  unit = '',
  labelEvery = 1,
}: BarChartProps) {
  const [tip, setTip] = useState<Tip | null>(null);

  const plotW = VW - PAD.left - PAD.right;
  const plotH = VH - PAD.top - PAD.bottom;
  const baseline = PAD.top + plotH;

  const peak = Math.max(...data.map((d) => d.value), target ?? 0, 1);
  const yMax = niceMax(peak * 1.1);
  const yOf = (v: number) => baseline - (v / yMax) * plotH;

  const slot = plotW / Math.max(data.length, 1);
  // Thin marks: leave a visible gap between neighbouring bars.
  const barW = Math.max(4, Math.min(28, slot * 0.62));

  const gridValues = [0, yMax / 2, yMax];

  return (
    <div className="chart-holder">
      <svg
        className="chart"
        viewBox={`0 0 ${VW} ${VH}`}
        role="img"
        aria-label={`Bar chart of ${data.length} days`}
      >
        {gridValues.map((v) => (
          <g key={v}>
            <line
              className={v === 0 ? 'axis-line' : 'grid-line'}
              x1={PAD.left}
              x2={VW - PAD.right}
              y1={yOf(v)}
              y2={yOf(v)}
            />
            <text className="tick" x={PAD.left - 6} y={yOf(v) + 3.5} textAnchor="end">
              {Math.round(v)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const cx = PAD.left + slot * i + slot / 2;
          const h = d.value > 0 ? Math.max(2, baseline - yOf(d.value)) : 0;
          return (
            <g key={d.key}>
              {h > 0 && (
                <rect
                  className="bar"
                  x={cx - barW / 2}
                  y={baseline - h}
                  width={barW}
                  height={h}
                  rx={Math.min(4, barW / 2)}
                  style={{ animationDelay: `${Math.min(i, 24) * 18}ms` }}
                />
              )}
              <rect
                className="bar-hit"
                x={cx - slot / 2}
                y={PAD.top}
                width={slot}
                height={plotH}
                onMouseEnter={() =>
                  setTip({
                    x: cx,
                    y: h > 0 ? baseline - h : baseline,
                    text: `${d.label}: ${Math.round(d.value)}${unit}`,
                  })
                }
                onMouseLeave={() => setTip(null)}
              />
              {i % labelEvery === 0 && (
                <text className="tick" x={cx} y={VH - 8} textAnchor="middle">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}

        {target !== undefined && target > 0 && (
          <>
            <line
              className="target-line"
              x1={PAD.left}
              x2={VW - PAD.right}
              y1={yOf(target)}
              y2={yOf(target)}
            />
            <text
              className="target-label"
              x={VW - PAD.right}
              y={yOf(target) - 5}
              textAnchor="end"
            >
              {targetLabel ?? `Target ${Math.round(target)}`}
            </text>
          </>
        )}
      </svg>
      <Tooltip tip={tip} vw={VW} vh={VH} />
    </div>
  );
}

export interface PointDatum {
  key: string;
  label: string;
  value: number;
}

/** Single-series trend line. No legend by design — the card title names it. */
export function LineChart({
  data,
  unit = '',
  labelEvery = 1,
}: {
  data: PointDatum[];
  unit?: string;
  labelEvery?: number;
}) {
  const [tip, setTip] = useState<Tip | null>(null);

  const plotW = VW - PAD.left - PAD.right;
  const plotH = VH - PAD.top - PAD.bottom;
  const baseline = PAD.top + plotH;

  const values = data.map((d) => d.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  // Weight moves in small steps, so pad the scale instead of starting at zero.
  const span = Math.max(rawMax - rawMin, 2);
  const min = rawMin - span * 0.25;
  const max = rawMax + span * 0.25;

  const xOf = (i: number) =>
    data.length === 1 ? PAD.left + plotW / 2 : PAD.left + (i / (data.length - 1)) * plotW;
  const yOf = (v: number) => baseline - ((v - min) / (max - min)) * plotH;

  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(i)},${yOf(d.value)}`).join(' ');
  const last = data[data.length - 1];

  return (
    <div className="chart-holder">
      <svg
        className="chart"
        viewBox={`0 0 ${VW} ${VH}`}
        role="img"
        aria-label={`Trend line with ${data.length} readings`}
      >
        {[min, (min + max) / 2, max].map((v, i) => (
          <g key={i}>
            <line
              className="grid-line"
              x1={PAD.left}
              x2={VW - PAD.right}
              y1={yOf(v)}
              y2={yOf(v)}
            />
            <text className="tick" x={PAD.left - 6} y={yOf(v) + 3.5} textAnchor="end">
              {v.toFixed(1)}
            </text>
          </g>
        ))}

        <path className="series-line" d={path} />

        {data.map((d, i) => (
          <g key={d.key}>
            <circle
              className="point"
              cx={xOf(i)}
              cy={yOf(d.value)}
              r={4}
              style={{ animationDelay: `${300 + i * 30}ms` }}
            />
            <circle
              cx={xOf(i)}
              cy={yOf(d.value)}
              r={14}
              fill="transparent"
              onMouseEnter={() =>
                setTip({
                  x: xOf(i),
                  y: yOf(d.value),
                  text: `${d.label}: ${d.value.toFixed(1)}${unit}`,
                })
              }
              onMouseLeave={() => setTip(null)}
            />
            {i % labelEvery === 0 && (
              <text className="tick" x={xOf(i)} y={VH - 8} textAnchor="middle">
                {d.label}
              </text>
            )}
          </g>
        ))}

        {last && (
          <text
            className="value-label"
            x={Math.min(xOf(data.length - 1) + 8, VW - 4)}
            y={yOf(last.value) - 8}
            textAnchor="end"
          >
            {last.value.toFixed(1)}
            {unit}
          </text>
        )}
      </svg>
      <Tooltip tip={tip} vw={VW} vh={VH} />
    </div>
  );
}

export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="chart-legend">
      {items.map((item) => (
        <span key={item.label}>
          <i style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function ChartFrame({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="card">
      <div className="card-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}
