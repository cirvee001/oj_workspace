import type { ReactNode } from 'react';
import type { Attendance } from '@/types/domain';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  DataTable,
  EmptyState,
  IconChip,
  KeyValue,
  KeyValueList,
  List,
  ListItem,
  Sheet,
  type Column,
} from '@/components/ui';
import { stageName } from '@/config/constants';
import { TODAY, isoFromToday, niceDate } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { naira, qty } from '@/lib/format';
import { useApp } from '@/store/hooks';
import { branchName, can, isOwner, materialOf, staffOf } from '@/store/selectors';
import { confirmMarkLeft } from '@/store/actions/staff';
import { openSheet } from '@/store/ui/sheetStore';

const STRIP_DAYS = 30;

const attendanceColumns: Column<Attendance>[] = [
  { key: 'day', header: 'Day', sortValue: (a) => a.date, cell: (a) => niceDate(a.date) },
  { key: 'in', header: 'In', cell: (a) => <span className="tabular-nums">{a.in || '—'}</span> },
  { key: 'out', header: 'Out', cell: (a) => (a.out ? <span className="tabular-nums">{a.out}</span> : <span className="text-text-muted">still here</span>) },
  {
    key: 'status',
    header: '',
    align: 'right',
    cell: (a) => (a.late ? <Badge tone="warning">late</Badge> : <Badge tone="success">on time</Badge>),
  },
];

/** One person's record: role, pay, attendance, and what they would leave behind. */
export function StaffSheet({ id }: { id: string }) {
  const s = useApp();
  const x = staffOf(s, id);
  if (!x) return null;

  const att = s.attendance.filter((a) => a.staff === id);
  const jobs = s.jobs.filter((j) => j.assigned === id && j.stage !== 'delivery');
  const fab = s.issues.filter((i) => i.to === id && i.status === 'issued' && !i.returned);
  const adv = s.issues.filter((i) => i.to === id && i.returned && i.result && i.result.gap > 0);
  const seeMoney = can(s, 'money') || can(s, '*');
  const today = att.find((a) => a.date === TODAY);
  const onLeave = s.leave.some((l) => l.staff === id && l.status === 'approved' && l.from <= TODAY && l.to >= TODAY);
  const manage = can(s, 'staff') && !x.left && (x.role !== 'owner' || isOwner(s));

  /* The last 30 days, oldest first. Sundays are the shop's day off. */
  const byDate = new Map(att.map((a) => [a.date, a]));
  const strip = Array.from({ length: STRIP_DAYS }, (_, i) => {
    const date = isoFromToday(i - (STRIP_DAYS - 1));
    const rec = byDate.get(date);
    const off = new Date(date).getDay() === 0;
    return { date, rec, off };
  });
  const onTime = strip.filter((d) => d.rec && !d.rec.late).length;
  const late = strip.filter((d) => d.rec?.late).length;
  const absent = strip.filter((d) => !d.rec && !d.off && d.date !== TODAY).length;

  return (
    <Sheet
      title={x.name}
      description="Their role, pay, attendance and what they would leave behind."
      size="lg"
      footer={
        manage && (
          <>
            {x.id !== s.actor && (
              <Button variant="danger" onClick={() => void confirmMarkLeft(x.id)}>
                Mark as left
              </Button>
            )}
            <Button variant="secondary" leftIcon="edit" onClick={() => openSheet({ type: 'staffForm', id: x.id })}>
              Edit
            </Button>
          </>
        )
      }
    >
      <div className="mb-5 flex items-center gap-4 rounded-tile bg-surface-sunken p-4">
        <Avatar name={x.name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-heading-18 text-text">{x.name}</p>
          <p className="mt-0.5 text-body-13 text-text-secondary">
            {x.roleName} · {x.dept}
          </p>
        </div>
        {x.left ? (
          <Badge tone="neutral">{'Left ' + niceDate(x.left)}</Badge>
        ) : today ? (
          <Badge tone={today.late ? 'warning' : 'success'} dot>
            {(today.late ? 'Late ' : 'In ') + today.in}
          </Badge>
        ) : onLeave ? (
          <Badge tone="info">On leave</Badge>
        ) : (
          <Badge>Not in</Badge>
        )}
      </div>

      <KeyValueList>
        <KeyValue label="Role">{x.roleName}</KeyValue>
        <KeyValue label="Department">{x.dept}</KeyValue>
        <KeyValue label="Branch">{branchName(s, x.branch)}</KeyValue>
        <KeyValue label="Started">{new Date(x.hired).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</KeyValue>
        {x.left && <KeyValue label="Left">{niceDate(x.left)}</KeyValue>}
        <KeyValue label="Salary" total>
          {seeMoney ? (x.salary ? naira(x.salary) + ' a month' : '—') : <Badge>you cannot see this</Badge>}
        </KeyValue>
      </KeyValueList>

      <SheetSection title="Turning up">
        {att.length ? (
          <>
            <div className="rounded-tile border border-border p-4">
              <div className="flex items-center justify-between gap-3 text-body-12 text-text-muted">
                <span>Last {STRIP_DAYS} days</span>
                <span className="tabular-nums">
                  {onTime} on time · {late} late · {absent} absent
                </span>
              </div>
              <ol className="mt-3 grid grid-cols-[repeat(30,minmax(0,1fr))] gap-1" aria-label={`Attendance for the last ${STRIP_DAYS} days`}>
                {strip.map((d) => {
                  const label = d.rec
                    ? (d.rec.late ? 'Late ' : 'On time ') + d.rec.in
                    : d.off
                      ? 'Day off'
                      : d.date === TODAY
                        ? 'Not in yet'
                        : 'Absent';
                  return (
                    <li
                      key={d.date}
                      title={niceDate(d.date) + ' · ' + label}
                      aria-label={niceDate(d.date) + ': ' + label}
                      className={cn(
                        'h-6 rounded-full',
                        d.rec ? (d.rec.late ? 'bg-warning-text' : 'bg-success-text') : d.off ? 'border border-dashed border-border-strong' : 'bg-surface-sunken ring-1 ring-border ring-inset',
                        d.date === TODAY && 'ring-2 ring-accent-subtle',
                      )}
                    />
                  );
                })}
              </ol>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-body-12 text-text-secondary">
                <LegendDot className="bg-success-text">On time</LegendDot>
                <LegendDot className="bg-warning-text">Late</LegendDot>
                <LegendDot className="bg-surface-sunken ring-1 ring-border ring-inset">Absent</LegendDot>
                <LegendDot className="border border-dashed border-border-strong">Sunday</LegendDot>
              </div>
            </div>
            <DataTable
              bare
              density="compact"
              className="mt-3"
              data={att}
              columns={attendanceColumns}
              rowKey={(a) => a.date}
              pageSize={7}
              itemNoun="days"
            />
          </>
        ) : (
          <EmptyState icon="clock" size="sm" title="No attendance yet" />
        )}
      </SheetSection>

      <SheetSection title={x.left ? 'Left behind' : 'If they left tomorrow'}>
        {fab.length || jobs.length ? (
          <Alert tone="warning" title="This would have to be settled first:">
            <ul className="mt-1 list-disc space-y-0.5 pl-4.5">
              {fab.map((i) => (
                <li key={i.id}>
                  {qty(i.issued)} yards of {materialOf(s, i.material).name} not brought back (job {i.job})
                </li>
              ))}
              {jobs.map((j) => (
                <li key={j.id}>
                  Job {j.id} still with them at {stageName(j.stage)}
                </li>
              ))}
            </ul>
          </Alert>
        ) : (
          <Alert tone="success" title="Nothing outstanding. They could leave clean." />
        )}
      </SheetSection>

      {adv.length > 0 && (
        <SheetSection title="Fabric they could not account for">
          <List bare className="overflow-hidden rounded-tile border border-border">
            {adv.map((i) => (
              <ListItem
                key={i.id}
                leading={<IconChip icon="layers" tone="danger" />}
                title={qty(i.result!.gap) + ' yards on ' + i.job}
                description={'"' + i.result!.reason + '"'}
              />
            ))}
          </List>
        </SheetSection>
      )}
    </Sheet>
  );
}

function SheetSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="mb-3 text-body-15 font-bold text-text">{title}</h3>
      {children}
    </section>
  );
}

function LegendDot({ className, children }: { className: string; children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className={cn('size-2.5 rounded-full', className)} />
      {children}
    </span>
  );
}
