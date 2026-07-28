# Calorie Checker

[![GitHub repo](https://img.shields.io/badge/GitHub-hknixks%2Fcalorie--checker-181717?style=flat&logo=github&logoColor=white)](https://github.com/hknixks/calorie-checker)

A calorie and macro tracker built around Nigerian and West African food, because most nutrition
apps have never heard of eba, egusi, or ayamase.

Here's the loop: snap a photo of your plate, Gemini figures out what's on it, and each item gets
matched against a local Nigerian food table. You fix anything it got wrong, and it lands in your
daily log with targets worked out from your own body.

## Features

**Profile and targets.** Sex, age, height, weight, activity level, and goal. Your calorie target
comes from the Mifflin-St Jeor equation times an activity multiplier, adjusted for how fast you
want to lose or gain (roughly 1100 kcal/day per kg/week), with a safe floor so it never suggests
something reckless. Protein scales with your bodyweight, fat sits around 27% of calories, and
carbs take whatever's left. You can also just override the number yourself if you'd rather.

**Four ways to log food**

| Path | What it does |
|---|---|
| Scan Meal | Upload a plate, Gemini names the foods and estimates grams. No camera permission needed. |
| Search Foods | Fuzzy search over 131 built-in foods plus anything you've added yourself. |
| Scan Barcode | Type the number or decode it from a photo, looked up through Open Food Facts. |
| Create Custom Food | Enter your own numbers, per 100 g or per serving, and it's saved for next time. |

**Daily tracking.** A calorie ring against your target, macro bars, meals grouped into breakfast,
lunch, dinner, and snacks, and any past day is just a tap away on the day switcher.

**Water.** Tap the glasses or use the plus and minus buttons. The target is suggested from your
weight (35 ml/kg) but you can change it.

**Weight.** One reading per day, a trend line over the last 30, and saving a new reading updates
your profile weight so your calorie target actually keeps up with you.

**Progress and reports.** A 14-day calorie chart against your target, your logging streak, and a
weekly report covering average calories, how many days landed within 10% of target, average water,
weight change, your macro split, and your most-logged foods. The charts are hand-rolled SVG, no
charting library involved.

**Reminders.** Set times and days per meal, delivered as browser notifications.

**Dark mode.** Light, dark, or just follow your system setting.

**Offline support.** A service worker caches the app after your first visit, and the food table
ships inside the app itself, so searching, logging, and every chart keep working with no
connection. Only Gemini and Open Food Facts actually need the network.

## Setup

```bash
npm install
```

Add your free Gemini key to `.env` (it's already created, just fill it in):

```
VITE_GEMINI_API_KEY=your_key_here
```

You can get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Then:

```bash
npm run dev
```

Open http://localhost:5178 and set up your profile first, under Settings.

**Vite only reads `.env` at startup**, so after editing it, stop the dev server and start it again.
The Settings tab will tell you whether a key was actually picked up. Without one, everything except
photo recognition still works fine.

### Using it on your phone

```bash
npm run dev -- --host
```

Open the network address it prints (something like `http://192.168.0.5:5178`) on your phone while
it's on the same Wi-Fi, then add it to your home screen. There's a web manifest, so it opens up
like a real app.

Offline caching and notifications only kick in on a real build (`npm run build && npm run
preview`), not the dev server.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 5178 |
| `npm run build` | Typecheck, then build to `dist/` |
| `npm run preview` | Serve the built `dist/`, useful for testing offline mode |
| `npm run typecheck` | TypeScript only |

## How it's put together

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

There's **no backend** here. Meals, weight, water, and your custom foods all live in
`localStorage`, and the browser talks to Gemini and Open Food Facts directly.

Logged items keep their own copy of the nutrition numbers, so editing or deleting a food later
never rewrites days you've already recorded.

Worth knowing: since the key lives in `.env`, Vite inlines it into the built JavaScript, so anyone
who can load the built site can technically read it. That's fine for your own machine or phone.
If you ever host this publicly for other people, put the Gemini call behind a small server-side
proxy instead.

## Known limits

**Portion size is the weak link, not food recognition.** Always worth checking the grams on
each row.

**Barcode photo decoding needs a browser with `BarcodeDetector`.** Chrome on Android has it,
Windows desktop Chrome generally doesn't. Where it's missing, the button just disables itself and
you type the number instead. Open Food Facts is also crowd-sourced, so plenty of Nigerian products
simply aren't in it yet, in which case just add them as a custom food.

**Reminders only fire while the app is open in a tab.** A web page can't wake itself up after you
close it, real background alarms need a push server or a native app, so treat these as nudges for
when you're already on your phone rather than true alarms.

**Look-alikes still trip it up.** Jollof vs fried rice vs coconut rice, or amala vs any other dark
swallow, can be genuinely hard to tell apart from a photo. Hidden ingredients are invisible too:
oil, butter, stock cubes, the sugar in your zobo.

**Backups matter.** Everything lives in this one browser. Clearing site data wipes it, so use
Profile → Export backup every once in a while. There's no matching import yet, see the roadmap
below.

## Roadmap, or what's not built yet

The genuinely missing pieces, not just polish, roughly in order of how much they'd matter:

- **No import for the backup export.** Settings can export a JSON snapshot, but there's no
  "restore from file" to go with it. Losing the browser's storage today means re-entering
  everything by hand. This is the biggest real gap.
- **No account or cloud sync.** Data lives in one browser's `localStorage` and nowhere else. A
  second device, or the same device after clearing site data, starts completely empty.
- **No automated tests.** Every feature so far has been verified by hand in the browser each
  session, not by a test suite, so nothing's stopping a future change from quietly breaking the
  calorie math or the food matcher.
- **Barcode photo decoding only works where the browser supports `BarcodeDetector`** (Chrome and
  Edge on Android, patchy everywhere else, not Windows desktop Chrome, Firefox, or Safari). A
  JS-based decoder like `@zxing/browser` would make this work everywhere instead of falling back
  to typing the number.
- **No push notifications once the app is closed.** Meal reminders only fire while a tab is open;
  real background reminders need a push server or a native/PWA wrapper.
- **Metric only.** No lbs/oz or ft/in option for weight and height.
- **One profile per device.** No switching between household members' logs.
- **The food table is a compiled estimate, not lab-measured food**, see "About the numbers" below.
  Coverage could keep growing too: more regional dishes, more Nigerian-brand barcodes as a fallback
  when Open Food Facts comes up empty.
- **No formal accessibility pass** beyond what came up naturally along the way (focus states,
  reduced-motion support, contrast-checked charts). No real screen-reader testing has happened yet.

## About the numbers

These values are **compiled estimates**, not readings pulled from a live nutrition API:

- Ingredient figures follow standard composition tables (FAO/INFOODS West African FCT 2019, USDA
  ranges).
- Composite dishes like jollof, egusi, ayamase, and moi moi are calculated from typical home
  recipes.
- Soups and stews include their cooking oil, which is where most of their calories actually live.
  A table listing only the dry ingredients would badly under-count something like egusi.

Assume roughly **±20%**. A buka portion isn't a home portion, palm oil varies a lot from cook to
cook, and a photo can't show you the oil sitting at the bottom of the bowl.

This is meant to be a food diary, not a medical or dietary tool, and definitely not advice. Talk
to a doctor or dietitian before making any big changes, especially if you're pregnant, diabetic,
or managing a health condition.

Adding a new food just means one entry in `src/data/foods.ts`: its `per100g` numbers, a few
`servings`, and any `aliases` you'd expect the AI to call it.
