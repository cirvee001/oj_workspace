import { useMemo, useState } from 'react';
import type { Attendance, Staff } from '@/types/domain';
import {
  Avatar,
  Badge,
  Button,
  DataTable,
  PageHeader,
  SearchInput,
  StatCard,
  StatGrid,
  Tabs,
  Toolbar,
  type Column,
} from '@/components/ui';
import { TODAY, niceDate } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { exportStaff } from '@/store/actions/people';
import { useApp } from '@/store/hooks';
import { branchStaff, can, myBranch } from '@/store/selectors';
import { openSheet } from '@/store/ui/sheetStore';

interface StaffRow {
  staff: Staff;
  today: Attendance | undefined;
  onLeave: boolean;
  jobs: number;
  openFabric: number;
}

const ALL = 'all';
/** Not a department: the tab for people who have left. */
const LEFT = '__left';

/** Who works here, what they are paid, and how they have been turning up. */
export function StaffPage() {
  const s = useApp();
  const staff = branchStaff(s);
  const leavers = s.staff.filter((x) => x.branch === myBranch(s) && x.left);
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState<string>(ALL);

  const toRow = (x: Staff): StaffRow => ({
    staff: x,
    today: s.attendance.find((a) => a.staff === x.id && a.date === TODAY),
    onLeave: s.leave.some((l) => l.staff === x.id && l.status === 'approved' && l.from <= TODAY && l.to >= TODAY),
    jobs: s.jobs.filter((j) => j.assigned === x.id && j.stage !== 'delivery').length,
    openFabric: s.issues.filter((i) => i.to === x.id && i.status === 'issued' && !i.returned).length,
  });
  const rows = staff.map(toRow);
  const leftRows = leavers.map(toRow);

  const depts = useMemo(() => Array.from(new Set(staff.map((x) => x.dept))).sort(), [staff]);
  const tabs = [
    { value: ALL, label: 'All', count: staff.length },
    ...depts.map((d) => ({ value: d, label: d, count: staff.filter((x) => x.dept === d).length })),
    ...(leavers.length ? [{ value: LEFT, label: 'Left', count: leavers.length }] : []),
  ];

  const q = query.trim().toLowerCase();
  const shown = (dept === LEFT ? leftRows : rows).filter(
    (r) =>
      (dept === ALL || dept === LEFT || r.staff.dept === dept) &&
      (!q || [r.staff.name, r.staff.roleName, r.staff.dept].some((v) => v.toLowerCase().includes(q))),
  );

  const inToday = rows.filter((r) => r.today).length;
  const lateToday = rows.filter((r) => r.today?.late).length;
  const jobsInHand = rows.reduce((n, r) => n + r.jobs, 0);

  const columns: Column<StaffRow>[] = [
    {
      key: 'name',
      header: 'Name',
      sortValue: (r) => r.staff.name,
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.staff.name} size="sm" className={cn(r.staff.left && 'opacity-50')} />
          <div className="min-w-0">
            <div className={cn('truncate font-semibold', r.staff.left ? 'text-text-muted' : 'text-text')}>{r.staff.name}</div>
            <Badge size="sm" className="mt-1">
              {r.staff.roleName}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      key: 'dept',
      header: 'Department',
      sortValue: (r) => r.staff.dept,
      cell: (r) => <span className={cn(r.staff.left && 'text-text-muted')}>{r.staff.dept}</span>,
      hideOnMobile: true,
    },
    {
      key: 'jobs',
      header: 'Jobs in hand',
      align: 'right',
      sortValue: (r) => r.jobs,
      cell: (r) => <span className="tabular-nums">{r.jobs || '—'}</span>,
      hideOnMobile: true,
    },
    {
      key: 'fabric',
      header: 'Fabric out',
      align: 'right',
      sortValue: (r) => r.openFabric,
      cell: (r) =>
        r.openFabric ? (
          <Badge tone="warning">{r.openFabric + ' open'}</Badge>
        ) : (
          <span className="text-text-muted">—</span>
        ),
      hideOnMobile: true,
    },
    {
      key: 'today',
      header: 'Today',
      align: 'right',
      sortValue: (r) => (r.staff.left ? 4 : r.today ? (r.today.late ? 1 : 0) : r.onLeave ? 2 : 3),
      cell: (r) =>
        r.staff.left ? (
          <span className="whitespace-nowrap text-text-muted">{'Left ' + niceDate(r.staff.left)}</span>
        ) : r.today ? (
          <Badge tone={r.today.late ? 'warning' : 'success'} dot>
            {(r.today.late ? 'Late ' : 'In ') + r.today.in}
          </Badge>
        ) : r.onLeave ? (
          <Badge tone="info">On leave</Badge>
        ) : (
          <Badge>Not in</Badge>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Staff"
        description="Who works here, what they are paid, and how they have been turning up."
        actions={
          <>
            <Button variant="secondary" leftIcon="download" onClick={exportStaff}>
              Download
            </Button>
            {can(s, 'staff') && (
              <Button leftIcon="plus" onClick={() => openSheet({ type: 'staffForm' })}>
                Add staff
              </Button>
            )}
          </>
        }
      />

      <StatGrid className="mb-6">
        <StatCard label="Staff" value={staff.length} icon="users" caption="at this branch" />
        <StatCard
          label="In today"
          value={inToday}
          unit={'/' + staff.length}
          icon="clock"
          tone="success"
          caption={staff.length - inToday + ' not in yet'}
        />
        <StatCard
          label="Late today"
          value={lateToday}
          icon="bell"
          tone={lateToday ? 'warning' : 'default'}
          caption="taken from the clock-in tablet"
        />
        <StatCard label="Jobs in hand" value={jobsInHand} icon="scissors" caption="not yet at delivery" />
      </StatGrid>

      <Toolbar>
        <SearchInput
          placeholder="Search staff"
          aria-label="Search staff"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Tabs aria-label="Department" options={tabs} value={dept} onChange={setDept} className="max-w-full overflow-x-auto" />
      </Toolbar>

      <DataTable
        data={shown}
        columns={columns}
        rowKey={(r) => r.staff.id}
        onRowClick={(r) => openSheet({ type: 'staff', id: r.staff.id })}
        itemNoun="staff"
        emptyTitle="No staff match"
        emptyMessage="Try another name or department."
        emptyIcon="users"
      />
    </>
  );
}
