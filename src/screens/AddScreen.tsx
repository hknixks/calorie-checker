import {
  Camera,
  ChevronLeft,
  ImageOff,
  Plus,
  ScanBarcode,
  Search,
  SquarePen,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import BarcodePanel from '../components/BarcodePanel';
import CustomFoodForm from '../components/CustomFoodForm';
import FoodPicker from '../components/FoodPicker';
import ItemRow from '../components/ItemRow';
import PromptBanner from '../components/PromptBanner';
import Totals from '../components/Totals';
import UploadPanel from '../components/UploadPanel';
import { dateKey, dayLabel } from '../lib/dates';
import { GEMINI_API_KEY, GEMINI_MODEL, HAS_GEMINI_KEY } from '../lib/env';
import { GeminiError, identifyFoods } from '../lib/gemini';
import { prepareImage, type PreparedImage } from '../lib/image';
import { itemFromDetection, itemFromFood, uid } from '../lib/items';
import { matchFood } from '../lib/match';
import { sumNutrients } from '../lib/nutrition';
import { useStore } from '../lib/store';
import {
  MEAL_SLOTS,
  SLOT_LABELS,
  type DetectedFood,
  type EntrySource,
  type Food,
  type MealItem,
  type MealSlot,
} from '../lib/types';

type Mode = 'photo' | 'search' | 'barcode' | 'custom';
type PickerState = { mode: 'add'; query: string } | { mode: 'swap'; key: string };

const METHODS: { id: Mode; label: string; sub: string; icon: LucideIcon }[] = [
  { id: 'photo', label: 'Scan Meal', sub: 'Snap a photo', icon: Camera },
  { id: 'search', label: 'Search Foods', sub: 'From the food list', icon: Search },
  { id: 'barcode', label: 'Scan Barcode', sub: 'Packaged food', icon: ScanBarcode },
  { id: 'custom', label: 'Create Custom', sub: 'Enter it yourself', icon: SquarePen },
];

export function defaultSlot(date = new Date()): MealSlot {
  const hour = date.getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  if (hour < 22) return 'dinner';
  return 'snack';
}

interface Props {
  initialSlot: MealSlot;
  onSaved: (date: string) => void;
}

export default function AddScreen({ initialSlot, onSaved }: Props) {
  const { foods, dispatch } = useStore();

  const [mode, setMode] = useState<Mode | null>(null);
  const [slot, setSlot] = useState<MealSlot>(initialSlot);
  const [date, setDate] = useState(dateKey());

  const [image, setImage] = useState<PreparedImage | null>(null);
  const [items, setItems] = useState<MealItem[]>([]);
  const [unmatched, setUnmatched] = useState<DetectedFood[]>([]);
  const [status, setStatus] = useState<'idle' | 'preparing' | 'analysing'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerState | null>(null);
  const [usedPhoto, setUsedPhoto] = useState(false);
  const [usedBarcode, setUsedBarcode] = useState(false);
  const [usedCustom, setUsedCustom] = useState(false);

  const totals = useMemo(() => sumNutrients(items), [items]);
  const busy = status !== 'idle';

  const analyse = useCallback(
    async (target: PreparedImage) => {
      setError(null);
      setSaved(null);
      setStatus('analysing');
      try {
        const detected = await identifyFoods({
          base64: target.base64,
          mimeType: target.mimeType,
          apiKey: GEMINI_API_KEY,
          model: GEMINI_MODEL,
        });

        if (!detected.length) {
          setUnmatched([]);
          setError(
            'No food was recognised in that photo. Try a clearer, closer shot, or add it another way.',
          );
          return;
        }

        const rows: MealItem[] = [];
        const misses: DetectedFood[] = [];
        for (const d of detected) {
          const match = matchFood(d.name, foods);
          if (match) rows.push(itemFromDetection(d, match.food));
          else misses.push(d);
        }
        // Replace anything from a previous analysis, keep nothing stale.
        setItems(rows);
        setUnmatched(misses);
        setUsedPhoto(true);
      } catch (err) {
        setUnmatched([]);
        setError(
          err instanceof GeminiError ? err.message : 'Something went wrong analysing that photo.',
        );
      } finally {
        setStatus('idle');
      }
    },
    [foods],
  );

  async function handlePick(file: File) {
    setError(null);
    setSaved(null);
    setStatus('preparing');
    try {
      const prepared = await prepareImage(file);
      setImage(prepared);
      setItems([]);
      setUnmatched([]);
      setStatus('idle');
      if (HAS_GEMINI_KEY) void analyse(prepared);
    } catch (err) {
      setStatus('idle');
      setError(err instanceof Error ? err.message : 'Could not read that image.');
    }
  }

  function addFood(food: Food) {
    setItems((prev) => [...prev, itemFromFood(food)]);
    setSaved(null);
  }

  function handlePicked(food: Food) {
    if (!picker) return;
    if (picker.mode === 'add') {
      addFood(food);
      setUnmatched((prev) =>
        prev.filter((d) => d.name.toLowerCase() !== picker.query.toLowerCase()),
      );
    } else {
      setItems((prev) =>
        prev.map((i) =>
          i.key === picker.key
            ? { ...itemFromFood(food), key: i.key, detectedAs: i.detectedAs }
            : i,
        ),
      );
    }
    setPicker(null);
  }

  function source(): EntrySource {
    if (usedPhoto) return 'photo';
    if (usedBarcode) return 'barcode';
    if (usedCustom) return 'custom';
    return 'search';
  }

  function save() {
    if (!items.length) return;
    dispatch({
      type: 'entry/add',
      entry: {
        id: uid(),
        date,
        savedAt: new Date().toISOString(),
        slot,
        items,
        totals,
        imageThumb: image?.thumbUrl,
        source: source(),
      },
    });
    setItems([]);
    setUnmatched([]);
    setImage(null);
    setUsedPhoto(false);
    setUsedBarcode(false);
    setUsedCustom(false);
    setSaved(`Logged to ${SLOT_LABELS[slot].toLowerCase()} on ${dayLabel(date).toLowerCase()}.`);
    onSaved(date);
  }

  const activeMethod = METHODS.find((m) => m.id === mode);

  return (
    <div>
      {!mode ? (
        <div className="section">
          <h2 className="section-title">How would you like to add food?</h2>
          <div className="action-grid">
            {METHODS.map((method) => {
              const Icon = method.icon;
              return (
                <button
                  key={method.id}
                  className="action-card"
                  onClick={() => setMode(method.id)}
                >
                  <span className="action-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <span>
                    <span className="action-title">{method.label}</span>
                    <br />
                    <span className="action-sub">{method.sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <div className="method-bar">
            <button
              className="icon-btn method-back"
              onClick={() => setMode(null)}
              aria-label="Choose a different way to add food"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <span className="method-title">{activeMethod?.label}</span>
          </div>

          {error && (
            <div className="alert alert-error">
              <strong>Could not finish</strong>
              {error}
            </div>
          )}
          {saved && <div className="alert alert-ok">{saved}</div>}

          {mode === 'photo' && (
            <>
              {!HAS_GEMINI_KEY && (
                <PromptBanner icon={ImageOff} title="Photo scanning isn't set up yet">
                  Add food with Search, Barcode or Create Custom instead.
                </PromptBanner>
              )}
              <UploadPanel
                image={image}
                busy={busy}
                busyLabel={status === 'preparing' ? 'Reading photo…' : 'Identifying food…'}
                canAnalyse={HAS_GEMINI_KEY}
                onPick={handlePick}
                onAnalyse={() => image && void analyse(image)}
                onClear={() => {
                  setImage(null);
                  setError(null);
                }}
              />

              {unmatched.length > 0 && (
                <div className="alert alert-info" style={{ marginTop: 14 }}>
                  <strong>Not in the food list</strong>
                  These were spotted but nothing matched. Tap one to pick the closest food:
                  <ul>
                    {unmatched.map((d) => (
                      <li key={d.name}>
                        <button
                          className="link"
                          onClick={() => setPicker({ mode: 'add', query: d.name })}
                        >
                          {d.name}
                        </button>{' '}
                        ({d.portion_description || `${Math.round(d.estimated_grams)} g`})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {mode === 'search' && (
            <div className="card">
              <h2 className="with-hint">Search the food list</h2>
              <p className="hint">
                {foods.length} foods, Nigerian dishes first: swallows, soups, rice, snacks and
                drinks, plus anything you have created.
              </p>
              <button
                className="btn btn-primary btn-block"
                onClick={() => setPicker({ mode: 'add', query: '' })}
              >
                <Search aria-hidden="true" />
                Search foods
              </button>
            </div>
          )}

          {mode === 'barcode' && (
            <BarcodePanel
              onFound={(food) => {
                dispatch({ type: 'food/add', food });
                addFood(food);
                setUsedBarcode(true);
              }}
            />
          )}

          {mode === 'custom' && (
            <CustomFoodForm
              onCreate={(food) => {
                dispatch({ type: 'food/add', food });
                addFood(food);
                setUsedCustom(true);
              }}
            />
          )}
        </>
      )}

      {items.length > 0 && <Totals totals={totals} />}

      {items.length > 0 && (
        <div className="card">
          <h2 className="with-hint">This meal ({items.length})</h2>
          <p className="hint">Fix anything wrong: the food, the portion, or the exact grams.</p>

          <div className="items">
            {items.map((item) => (
              <ItemRow
                key={item.key}
                item={item}
                onChange={(next) =>
                  setItems((prev) => prev.map((i) => (i.key === next.key ? next : i)))
                }
                onSwap={() => setPicker({ mode: 'swap', key: item.key })}
                onRemove={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}
              />
            ))}
          </div>

          <div className="form-grid" style={{ marginTop: 'var(--space-4)' }}>
            <div className="form-row">
              <label className="lbl" htmlFor="add-slot">
                Meal
              </label>
              <select
                id="add-slot"
                value={slot}
                onChange={(e) => setSlot(e.target.value as MealSlot)}
              >
                {MEAL_SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {SLOT_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label className="lbl" htmlFor="add-date">
                Day
              </label>
              <input
                id="add-date"
                type="date"
                value={date}
                max={dateKey()}
                onChange={(e) => e.target.value && setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="preview-actions">
            <button className="btn btn-sm" onClick={() => setPicker({ mode: 'add', query: '' })}>
              <Plus aria-hidden="true" />
              Add food
            </button>
            <button className="btn btn-sm btn-primary" onClick={save}>
              Log this meal
            </button>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setItems([]);
                setUnmatched([]);
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {picker && (
        <FoodPicker
          title={picker.mode === 'add' ? 'Add a food' : 'Pick the right food'}
          initialQuery={picker.mode === 'add' ? picker.query : ''}
          onSelect={handlePicked}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
