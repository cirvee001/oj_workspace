# OJ Clothing — operations

Operations system for a multi-branch tailoring business: orders, the workshop,
fabric control, ready-to-wear stock, staff and clock-in, payroll, marketing and
money. Runs entirely in the browser on seeded demo data.

**Stack:** React 18 · TypeScript (strict) · Vite · Tailwind CSS v4 · React Router · Zustand + Immer · Lucide icons

Black-and-white "Atelier" design, light and dark themes · ⌘K / Ctrl K search · design rules in [docs/DESIGN.md](docs/DESIGN.md)

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
npm run lint
```

Sign in with any demo account on the sign-in screen. Each role sees a different
system. Password sign-in uses a first name (for example `tunde`) and the password `fashion`.

## Project structure

```
src/
├── app/                 Router, root layout, and the app-wide hosts
│   ├── router.tsx         Routes + auth and per-role screen guards
│   ├── SheetHost.tsx      Maps a SheetRef to its sheet component
│   └── PrintHost.tsx      Renders print jobs (badges, poster) and opens print
├── components/
│   ├── ui/              Design-system primitives (Button, Badge, Panel, Table, Sheet…)
│   ├── charts/          Dependency-free SVG charts (line, pill bars, sparklines)
│   └── layout/          AppShell, Sidebar (collapsible rail), Topbar, CommandPalette
├── config/              Constants, role permissions, navigation and URL paths
├── data/seed.ts         Deterministic demo data (a year of trading)
├── features/<name>/     One folder per screen: <Name>Page plus its sheets
├── hooks/               useGo / useOpenTarget (navigation helpers)
├── lib/                 Pure helpers: dates, money formatting, CSV, geo, QR encoder
├── store/
│   ├── appStore.ts      The Zustand + Immer store
│   ├── selectors.ts     Pure read helpers over state
│   ├── derived.ts       Work queues: approvals, notifications, attention, my work
│   ├── actions/         All business rules and state changes, grouped by domain
│   └── ui/              Toast, sheet, dialog and print stores
└── types/domain.ts      The domain model
```

## Conventions

- **Business logic lives in `store/actions`.** Components collect input and call an action.
  The actions validate, update state, write the activity log and show the toast.
  The rules are there: the deposit-before-cutting rule, separation of duties
  (you cannot approve your own request), and fabric accountability.
- **Reads go through `store/selectors`.** These are pure functions of state, so they work the
  same in components and in actions.
- **Sheets are opened by data, not JSX.** `openSheet({ type: 'order', id })` works from anywhere:
  a page, a notification or a search result.
- **No `window.prompt` or `window.confirm`.** Use `promptDialog` and `confirmDialog`, which return promises.
- **Money is integer kobo** (`15000000` is ₦150,000). Format it with `naira()` / `nairaShort()`.
- **Design tokens** live once in `src/index.css`. Features use role tokens only (`bg-surface`,
  `text-text-secondary`, `bg-success-fill text-success-ink`), never hex values. That is what makes
  dark mode and re-branding a one-file change. The accent is ink; change the `--color-primary-*` ramp to re-brand.
- **UI kit** in `src/components/ui` (DataTable, StatCard, Sheet, FocusPanel…). [docs/DESIGN.md](docs/DESIGN.md)
  says which one to use for what.
- **Permissions** are defined in `config/permissions.ts`. Screen access is set in `config/navigation.ts`.
