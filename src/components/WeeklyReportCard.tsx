import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MACRO_COLORS } from './MacroBars';
import { ChartLegend } from './Charts';
import { shortLabel } from '../lib/dates';
import { roundKcal } from '../lib/nutrition';
import type { WeeklyReport } from '../lib/reports';

/**
 * The macro split is a part-to-whole bar with a legend AND percentages printed on
 * it, so it never depends on colour alone.
 */
export default function WeeklyReportCard({
  report,
  targetKcal,
  weekOffset,
  onWeekChange,
}: {
  report: WeeklyReport;
  targetKcal: number;
  weekOffset: number;
  onWeekChange: (offset: number) => void;
}) {
  const { average, daysLogged } = report;
  const macroKcal = {
    protein: average.protein * 4,
    carbs: average.carbs * 4,
    fat: average.fat * 9,
  };
  const macroTotal = macroKcal.protein + macroKcal.carbs + macroKcal.fat || 1;
  const pct = {
    protein: (macroKcal.protein / macroTotal) * 100,
    carbs: (macroKcal.carbs / macroTotal) * 100,
    fat: (macroKcal.fat / macroTotal) * 100,
  };

  return (
    <div className="card">
      <div className="card-head">
        <h2>Weekly report</h2>
        <div className="btn-row">
          <button
            className="icon-btn"
            onClick={() => onWeekChange(weekOffset - 1)}
            aria-label="Previous week"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <button
            className="icon-btn"
            onClick={() => onWeekChange(weekOffset + 1)}
            disabled={weekOffset >= 0}
            aria-label="Next week"
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>

      <p className="hint">
        {shortLabel(report.start)} – {shortLabel(report.end)} ·{' '}
        {daysLogged === 0
          ? 'nothing logged this week'
          : `${daysLogged} of 7 days logged`}
      </p>

      {daysLogged === 0 ? (
        <p className="empty" style={{ padding: '14px 0 4px' }}>
          Log a few meals and this fills in: averages, days on target and your macro split.
        </p>
      ) : (
        <>
          <div className="report-grid">
            <div className="report-cell">
              <b>{roundKcal(average.kcal)}</b>
              <span>Avg kcal / logged day</span>
            </div>
            <div className="report-cell">
              <b>
                {report.daysOnTarget}
                <span className="denom"> / {daysLogged}</span>
              </b>
              <span>Days within 10% of target</span>
            </div>
            <div className="report-cell">
              <b>{(report.avgWaterMl / 1000).toFixed(1)} L</b>
              <span>Avg water</span>
            </div>
            <div className="report-cell">
              <b>
                {report.weightChange === null
                  ? '—'
                  : `${report.weightChange > 0 ? '+' : ''}${report.weightChange.toFixed(1)}`}
              </b>
              <span>Weight change (kg)</span>
            </div>
          </div>

          <p className="hint" style={{ marginBottom: 6 }}>
            Against a {targetKcal} kcal target: {report.daysUnder} day
            {report.daysUnder === 1 ? '' : 's'} under, {report.daysOver} over.
          </p>

          <h3 className="subhead">Where the calories came from</h3>
          <div className="stacked-bar">
            <div
              style={{ width: `${pct.protein}%`, background: MACRO_COLORS.protein }}
              title={`Protein ${pct.protein.toFixed(0)}%`}
            />
            <div
              style={{ width: `${pct.carbs}%`, background: MACRO_COLORS.carbs }}
              title={`Carbs ${pct.carbs.toFixed(0)}%`}
            />
            <div
              style={{ width: `${pct.fat}%`, background: MACRO_COLORS.fat }}
              title={`Fat ${pct.fat.toFixed(0)}%`}
            />
          </div>
          <ChartLegend
            items={[
              { label: `Protein ${pct.protein.toFixed(0)}% (${Math.round(average.protein)} g)`, color: MACRO_COLORS.protein },
              { label: `Carbs ${pct.carbs.toFixed(0)}% (${Math.round(average.carbs)} g)`, color: MACRO_COLORS.carbs },
              { label: `Fat ${pct.fat.toFixed(0)}% (${Math.round(average.fat)} g)`, color: MACRO_COLORS.fat },
            ]}
          />

          {report.topFoods.length > 0 && (
            <>
              <h3 className="subhead">Most logged</h3>
              {report.topFoods.map((food) => (
                <div className="list-row" key={food.name}>
                  <span className="grow">{food.name}</span>
                  <span className="num">
                    {food.count}×
                  </span>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
