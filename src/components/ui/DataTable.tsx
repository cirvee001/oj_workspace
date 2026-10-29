import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { EmptyState } from './Layout';
import type { IconName } from './Icon';

export type SortDirection = 'asc' | 'desc';

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** The cell. */
  cell: (row: T, index: number) => ReactNode;
  /** Comparable value. Supplying it makes the column sortable. */
  sortValue?: (row: T) => string | number | boolean | null | undefined;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
  /** Hide on narrow screens: secondary columns only. */
  hideOnMobile?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  /** Extra classes for a row, e.g. a highlighted one. */
  rowClassName?: (row: T) => string | undefined;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: IconName;
  /** A totals row, rendered in <tfoot>. Use the same columns. */
  footer?: ReactNode;
  defaultSort?: { key: string; direction: SortDirection };
  /** Rows per page. `null` shows everything. */
  pageSize?: number | null;
  /** Noun for the pagination summary: "Showing 1–10 of 94 orders". */
  itemNoun?: string;
  density?: 'comfortable' | 'compact';
  /** Drop the card shell when the table already sits inside a card or modal. */
  bare?: boolean;
  /** Content above the table, inside the card (search, filters). */
  toolbar?: ReactNode;
  caption?: string;
  className?: string;
}

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

function compare(a: unknown, b: unknown): number {
  const ae = a === null || a === undefined || a === '';
  const be = b === null || b === undefined || b === '';
  if (ae && be) return 0;
  if (ae) return 1;
  if (be) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return String(a).localeCompare(String(b), 'en', { numeric: true, sensitivity: 'base' });
}

/**
 * Card-shelled table: quiet sentence-case headers, hairline rows, no zebra.
 * Sorting is client side (asc → desc → off) and long tables paginate themselves.
 */
export function DataTable<T>({
  data,
  columns,
  rowKey,
  onRowClick,
  rowClassName,
  emptyTitle = 'Nothing here yet',
  emptyMessage,
  emptyIcon,
  footer,
  defaultSort,
  pageSize = 10,
  itemNoun = 'rows',
  density = 'comfortable',
  bare,
  toolbar,
  caption,
  className,
}: DataTableProps<T>) {
  const [sort, setSort] = useState(defaultSort ?? null);
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [data.length]);

  const sorted = useMemo(() => {
    const col = sort && columns.find((c) => c.key === sort.key);
    if (!sort || !col?.sortValue) return data;
    const f = sort.direction === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => compare(col.sortValue!(a), col.sortValue!(b)) * f);
  }, [data, columns, sort]);

  const paged = pageSize !== null && sorted.length > pageSize;
  const pages = paged ? Math.ceil(sorted.length / pageSize!) : 1;
  const current = Math.min(page, pages);
  const rows = paged ? sorted.slice((current - 1) * pageSize!, current * pageSize!) : sorted;

  const toggleSort = (key: string) =>
    setSort((s) => (!s || s.key !== key ? { key, direction: 'asc' } : s.direction === 'asc' ? { key, direction: 'desc' } : null));

  const cellPad = density === 'compact' ? 'px-4 py-2.5' : 'px-4 py-3.5';
  const hide = (c: Column<T>) => c.hideOnMobile && 'max-md:hidden';

  const onKey = (e: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (!onRowClick || (e.key !== 'Enter' && e.key !== ' ') || e.target !== e.currentTarget) return;
    e.preventDefault();
    onRowClick(row);
  };

  return (
    <div className={cn('relative min-w-0', !bare && 'overflow-hidden rounded-card bg-surface shadow-card', className)}>
      {toolbar && <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">{toolbar}</div>}
      <div className="w-full overflow-x-auto">
        <table className="w-full border-separate border-spacing-0">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key ? sort : null;
                const SortIcon = !active ? ChevronsUpDown : active.direction === 'asc' ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    style={{ width: c.width }}
                    aria-sort={c.sortValue ? (active ? (active.direction === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
                    className={cn(
                      'border-b border-border bg-surface-sunken px-4 py-2.5 text-eyebrow whitespace-nowrap text-text-muted',
                      ALIGN[c.align ?? 'left'],
                      hide(c),
                    )}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={cn(
                          /* buttons reset text-transform and tracking: re-inherit the header's eyebrow style */
                          'group inline-flex items-center gap-1 rounded-sm tracking-[inherit] uppercase transition-colors hover:text-text',
                          c.align === 'right' && 'flex-row-reverse',
                        )}
                      >
                        {c.header}
                        <SortIcon
                          size={13}
                          aria-hidden="true"
                          className={cn('shrink-0 transition-opacity', active ? 'text-accent opacity-100' : 'opacity-0 group-hover:opacity-60')}
                        />
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <EmptyState title={emptyTitle} message={emptyMessage} icon={emptyIcon} size="sm" />
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={(e) => onKey(e, row)}
                className={cn('group', onRowClick && 'cursor-pointer', rowClassName?.(row))}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      'bg-surface align-middle text-body-14 text-text-label transition-colors',
                      i < rows.length - 1 && 'border-b border-border',
                      onRowClick && 'group-hover:bg-surface-hover',
                      cellPad,
                      ALIGN[c.align ?? 'left'],
                      hide(c),
                      c.className,
                    )}
                  >
                    {c.cell(row, i)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer && rows.length > 0 && <tfoot className="[&_td]:border-t [&_td]:border-border [&_td]:bg-surface-sunken [&_td]:font-semibold [&_td]:text-text">{footer}</tfoot>}
        </table>
      </div>
      {paged && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-body-13 text-text-secondary">
          <span className="tabular-nums">
            Showing {(current - 1) * pageSize! + 1}–{Math.min(current * pageSize!, sorted.length)} of {sorted.length} {itemNoun}
          </span>
          <div className="flex items-center gap-1">
            <PageButton label="Previous page" disabled={current === 1} onClick={() => setPage(current - 1)}>
              <ChevronLeft size={16} />
            </PageButton>
            <span className="px-2 tabular-nums">
              {current} / {pages}
            </span>
            <PageButton label="Next page" disabled={current === pages} onClick={() => setPage(current + 1)}>
              <ChevronRight size={16} />
            </PageButton>
          </div>
        </div>
      )}
    </div>
  );
}

function PageButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-ctl border border-border-strong text-text-secondary transition-colors hover:bg-surface-hover hover:text-text disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** A footer cell for <DataTable footer>. */
export function FooterCell({ children, align = 'left', colSpan, className }: { children?: ReactNode; align?: 'left' | 'right'; colSpan?: number; className?: string }) {
  return (
    <td colSpan={colSpan} className={cn('px-4 py-3 text-body-14', ALIGN[align], className)}>
      {children}
    </td>
  );
}
