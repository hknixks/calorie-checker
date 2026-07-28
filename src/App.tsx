import { Flame, House, LineChart, SquarePlus, User } from 'lucide-react';
import { useState } from 'react';
import PromptBanner from './components/PromptBanner';
import AddScreen, { defaultSlot } from './screens/AddScreen';
import ProgressScreen from './screens/ProgressScreen';
import SettingsScreen from './screens/SettingsScreen';
import TodayScreen from './screens/TodayScreen';
import { dateKey, dayLabel, parseDateKey } from './lib/dates';
import { useReminders } from './lib/reminders';
import { StoreProvider, useStore } from './lib/store';
import { useTheme } from './lib/theme';
import { loggingStreak } from './lib/reports';
import type { MealSlot } from './lib/types';

type Tab = 'today' | 'add' | 'progress' | 'settings';

const TABS: { id: Tab; label: string; icon: typeof House }[] = [
  { id: 'today', label: 'Home', icon: House },
  { id: 'add', label: 'Log', icon: SquarePlus },
  { id: 'progress', label: 'Progress', icon: LineChart },
  { id: 'settings', label: 'Profile', icon: User },
];

function fullDateLabel(date: string): string {
  return parseDateKey(date).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function Shell() {
  const { state, entriesByDate } = useStore();
  const [tab, setTab] = useState<Tab>('today');
  const [date, setDate] = useState(dateKey());
  const [slot, setSlot] = useState<MealSlot>(defaultSlot());
  /** Remount AddScreen after a save so it starts from a clean meal. */
  const [addKey, setAddKey] = useState(0);
  const [profileNudgeDismissed, setProfileNudgeDismissed] = useState(false);

  useTheme(state.settings.theme);
  useReminders(state.reminders);

  const streak = loggingStreak(entriesByDate);

  return (
    <div className="app">
      <header className="masthead">
        <p className="eyebrow">{fullDateLabel(date)}</p>
        <div className="masthead-row">
          <h1>{dayLabel(date)}</h1>
          {streak > 1 && (
            <span className="streak-badge">
              <Flame aria-hidden="true" />
              {streak} day streak
            </span>
          )}
        </div>
      </header>

      {!state.profile.configured && !profileNudgeDismissed && tab !== 'settings' && (
        <PromptBanner
          icon={User}
          title="Set up your profile"
          actionLabel="Get started"
          onAction={() => setTab('settings')}
          onDismiss={() => setProfileNudgeDismissed(true)}
        >
          Add your height, weight and goal for accurate targets.
        </PromptBanner>
      )}

      {tab === 'today' && (
        <TodayScreen
          date={date}
          onDateChange={setDate}
          onGoAdd={(nextSlot) => {
            setSlot(nextSlot);
            setTab('add');
          }}
        />
      )}

      {tab === 'add' && (
        <AddScreen
          key={addKey}
          initialSlot={slot}
          onSaved={(savedDate) => {
            setDate(savedDate);
            setAddKey((k) => k + 1);
          }}
        />
      )}

      {tab === 'progress' && <ProgressScreen />}
      {tab === 'settings' && <SettingsScreen />}

      <nav className="tabbar">
        {TABS.map((entry) => {
          const Icon = entry.icon;
          return (
            <button
              key={entry.id}
              onClick={() => setTab(entry.id)}
              aria-current={tab === entry.id ? 'page' : undefined}
            >
              <span className="tab-icon">
                <Icon aria-hidden="true" />
              </span>
              {entry.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
