import type { Leave } from '@/types/domain';
import {
  Avatar,
  Badge,
  Button,
  DataTable,
  PageHeader,
  SectionHeader,
  StatCard,
  StatGrid,
  type BadgeTone,
  type Column,
} from '@/components/ui';
import { TODAY, niceDate } from '@/lib/dates';
import { decideLeave } from '@/store/actions/people';
import { useApp } from '@/store/hooks';
import { can, nameOf } from '@/store/selectors';
import { openSheet } from '@/store/ui/sheetStore';

const KIND_TONE: Record<string, BadgeTone> = {
  'Annual leave': 'info',
  'Sick leave': 'warning',
  'Emergency leave': 'danger',
  'Unpaid leave': 'neutral',
};

/** Time off, and what it does to attendance and payroll. */
export function LeavePage() {
  const s = useApp();
  const manages = can(s, 'staff') || can(s, '*');
  const visible = s.leave.filter((l) => manages || l.staff === s.actor);
  const taken = s.leave.filter((l) => l.staff === s.actor && l.status === 'approved').reduce((n, l) => n + l.days, 0);
  const left = s.leaveAllowance - taken;

  const columns: Column<Leave>[] = [
    {
      key: 'staff',
      header: 'Staff',
      sortValue: (l) => nameOf(s, l.staff),
      cell: (l) => (
        <div className="flex items-center gap-3">
          <Avatar name={nameOf(s, l.staff)} size="sm" />
          <span className="font-semibold text-text">{nameOf(s, l.staff)}</span>
        </div>
      ),
    },
    { key: 'kind', header: 'Type', sortValue: (l) => l.kind, cell: (l) => <Badge tone={KIND_TONE[l.kind] ?? 'neutral'}>{l.kind}</Badge> },
    {
      key: 'dates',
      header: 'From – to',
      sortValue: (l) => l.from,
      cell: (l) => (
        <span className="whitespace-nowrap">
          {niceDate(l.from)} <span className="text-text-muted">–</span> {niceDate(l.to)}
        </span>
      ),
    },
    { key: 'days', header: 'Days', align: 'right', sortValue: (l) => l.days, cell: (l) => <span className="tabular-nums">{l.days}</span> },
    { key: 'reason', header: 'Reason', hideOnMobile: true, cell: (l) => <span className="text-text-secondary">{l.reason}</span> },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      sortValue: (l) => l.status,
      cell: (l) =>
        l.status !== 'requested' ? (
          <span className="inline-flex flex-col items-end gap-0.5">
            <Badge tone={l.status === 'approved' ? 'success' : 'danger'}>{l.status}</Badge>
            {l.decidedBy && <span className="text-body-12 whitespace-nowrap text-text-muted">by {nameOf(s, l.decidedBy)}</span>}
          </span>
        ) : manages && l.staff !== s.actor ? (
          <span className="inline-flex justify-end gap-2">
            <Button size="sm" variant="secondary" leftIcon="x" onClick={() => decideLeave(l.id, false)}>
              Decline
            </Button>
            <Button size="sm" leftIcon="check" onClick={() => decideLeave(l.id, true)}>
              Approve
            </Button>
          </span>
        ) : (
          <Badge tone="warning">waiting</Badge>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Leave"
        description="Time off, and what it does to attendance and payroll."
        actions={
          <Button leftIcon="cal" onClick={() => openSheet({ type: 'askLeave' })}>
            Ask for time off
          </Button>
        }
      />
      <StatGrid>
        <StatCard
          icon="cal"
          label="Your days left"
          value={left}
          unit={'/' + s.leaveAllowance}
          tone={left <= 0 ? 'danger' : left <= 5 ? 'warning' : 'default'}
          caption={taken + ' days taken this year'}
        />
        <StatCard
          icon="clock"
          label="Waiting for a decision"
          value={s.leave.filter((l) => l.status === 'requested').length}
          tone="warning"
          caption="across the company"
        />
        <StatCard
          icon="users"
          label="Off right now"
          value={s.leave.filter((l) => l.status === 'approved' && l.from <= TODAY && l.to >= TODAY).length}
          caption="shows on the attendance sheet"
        />
        <StatCard
          icon="check"
          label="Approved this month"
          value={s.leave.filter((l) => l.status === 'approved').length}
          tone="success"
          caption="counted as paid days"
        />
      </StatGrid>

      <SectionHeader title="Requests" />
      <DataTable
        data={visible}
        columns={columns}
        rowKey={(l) => l.id}
        itemNoun="requests"
        emptyTitle="No requests yet"
        emptyMessage="Time off you ask for shows here."
        emptyIcon="cal"
      />
    </>
  );
}
