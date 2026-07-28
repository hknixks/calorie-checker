import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BarChart, ChartFrame, LineChart } from '../components/Charts';
import WeeklyReportCard from '../components/WeeklyReportCard';
import { addDays, dateKey, shortLabel, weekStart } from '../lib/dates';
import { uid } from '../lib/items';
import { useStore } from '../lib/store';
import { daySummaries, loggingStreak, weeklyReport } from '../lib/reports';
import { lastNDays } from '../lib/dates';

const CALORIE_DAYS = 14;

export default function ProgressScreen() {
  const { state, dispatch, targets, entriesByDate } = useStore();
  const [weekOffset, setWeekOffset] = useState(0);
  const [weightInput, setWeightInput] = useState('');
  const [weightDate, setWeightDate] = useState(dateKey());

  const calorieDays = useMemo(() => {
    const dates = lastNDays(CALORIE_DAYS);
    return daySummaries(dates, entriesByDate, state.water).map((day) => ({
      key: day.date,
      label: shortLabel(day.date).replace(' ', ' '),
      value: day.totals.kcal,
    }));
  }, [entriesByDate, state.water]);

  const weightPoints = useMemo(
    () =>
      state.weights
        .slice(-30)
        .map((w) => ({ key: w.id, label: shortLabel(w.date), value: w.kg })),
    [state.weights],
  );

  const report = useMemo(
    () =>
      weeklyReport(
        weekStart(addDays(dateKey(), weekOffset * 7)),
        entriesByDate,
        state.water,
        state.weights,
        targets.kcal,
      ),
    [weekOffset, entriesByDate, state.water, state.weights, targets.kcal],
  );

  const streak = loggingStreak(entriesByDate);
  const latest = state.weights[state.weights.length - 1];
  const first = state.weights[0];
  const totalChange = latest && first && latest.id !== first.id ? latest.kg - first.kg : null;

  function addWeight() {
    const kg = Number(weightInput);
    if (!Number.isFinite(kg) || kg < 30 || kg > 300) return;
    dispatch({ type: 'weight/add', entry: { id: uid(), date: weightDate, kg } });
    // Keep the profile in step so calorie targets follow real weight.
    dispatch({ type: 'profile/set', profile: { ...state.profile, weightKg: kg } });
    setWeightInput('');
  }

  return (
    <div>
      <div className="report-grid">
        <div className="report-cell">
          <b>{streak}</b>
          <span>Day logging streak</span>
        </div>
        <div className="report-cell">
          <b>{state.entries.length}</b>
          <span>Meals logged</span>
        </div>
        <div className="report-cell">
          <b>{latest ? latest.kg.toFixed(1) : '—'}</b>
          <span>Latest weight (kg)</span>
        </div>
        <div className="report-cell">
          <b>
            {totalChange === null
              ? '—'
              : `${totalChange > 0 ? '+' : ''}${totalChange.toFixed(1)}`}
          </b>
          <span>Change since start</span>
        </div>
      </div>

      <ChartFrame title={`Calories, last ${CALORIE_DAYS} days`}>
        <BarChart
          data={calorieDays}
          target={targets.kcal}
          targetLabel={`Target ${targets.kcal}`}
          unit=" kcal"
          labelEvery={2}
        />
        <p className="hint" style={{ marginTop: 10, marginBottom: 0 }}>
          Bars are days you logged; gaps are days you did not. Hover a bar for the total.
        </p>
      </ChartFrame>

      <div className="card">
        <h2 className="with-hint">Weight</h2>
        <p className="hint">
          One reading per day. Logging the same day again replaces it, and saving also updates the
          weight in your profile, so your calorie target keeps up.
        </p>

        <div className="form-grid">
          <div className="form-row">
            <label className="lbl" htmlFor="w-kg">
              Weight (kg)
            </label>
            <input
              id="w-kg"
              type="number"
              min="30"
              max="300"
              step="0.1"
              inputMode="decimal"
              value={weightInput}
              placeholder={latest ? latest.kg.toFixed(1) : '75.0'}
              onChange={(e) => setWeightInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addWeight();
              }}
            />
          </div>
          <div className="form-row">
            <label className="lbl" htmlFor="w-date">
              Day
            </label>
            <input
              id="w-date"
              type="date"
              value={weightDate}
              max={dateKey()}
              onChange={(e) => e.target.value && setWeightDate(e.target.value)}
            />
          </div>
        </div>

        <div className="preview-actions">
          <button className="btn btn-primary btn-sm" onClick={addWeight} disabled={!weightInput}>
            Save weight
          </button>
        </div>

        {weightPoints.length >= 2 ? (
          <div style={{ marginTop: 16 }}>
            <LineChart
              data={weightPoints}
              unit=" kg"
              labelEvery={Math.max(1, Math.ceil(weightPoints.length / 6))}
            />
          </div>
        ) : (
          <p className="empty" style={{ padding: '16px 0 2px' }}>
            {weightPoints.length === 1
              ? 'One reading so far. Add another on a different day to see the trend.'
              : 'No readings yet.'}
          </p>
        )}

        {state.weights.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {[...state.weights]
              .reverse()
              .slice(0, 5)
              .map((w) => (
                <div className="list-row" key={w.id}>
                  <span className="grow dim">{shortLabel(w.date)}</span>
                  <span className="num">{w.kg.toFixed(1)} kg</span>
                  <button
                    className="item-remove"
                    aria-label={`Delete reading from ${w.date}`}
                    onClick={() => dispatch({ type: 'weight/delete', id: w.id })}
                  >
                    <X aria-hidden="true" />
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      <WeeklyReportCard
        report={report}
        targetKcal={targets.kcal}
        weekOffset={weekOffset}
        onWeekChange={setWeekOffset}
      />
    </div>
  );
}
