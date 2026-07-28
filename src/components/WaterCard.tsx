import { GlassWater, Minus, Plus } from 'lucide-react';

interface Props {
  ml: number;
  targetMl: number;
  glassMl: number;
  onChange: (ml: number) => void;
}

export default function WaterCard({ ml, targetMl, glassMl, onChange }: Props) {
  const glassCount = Math.max(1, Math.round(targetMl / glassMl));
  const filled = Math.floor(ml / glassMl);
  const pct = targetMl > 0 ? Math.min(100, (ml / targetMl) * 100) : 0;

  return (
    <div className="card">
      <div className="card-head">
        <h2>Water</h2>
        <div className="btn-row">
          <button
            className="icon-btn"
            onClick={() => onChange(Math.max(0, ml - glassMl))}
            disabled={ml <= 0}
            aria-label="Remove one glass"
          >
            <Minus aria-hidden="true" />
          </button>
          <button className="icon-btn" onClick={() => onChange(ml + glassMl)} aria-label="Add one glass">
            <Plus aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="water-row">
        <div className="amount">
          {(ml / 1000).toFixed(2)} L
          <small>
            of {(targetMl / 1000).toFixed(1)} L target · {filled} of {glassCount} glasses
          </small>
        </div>
      </div>

      <div className="bar-track" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="bar-fill" style={{ width: `${pct}%`, background: 'var(--c-water)' }} />
      </div>

      <div className="glasses">
        {Array.from({ length: glassCount }, (_, i) => (
          <button
            key={i}
            className={`glass${i < filled ? ' full' : ''}`}
            // Tapping the glass you are on clears it, so a mis-tap is easy to undo.
            onClick={() => onChange(i + 1 === filled ? i * glassMl : (i + 1) * glassMl)}
            aria-label={`Set water to ${i + 1} glass${i === 0 ? '' : 'es'}`}
          >
            <GlassWater aria-hidden="true" fill={i < filled ? 'currentColor' : 'none'} fillOpacity={0.25} />
          </button>
        ))}
      </div>
    </div>
  );
}
