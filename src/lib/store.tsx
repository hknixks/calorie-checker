import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import { FOODS } from '../data/foods';
import { computeTargets } from './profile';
import { type AppState, clearState, EMPTY_STATE, loadState, saveState } from './storage';
import type {
  Food,
  LogEntry,
  Profile,
  Reminder,
  Settings,
  Targets,
  WeightEntry,
} from './types';

export type Action =
  | { type: 'profile/set'; profile: Profile }
  | { type: 'settings/set'; settings: Settings }
  | { type: 'entry/add'; entry: LogEntry }
  | { type: 'entry/update'; entry: LogEntry }
  | { type: 'entry/delete'; id: string }
  | { type: 'weight/add'; entry: WeightEntry }
  | { type: 'weight/delete'; id: string }
  | { type: 'water/set'; date: string; ml: number }
  | { type: 'food/add'; food: Food }
  | { type: 'food/delete'; id: string }
  | { type: 'reminder/upsert'; reminder: Reminder }
  | { type: 'reminder/delete'; id: string }
  | { type: 'state/reset' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'profile/set':
      return { ...state, profile: action.profile };

    case 'settings/set':
      return { ...state, settings: action.settings };

    case 'entry/add':
      return { ...state, entries: [action.entry, ...state.entries] };

    case 'entry/update':
      return {
        ...state,
        entries: state.entries.map((e) => (e.id === action.entry.id ? action.entry : e)),
      };

    case 'entry/delete':
      return { ...state, entries: state.entries.filter((e) => e.id !== action.id) };

    case 'weight/add': {
      // One reading per day: a second entry for the same date replaces the first.
      const rest = state.weights.filter((w) => w.date !== action.entry.date);
      return {
        ...state,
        weights: [...rest, action.entry].sort((a, b) => a.date.localeCompare(b.date)),
      };
    }

    case 'weight/delete':
      return { ...state, weights: state.weights.filter((w) => w.id !== action.id) };

    case 'water/set':
      return {
        ...state,
        water: { ...state.water, [action.date]: Math.max(0, action.ml) },
      };

    case 'food/add':
      return { ...state, customFoods: [action.food, ...state.customFoods] };

    case 'food/delete':
      return {
        ...state,
        customFoods: state.customFoods.filter((f) => f.id !== action.id),
      };

    case 'reminder/upsert': {
      const exists = state.reminders.some((r) => r.id === action.reminder.id);
      return {
        ...state,
        reminders: exists
          ? state.reminders.map((r) => (r.id === action.reminder.id ? action.reminder : r))
          : [...state.reminders, action.reminder],
      };
    }

    case 'reminder/delete':
      return { ...state, reminders: state.reminders.filter((r) => r.id !== action.id) };

    case 'state/reset':
      clearState();
      return { ...EMPTY_STATE, profile: { ...EMPTY_STATE.profile }, reminders: [...EMPTY_STATE.reminders] };

    default:
      return state;
  }
}

interface StoreValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  /** Built-in table plus anything the user created or scanned. */
  foods: Food[];
  targets: Targets;
  entriesByDate: Map<string, LogEntry[]>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const foods = useMemo(
    () => [...state.customFoods, ...FOODS],
    [state.customFoods],
  );

  const targets = useMemo(() => computeTargets(state.profile), [state.profile]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, LogEntry[]>();
    for (const entry of state.entries) {
      const list = map.get(entry.date);
      if (list) list.push(entry);
      else map.set(entry.date, [entry]);
    }
    return map;
  }, [state.entries]);

  const value = useMemo<StoreValue>(
    () => ({ state, dispatch, foods, targets, entriesByDate }),
    [state, foods, targets, entriesByDate],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside StoreProvider');
  return value;
}
