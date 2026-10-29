import { Avatar, DataTable, PageHeader, type Column } from '@/components/ui';
import { timeOf } from '@/lib/dates';
import { useApp } from '@/store/hooks';
import type { LogEntry } from '@/types/domain';

const COLUMNS: Column<LogEntry>[] = [
  {
    key: 'what',
    header: 'What happened',
    sortValue: (l) => l.what,
    cell: (l) => <span className="font-semibold text-text">{l.what}</span>,
  },
  {
    key: 'detail',
    header: 'Details',
    hideOnMobile: true,
    cell: (l) => <span className="text-text-secondary">{l.detail || '—'}</span>,
  },
  {
    key: 'who',
    header: 'Who',
    sortValue: (l) => l.who,
    cell: (l) => (
      <span className="flex items-center gap-2.5">
        <Avatar name={l.who} size="sm" />
        <span className="min-w-0">
          <span className="block truncate font-medium text-text">{l.who}</span>
          <span className="block text-body-12 text-text-muted">{l.role}</span>
        </span>
      </span>
    ),
  },
  {
    key: 'when',
    header: 'When',
    align: 'right',
    sortValue: (l) => l.at,
    cell: (l) => <span className="whitespace-nowrap text-text-secondary tabular-nums">{timeOf(l.at)}</span>,
  },
];

export function ActivityPage() {
  const s = useApp();

  return (
    <>
      <PageHeader
        title="History"
        description="Every change, who made it and when. Nothing here can be edited or deleted — not by a manager, not by the owner, not by anyone."
      />
      <DataTable
        data={s.log}
        columns={COLUMNS}
        rowKey={(l, i) => l.at + '-' + i}
        pageSize={15}
        itemNoun="changes"
        caption="Activity history"
        emptyIcon="history"
        emptyTitle="Nothing yet"
        emptyMessage="Take an order or ask for fabric and it will appear here."
      />
    </>
  );
}
