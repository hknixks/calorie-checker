# Calorie Checker

A calorie and macro tracker built around Nigerian and West African food, because the generic
nutrition apps do not know what eba, egusi or ayamase are.

Photo in → Gemini names the foods → each name is matched against a local Nigerian food table →
you fix anything wrong → it lands in a daily log with targets worked out from your own body.

## Features

**Profile and targets** — sex, age, height, weight, activity level and goal. Calorie target from
the Mifflin-St Jeor equation × an activity multiplier, adjusted for the rate you want to lose or
gain (1 kg/week ≈ 1100 kcal/day), floored at a safe minimum. Protein is set per kg of bodyweight,
fat at ~27% of calories, carbs take the rest. You can override the calorie number outright.

**Four ways to log food**

| Path | What it does |
|---|---|
| Scan Meal | Upload a plate, Gemini names the foods and estimates grams. No camera permission. |
| Search Foods | Fuzzy search over 131 built-in foods plus your own. |
| Scan Barcode | Type the number or decode it from a photo; looked up in Open Food Facts. |
| Create Custom Food | Create a food from per-100 g or per-serving numbers; saved for reuse. |

**Daily tracking** — calorie ring against your target, macro bars, meals grouped into breakfast /
lunch / dinner / snacks, any past day reachable from the day switcher.

**Water** — tap glasses or use ± buttons, with a target suggested from your weight (35 ml/kg).

**Weight** — one reading per day, trend line over the last 30, and saving a reading updates your
profile weight so the calorie target keeps up.

**Progress and reports** — 14-day calorie bar chart against target, logging streak, and a weekly
report: average calories, days within 10% of target, days under/over, average water, weight
change, macro split and most-logged foods. Charts are hand-rolled SVG, no chart library.

**Reminders** — per-meal times and days, delivered as browser notifications.

**Dark mode** — light, dark, or follow the system.

**Offline** — a service worker caches the app after the first visit. The food table is part of the
bundle, so searching, logging and every chart work with no connection. Only Gemini and Open Food
Facts need the network.

## Setup

```bash
npm install
```

Add your free Gemini key to `.env` (already created, just fill it in):

```
VITE_GEMINI_API_KEY=your_key_here
```

Get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Then:

```bash
npm run dev
```

Open http://localhost:5178 and set your profile first, under Settings.

**Vite only reads `.env` at startup** — after editing it, stop the dev server and start it again.
The Settings tab shows whether a key was picked up. Without a key everything except photo
recognition still works.

### Using it on your phone

```bash
npm run dev -- --host
```

Open the printed network address (like `http://192.168.0.5:5178`) on your phone on the same
Wi-Fi, then add it to your home screen — there is a web manifest, so it opens like an app.

Offline caching and notifications only kick in on a real build (`npm run build && npm run
preview`), not the dev server.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 5178 |
| `npm run build` | Typecheck, then build to `dist/` |
| `npm run preview` | Serve the built `dist/` — use this to test offline mode |
| `npm run typecheck` | TypeScript only |

## How it is put together

```
src/
  data/foods.ts          the food table (per 100 g + typical servings + aliases)
  lib/store.tsx          reducer + context, persisted to localStorage
  lib/storage.ts         load/save, plus migration from the v1 history format
  lib/profile.ts         BMR, TDEE, calorie and macro targets
  lib/gemini.ts          Gemini vision call, JSON schema, error mapping
  lib/barcode.ts         BarcodeDetector decoding + Open Food Facts lookup
  lib/match.ts           fuzzy match "1 plate of jollof with chicken" -> food rows
  lib/nutrition.ts       grams -> kcal/macros, totals, ±20% band
  lib/reports.ts         day summaries, weekly report, logging streak
  lib/reminders.ts       notification scheduling while the app is open
  lib/theme.ts           light/dark/system resolution
  screens/               Today, Add, Progress, Settings
  components/            ring, macro bars, water, charts, pickers, forms
public/sw.js             offline cache
```

There is **no backend**. Meals, weight, water and your foods live in `localStorage`; the browser
talks to Gemini and Open Food Facts directly.

Logged items store their own copy of the nutrition numbers, so editing or deleting a food later
never rewrites days you already recorded.

One consequence of keeping the key in `.env`: Vite inlines `VITE_*` values into the built
JavaScript, so anyone who can load the built site can read the key. Fine on your own machine or
phone. If you ever host this publicly, move the Gemini call behind a small server-side proxy.

## Known limits

**Portion size is the weak link**, not food recognition. Check the grams on every row.

**Barcode photo decoding needs a browser with `BarcodeDetector`** — Chrome on Android has it,
Windows desktop Chrome generally does not. Where it is missing the button is disabled and you type
the number instead. Open Food Facts is also crowd-sourced, so many Nigerian products are simply
not in it; make those custom foods.

**Reminders only fire while the app is open in a tab.** A web page cannot wake itself after you
close it — real background alarms need a push server or a native app. Treat them as nudges for
when you are already on your phone.

**Look-alikes get confused** — jollof vs fried rice vs coconut rice; amala vs any dark swallow.
**Hidden ingredients are invisible** — oil, butter, stock cubes, sugar in the zobo.

**Backups matter.** Everything is in this browser. Clearing site data wipes it, so use
Profile → Export backup now and then. There is no matching import yet — see Roadmap below.

## Roadmap — not built yet

Things that are genuinely missing, not just polish, roughly in the order they'd matter most:

- **No import for the backup export.** Settings can export a JSON snapshot, but there is no
  matching "restore from file" — losing the browser's storage today means re-entering everything
  by hand. This is the biggest real gap.
- **No account or cloud sync.** Data lives in one browser's `localStorage` only. A second device,
  or the same device after clearing site data, starts empty.
- **No automated tests.** Every feature so far has been verified by hand in the browser each
  session, not by a test suite. There's nothing stopping a future change from silently breaking
  the calorie math or the food matcher.
- **Barcode photo decoding only works where the browser has `BarcodeDetector`** (Chrome/Edge on
  Android, patchy elsewhere — not Windows desktop Chrome, not Firefox, not Safari). A JS-based
  decoder (e.g. `@zxing/browser`) would make it work everywhere instead of falling back to typing
  the number.
- **No push notifications when the app is closed.** Meal reminders only fire while a tab is open —
  a real background reminder needs a push server or a native/PWA wrapper.
- **Metric only.** No lbs/oz or ft/in option for weight and height.
- **Single profile.** No household/family switching between multiple people's logs on one device.
- **The food table is a compiled estimate**, not lab-measured — see "About the numbers" below.
  Coverage could grow (more regional dishes, more Nigerian-brand barcodes as fallback data when
  Open Food Facts doesn't have them).
- **No formal accessibility pass** beyond what came up organically (focus states, reduced-motion,
  color-contrast-checked charts) — no screen-reader testing has been done.

## About the numbers

Values are **compiled estimates**, not readings from a live nutrition API:

- Ingredient figures follow standard composition tables (FAO/INFOODS West African FCT 2019,
  USDA ranges).
- Composite dishes — jollof, egusi, ayamase, moi moi — are calculated from typical home recipes.
- Soups and stews include their cooking oil, which is where most of their calories live. A table
  listing only dry ingredients would under-count egusi badly.

Assume **±20%**. A buka portion is not a home portion, palm oil varies hugely, and a photo cannot
show the oil at the bottom of the bowl.

This is a food diary, not a medical or dietary tool, and not advice. Talk to a doctor or dietitian
before making big changes — especially if you are pregnant, diabetic, or managing a health
condition.

Adding a food means one entry in `src/data/foods.ts` — `per100g`, some `servings`, and any
`aliases` you would expect the AI to use.
