# OJ Clothing — design system ("Atelier")

OJ is a Lagos tailoring house, so the UI should feel like an atelier, not a SaaS
dashboard: black ink on white paper, like a pattern sheet. Use the components in
`src/components/ui` and the tokens in `src/index.css`. Don't invent one-off styles.

## Principles

1. **Black and white.** The page is a pale paper canvas (`bg-canvas`), content sits on
   white sheets (`bg-surface`), and the accent is ink (`accent` is black, white in dark
   mode). Colour is reserved for status: paid, late, missing.
2. **Paper, not floating cards.** Cards have a hairline edge (`shadow-card` is a 1px
   ring), not a drop shadow. Only things that float over the page (modals, menus,
   toasts) get real shadows.
3. **Tailored shapes.** Controls have 10px corners (`rounded-ctl`), tiles 10px
   (`rounded-tile`), cards 14px (`rounded-card`) and badges 6px tags (`rounded-tag`),
   like garment labels. Use `rounded-full` only for avatars, dots and switches, never
   for buttons or inputs.
4. **Editorial type.**
   - **Serif:** Instrument Serif (`font-display`) is for page titles, sheet titles and
     big figures. It has one weight, so never bold it. Size carries the hierarchy, and
     italics give emphasis ("Good afternoon, *Tunde*.").
   - **Body:** Inter is for everything you read. Sizes follow the named scale
     (`text-body-12…15`).
   - **Labels:** small tracked capitals (`text-eyebrow`) label KPIs and table headers.
5. **Details from the trade, used sparingly.**
   - `stitch`: a dashed rule, used for section headers, receipts (`KeyValue`) and dockets.
   - Tape-measure ticks on `ProgressBar` and `BarList`.
   - The KPI ledger: `StatGrid` draws KPIs as one ruled strip.
   - The ink sidebar.
6. **Role tokens only.** Never write a hex value or a raw ramp step in a feature. Use
   `text`, `text-secondary`, `surface`, `surface-sunken`, `border` and the semantic
   pairs (`bg-success-fill text-success-ink`). This is what makes dark mode work.
7. **Say less.** A page description is one line, and so is a sheet description.

## Components

| Need | Use |
| --- | --- |
| Page title + actions | `PageHeader` (serif title, one-line `description`, `actions`, optional `eyebrow`) |
| Section between cards | `SectionHeader` (title + stitched rule + actions) |
| Card | `Card`, `CardHeader`, `CardBody`, `CardFooter` (sunken footer bar) |
| KPIs | `StatGrid` + `StatCard`. The grid renders them as one ledger strip |
| Table | `DataTable` with typed `columns`, `sortValue`, `onRowClick`, `itemNoun`, `footer` + `FooterCell` |
| List | `List` + `ListItem` (leading `Avatar`/`IconChip`, trailing `Figure`/`Badge`) |
| Details / receipt | `KeyValueList` + `KeyValue` (stitched rows, `total` for the bottom line) |
| Work queue | `Card` + `Queue` + `QueueItem` (urgent items get an ink edge mark) |
| List + detail | `FocusPanel` + `DetailCard` (split view; the docket on the right) |
| Progress / share | `ProgressBar`; `BarList` for ranked shares |
| Trend | `LineChart` (monotone, ink and grey) + `ChartLegend` |
| Buckets | `BarChart`: square-shouldered columns; the called-out bar is solid ink |
| Message | `Alert`: a tinted slip with a coloured edge rule |
| Nothing to show | `EmptyState` (stitched circle, serif title) |
| Forms | `FormGrid` + `Field` + `Input` (`prefix="₦"`), `Select`, `Textarea` |
| Filters | `Toolbar` with `SearchInput` and `Tabs` (underline tabs) |
| Modal | `Sheet` (serif `title`, `description`, `footer` holds the actions; forms submit via `form="<id>"`) |

## Buttons

- `primary` (ink) is the one main action on a screen or sheet.
- `secondary` (outlined) is for Cancel and other actions.
- `ghost` is a quiet action inside a card.
- `danger` is for destructive actions.
- `link` is an inline link.
- Use `IconButton` for icon-only buttons.

## Status tones

| Tone | Meaning | Examples |
| --- | --- | --- |
| `success` | done, good | paid, on time, matches |
| `warning` | attention soon | owing, waiting, order more |
| `danger` | problem | overdue, missing, declined |
| `accent` | highlighted, yours | viewing |
| `neutral` | everything else | |

## Boards

- **Lanes:** `w-72 shrink-0 rounded-card bg-surface-sunken p-2`, with the label and a count badge.
- **Cards:** `rounded-tile bg-surface p-3.5 shadow-card`.
- **Late:** a `danger` dot badge.

## Inspiration, not imitation

The structural discipline came from the Cirvee OS design system: role tokens, quiet
tables, one accent, modals with footers. The look is OJ's own. Don't copy another
product's palette, fonts or signature components into this app.
