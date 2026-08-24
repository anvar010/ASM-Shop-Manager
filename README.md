# ASM — Shop Manager

A shop management dashboard: daily bills, expenses, stock counts and reports.
Built mobile- and tablet-first, with a bottom tab bar at **every** breakpoint —
including desktop, where it stays a bottom bar rather than becoming a sidebar.

Next.js 16.3 (App Router) · React 19 · TypeScript · CSS Modules. No UI library.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

```bash
npm run build && npm start   # production build
```

Node 20.9+ is required by Next 16. The first `npm install` and `npm run build`
need network access, because the two webfonts are fetched and self-hosted at
build time by `next/font`.

## The five tabs

| Tab | What it does |
| --- | --- |
| **Home** | Earnings with a Today/Week/Month toggle and trend chart, profit (sales − expenses), cash in drawer, bills entered, category split, recent bills, and a restocking list. Three quick-action buttons jump straight into the entry forms. |
| **Bills** | Fast repeat entry of the day's sales. A date strip covers the last 7 days — each card shows that day's total, so you can often read what you need without opening it. Past days are read-only. |
| **Expenses** | The money-out side: supplier payments, rent, electricity, wages, transport. Feeds the profit figure on Home. |
| **Stock** | Per-product quantity steppers, search, a low-stock filter, and a form to add new products with their own alert threshold. |
| **Reports** | Week total, daily average, bill count, a weekly bar chart and a category ranking. |

## How it responds

One app, three layouts, driven by CSS Modules and media queries:

- **Mobile** (base) — single column. The amount field uses the phone's own
  numeric keyboard, and a floating **+** button opens and closes the entry forms.
- **Tablet** (`≥768px`) — two columns; entry forms are always visible, so the
  floating button retires. An on-screen number pad replaces the native keyboard.
- **Desktop** (`≥1280px`) — wider multi-column dashboards. The bill form splits
  into keypad on the left, fields on the right, so it stays short enough to fit
  a laptop screen without scrolling.

Every tappable control clears the 44px minimum touch target on phones.

## Where things live

```
app/
  layout.tsx        fonts (Manrope + Space Grotesk), metadata, viewport
  globals.css       design tokens — colours, radii, shadows, nav height
  page.tsx          renders <ShopApp />
components/
  ShopApp.tsx       header, tab switching, bottom nav, floating button
  HomeTab.tsx  BillsTab.tsx  ExpensesTab.tsx  StockTab.tsx  ReportsTab.tsx
  Icons.tsx         inline stroke icons on a 24px grid
  shared.module.css cards, chips, inputs, bars, badges, chart, empty states
lib/
  useShop.ts        all state and actions, in one hook
  seed.ts           sample bills, expenses, products, and the date helpers
  periods.ts        today/week/month totals, trends and comparisons
  constants.ts      categories, payment modes, units
  format.ts         Indian currency and date formatting
  types.ts
```

## Two things worth knowing

**The data is sample data, held in memory.** There is no backend, so anything
you enter is lost on refresh. `lib/useShop.ts` is the single place state lives —
swapping `useState` for API calls or a database is the natural next step.

The seeded history covers roughly the last 64 days and is generated from a
deterministic pseudo-random function, so week and month totals are genuine sums
rather than hardcoded numbers, and the comparison figures ("+12% vs yesterday")
are computed. It is shaped to trend gently upward so the screens read well — it
is illustrative, not a forecast.

**Dates and currency are formatted manually**, in `lib/format.ts`, rather than
with `toLocaleString` / `toLocaleDateString`. Those depend on the runtime's ICU
data, which can differ between the Node server and the browser and produce React
hydration mismatches. If you localise this app, that is the file to change.

## Not built yet

Bills record a free-text description rather than a link to a stock item, so
selling something does not decrement its count, and there are no best-seller
figures. Wiring those together is the single change that would remove the most
duplicate data entry.
