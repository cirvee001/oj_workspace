import type { ReactNode } from 'react';
import { BarChart } from '@/components/charts/BarChart';
import { ChartLegend, LineChart } from '@/components/charts/LineChart';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  EmptyState,
  Icon,
  List,
  ListItem,
  Queue,
  QueueItem,
  SectionHeader,
  StatCard,
  StatGrid,
  Tabs,
  type Column,
  type IconName,
} from '@/components/ui';
import { SERIES_COLOURS, STAGES } from '@/config/constants';
import { canSeeScreen, type ScreenKey } from '@/config/navigation';
import { useGo, useOpenTarget } from '@/hooks/useGo';
import { MONTH_START, TODAY, isoFromToday, niceDate, timeOf, today } from '@/lib/dates';
import { firstName, naira, nairaShort, plural, qty } from '@/lib/format';
import { setBranch, setSalesRange } from '@/store/actions/session';
import { attentionItems, myWorkToday, pendingApprovals, type WorkItem } from '@/store/derived';
import { useApp } from '@/store/hooks';
import {
  balanceOf,
  branchJobs,
  branchName,
  branchOrders,
  branchStaff,
  can,
  isLate,
  lowStock,
  me,
  myBranch,
  orderBranch,
  owedTotal,
  salesSeries,
  takings,
} from '@/store/selectors';
import type { AppState, Branch, SalesRange } from '@/types/domain';

const RANGES: readonly { value: SalesRange; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '12w', label: '12w' },
  { value: '12m', label: '12m' },
];

const nairaWhole = (v: number) => '₦' + v.toLocaleString();

/** Percentage change as a StatCard delta, or undefined when there is nothing to compare. */
function change(now: number, before: number) {
  if (before <= 0) return undefined;
  const p = Math.round(((now - before) / before) * 100);
  return {
    label: (p > 0 ? '+' : '') + p + '% vs yesterday',
    direction: p > 0 ? ('up' as const) : p < 0 ? ('down' as const) : ('flat' as const),
    good: p >= 0,
  };
}

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

interface HeroFigure {
  label: string;
  value: string | number;
  icon: IconName;
  screen: ScreenKey;
}

export function DashboardPage() {
  const s = useApp();
  const go = useGo();
  const openTarget = useOpenTarget();

  const seesMoney = can(s, 'money');
  const here = myBranch(s);
  const jobs = branchJobs(s);
  const orders = branchOrders(s);
  const openJobs = jobs.filter((j) => j.stage !== 'delivery');
  const late = jobs.filter(isLate);
  const dueToday = jobs.filter((j) => j.stage !== 'delivery' && j.due === TODAY);
  const readyWaiting = jobs.filter((j) => j.stage === 'ready');
  const completedToday = jobs.filter(
    (j) => j.stage === 'delivery' && s.orders.find((o) => o.id === j.order)?.due === TODAY,
  ).length;

  const moneyToday = takings(s, here, TODAY).total;
  const moneyYesterday = takings(s, here, isoFromToday(-1)).total;
  const ordersToday = orders.filter((o) => o.created === TODAY).length;
  const enquiriesToday = s.enquiries.filter((e) => e.lastContact === TODAY && e.stage === 'new').length;

  const roster = branchStaff(s);
  const inToday = s.attendance.filter((a) => a.date === TODAY && roster.some((x) => x.id === a.staff));
  const onLeaveToday = s.leave.filter((l) => l.status === 'approved' && l.from <= TODAY && l.to >= TODAY).length;
  const absent = Math.max(0, roster.length - inToday.length - onLeaveToday);

  const monthSales = takings(s, here, MONTH_START, '9999-12-31').total;
  const payrollEstimate = roster.reduce((n, x) => n + x.salary, 0);
  const owing = orders.filter((o) => balanceOf(o) > 0);
  const low = lowStock(s);

  const attn = attentionItems(s);
  const work = myWorkToday(s);
  const approvalsMine = pendingApprovals(s).filter((a) => can(s, a.perm));

  /* Last seven days, oldest first, for the stat-card minis. */
  const week = salesSeries(s, '7d');
  const weekTakings = week.orders.map((v, i) => v + week.shop[i]);
  const weekOrders = Array.from({ length: 7 }, (_, i) => {
    const d = isoFromToday(i - 6);
    return orders.filter((o) => o.created === d).length;
  });

  /* ---------- hero ---------- */
  const myOpen = jobs.filter((j) => j.assigned === s.actor && j.stage !== 'delivery');
  const dateLine =
    today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) + ' — ' + branchName(s, here);

  const figures: HeroFigure[] = seesMoney
    ? [
        { label: 'Need your attention', value: attn.length, icon: 'bell', screen: 'notifications' },
        { label: 'Waiting on you', value: approvalsMine.length, icon: 'check', screen: 'approvals' },
        { label: 'Ready for pickup', value: readyWaiting.length, icon: 'tag', screen: 'workshop' },
      ]
    : [
        { label: 'Your jobs', value: myOpen.length, icon: 'scissors', screen: 'workshop' },
        { label: 'On your list today', value: work.length, icon: 'spark', screen: 'notifications' },
        { label: 'Waiting on you', value: approvalsMine.length, icon: 'check', screen: 'approvals' },
      ];

  const strong = (v: ReactNode) => <span className="font-semibold text-text">{v}</span>;
  const urgentCount = attn.filter((a) => a.urgent).length;
  const brief: ReactNode = seesMoney ? (
    <>
      {strong(naira(moneyToday))} has come in today
      {moneyToday ? <> from {plural(s.payments.filter((p) => p.when === TODAY).length, 'payment')}</> : null}.{' '}
      {late.length ? <>{strong(plural(late.length, 'order'))} {late.length === 1 ? 'is' : 'are'} running late</> : <>Nothing is running late</>}
      {approvalsMine.length ? (
        <>
          , and {strong(plural(approvalsMine.length, 'request'))} {approvalsMine.length === 1 ? 'is' : 'are'} waiting on you.
        </>
      ) : (
        <>, and nothing is waiting on you.</>
      )}
    </>
  ) : (
    <>
      You have {strong(plural(myOpen.length, 'job'))} in hand
      {myOpen.filter(isLate).length ? <>, {strong(myOpen.filter(isLate).length + ' late')}</> : null}
      {work.length ? <>, and {strong(plural(work.length, 'thing'))} on your list today.</> : <>, and nothing else on your list today.</>}
    </>
  );

  return (
    <>
      {/* ---------- MORNING BRIEF ---------- */}
      <section aria-label="Today in brief" className="mt-4 mb-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-end">
        <div className="min-w-0">
          <p className="text-eyebrow text-accent">{dateLine}</p>
          <h1 className="mt-3 font-display text-[34px] leading-[1.1] text-balance text-text sm:text-[44px]">
            {greeting()}, {firstName(me(s).name)}.
          </h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-7 text-pretty text-text-secondary">{brief}</p>
        </div>
        <Docket
          title={seesMoney ? 'On the cutting table' : 'Your day'}
          urgent={urgentCount}
          rows={figures.map((f) => ({ ...f, onClick: canSeeScreen(s, f.screen) ? () => go(f.screen) : undefined }))}
        />
      </section>

      {/* ---------- TODAY ---------- */}
      <SectionHeader title="Today" className="mt-0" />
      {seesMoney ? (
        <StatGrid className="xl:grid-cols-5">
          <StatCard
            icon="coins"
            label="Money received today"
            value={naira(moneyToday)}
            sparkline={weekTakings}
            delta={change(moneyToday, moneyYesterday)}
            caption={s.payments.filter((p) => p.when === TODAY).length + ' payments'}
          />
          <StatCard
            icon="receipt"
            label="New orders"
            value={ordersToday}
            bars={weekOrders}
            caption={enquiriesToday + ' new enquiries'}
          />
          <StatCard
            icon="check"
            tone="success"
            label="Orders finished"
            value={completedToday}
            caption={dueToday.length + ' due today'}
          />
          <StatCard
            icon="clock"
            tone={late.length ? 'danger' : 'default'}
            label="Running late"
            value={late.length}
            delta={late.length ? { label: 'needs chasing', good: false } : undefined}
            caption={late.length ? undefined : 'nothing overdue'}
            onClick={canSeeScreen(s, 'workshop') ? () => go('workshop') : undefined}
          />
          <StatCard
            icon="users"
            tone={absent ? 'warning' : 'default'}
            label="Staff here"
            value={inToday.length}
            unit={'/' + roster.length}
            caption={absent + ' absent · ' + onLeaveToday + ' on leave'}
          />
        </StatGrid>
      ) : (
        <MyToday s={s} />
      )}

      {/* ---------- BENTO ---------- */}
      <div className="mt-4 grid items-start gap-4 xl:grid-cols-3">
        {seesMoney && (
          <>
            <SalesCard s={s} />
            <Card>
              <CardHeader
                title="Where the work is sitting"
                description={plural(openJobs.length, 'job') + ' in production'}
                actions={
                  canSeeScreen(s, 'workshop') ? (
                    <Button variant="link" size="sm" rightIcon="chevR" onClick={() => go('workshop')}>
                      Production
                    </Button>
                  ) : undefined
                }
              />
              <CardBody>
                <BarChart
                  height={190}
                  bars={STAGES.slice(0, 7).map((st) => ({
                    label: st.label.split(' ')[0],
                    value: jobs.filter((j) => j.stage === st.key).length,
                  }))}
                />
                <p className="mt-4 flex items-center gap-2 text-body-13 text-text-secondary">
                  {late.length ? (
                    <>
                      <Badge tone="danger" size="sm" dot>
                        {late.length}
                      </Badge>
                      past the promised date.
                    </>
                  ) : (
                    'Nothing is past its promised date.'
                  )}
                </p>
              </CardBody>
            </Card>
          </>
        )}

        <Card className="xl:col-span-2">
          <CardHeader
            title="Needs your attention"
            description="The things that will cost money if nobody looks at them"
            actions={attn.length ? <Badge tone="accent">{attn.length}</Badge> : <Badge tone="success">clear</Badge>}
          />
          {attn.length ? (
            <WorkQueue
              items={attn}
              limit={8}
              onOpen={openTarget}
              more={
                <Button variant="link" size="sm" onClick={() => go('notifications')}>
                  and {attn.length - 8} more in Notifications
                </Button>
              }
            />
          ) : (
            <EmptyState size="sm" icon="check" title="Nothing needs you" message="Every request has been dealt with." />
          )}
        </Card>

        <Card>
          <CardHeader
            title="My work today"
            description="Just the things with your name on them"
            actions={work.length ? <Badge>{work.length}</Badge> : undefined}
          />
          {work.length ? (
            <WorkQueue
              items={work}
              limit={6}
              onOpen={openTarget}
              more={<p className="text-body-13 text-text-muted">and {work.length - 6} more</p>}
            />
          ) : (
            <EmptyState size="sm" icon="check" title="You are clear" message="Nothing is assigned to you right now." />
          )}
        </Card>
      </div>

      {/* ---------- BUSINESS ---------- */}
      {seesMoney && (
        <>
          <SectionHeader title="Business" />
          <StatGrid className="xl:grid-cols-3">
            <StatCard
              icon="coins"
              label="Sales this month"
              value={nairaShort(monthSales)}
              caption={'since ' + niceDate(MONTH_START)}
            />
            <StatCard
              icon="receipt"
              tone={owing.length ? 'warning' : 'default'}
              label="Owed by customers"
              value={nairaShort(owedTotal(s))}
              caption={owing.length + ' orders not settled'}
            />
            <StatCard
              icon="scissors"
              label="In production"
              value={openJobs.length}
              delta={late.length ? { label: late.length + ' of them late', good: false } : undefined}
              caption={late.length ? undefined : '0 of them late'}
            />
            <StatCard
              icon="tag"
              tone="success"
              label="Ready for pickup"
              value={readyWaiting.length}
              caption="waiting to be collected"
            />
            <StatCard
              icon="layers"
              tone={low.length ? 'warning' : 'default'}
              label="Low stock"
              value={low.length}
              caption={low.length ? low.map((m) => m.name).slice(0, 2).join(', ') : 'nothing to reorder'}
            />
            <StatCard icon="wallet" label="Payroll estimate" value={nairaShort(payrollEstimate)} caption="before deductions" />
          </StatGrid>

          {/* ---------- BRANCHES ---------- */}
          <SectionHeader title="Branches" description="Tap a branch to view it" />
          <BranchesTable s={s} />
        </>
      )}

      {/* ---------- ACTIVITY ---------- */}
      <SectionHeader
        title="As it happens"
        actions={
          s.log.length > 6 ? (
            <Button variant="link" size="sm" rightIcon="chevR" onClick={() => go('history')}>
              All activity
            </Button>
          ) : undefined
        }
      />
      {s.log.length ? (
        <List>
          {s.log.slice(0, 6).map((l, i) => (
            <ListItem
              key={l.at + '-' + i}
              leading={<Avatar name={l.who} size="sm" />}
              title={l.what}
              description={l.who + ' · ' + l.role + (l.detail ? ' · ' + l.detail : '')}
              trailing={<time className="text-body-12 whitespace-nowrap text-text-muted tabular-nums">{timeOf(l.at)}</time>}
            />
          ))}
        </List>
      ) : (
        <EmptyState
          bordered
          icon="history"
          title="Nothing yet today"
          message="Take an order or issue fabric and it shows up here."
        />
      )}
    </>
  );
}


/** The day's three asks, ruled like a tailor's docket. Each line opens the screen behind it. */
function Docket({ title, urgent, rows }: { title: string; urgent: number; rows: (HeroFigure & { onClick?: () => void })[] }) {
  return (
    <aside className="rounded-card bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-eyebrow text-text-muted">{title}</p>
        {urgent > 0 && <span className="text-eyebrow text-accent">{urgent} urgent</span>}
      </div>
      <ul className="mt-3">
        {rows.map((r) => {
          const body = (
            <>
              <Icon name={r.icon} size={15} className="shrink-0 text-text-muted" />
              <span className="min-w-0 flex-1 truncate text-body-14 text-text-secondary">{r.label}</span>
              <span className="font-display text-[24px] leading-none text-text tabular-nums">{r.value}</span>
            </>
          );
          const cls = 'flex w-full items-center gap-3 py-3 text-left';
          return (
            <li key={r.label} className="stitch border-b last:border-b-0">
              {r.onClick ? (
                <button type="button" onClick={r.onClick} className={cls + ' group'}>
                  {body}
                  <Icon name="chevR" size={14} className="shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" />
                </button>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

/** A work queue capped at `limit`, with a "more" line underneath. */
function WorkQueue({
  items,
  limit,
  onOpen,
  more,
}: {
  items: WorkItem[];
  limit: number;
  onOpen: (target: WorkItem['target']) => void;
  more: ReactNode;
}) {
  return (
    <Queue>
      {items.slice(0, limit).map((w, i) => (
        <QueueItem
          key={i}
          icon={w.icon}
          urgent={w.urgent}
          title={w.title}
          description={w.body}
          onClick={w.target ? () => onOpen(w.target) : undefined}
          actions={w.urgent && !w.target ? <Badge tone="danger" size="sm">urgent</Badge> : undefined}
        />
      ))}
      {items.length > limit && <li className="px-5 py-3 md:px-6">{more}</li>}
    </Queue>
  );
}

/** Today for people who do not see the takings: their own jobs, fabric and clock-in. */
function MyToday({ s }: { s: AppState }) {
  const jobs = branchJobs(s);
  const myJobs = jobs.filter((j) => j.assigned === s.actor && j.stage !== 'delivery');
  const myLate = myJobs.filter(isLate).length;
  const myFab = s.issues.filter((i) => i.to === s.actor && i.status === 'issued' && !i.returned);
  const att = s.attendance.find((a) => a.staff === s.actor && a.date === TODAY);
  return (
    <StatGrid>
      <StatCard
        icon="scissors"
        tone={myLate ? 'danger' : 'default'}
        label="Your jobs"
        value={myJobs.length}
        delta={myLate ? { label: myLate + ' late', good: false } : undefined}
        caption={myLate ? undefined : 'none late'}
      />
      <StatCard
        icon="layers"
        label="Fabric with you"
        value={qty(myFab.reduce((n, i) => n + (i.issued ?? 0), 0))}
        unit="yd"
        caption={myFab.length ? 'across ' + myFab.length + ' job' + (myFab.length === 1 ? '' : 's') : 'nothing out'}
      />
      <StatCard
        icon="clock"
        tone={att?.late ? 'warning' : att ? 'success' : 'default'}
        label="You clocked in"
        value={att ? att.in : '—'}
        caption={att ? (att.late ? 'marked late' : 'on time') : 'not yet'}
      />
      <StatCard
        icon="check"
        tone="success"
        label="Finished"
        value={jobs.filter((j) => j.assigned === s.actor && j.stage === 'delivery').length}
        caption="garments delivered"
      />
    </StatGrid>
  );
}

function SalesCard({ s }: { s: AppState }) {
  const range = s.range || '30d';
  const series = salesSeries(s, range);
  const windowTotal = series.orders.reduce((a, b) => a + b, 0) + series.shop.reduce((a, b) => a + b, 0);
  const total = naira(windowTotal * 100);
  return (
    <Card className="xl:col-span-2">
      <CardHeader
        title="Sales"
        description="Money that actually came in"
        actions={<Tabs size="sm" aria-label="Sales range" options={RANGES} value={range} onChange={setSalesRange} />}
      />
      <CardBody>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <p className="font-display text-[36px] leading-none text-text tabular-nums">
            <span className="mr-1 align-[0.6em] font-sans text-[15px] font-medium text-text-muted">{total[0]}</span>
            {total.slice(1)}
          </p>
          <ChartLegend
            items={[
              { label: 'Custom orders', colour: SERIES_COLOURS.orders },
              { label: 'Ready to wear', colour: SERIES_COLOURS.shop },
            ]}
          />
        </div>
        <div className="mt-5">
          <LineChart
            labels={series.labels}
            series={[
              { name: 'from orders', colour: SERIES_COLOURS.orders, values: series.orders, format: nairaWhole },
              { name: 'from the rail', colour: SERIES_COLOURS.shop, values: series.shop, format: nairaWhole },
            ]}
          />
        </div>
      </CardBody>
    </Card>
  );
}

interface BranchRow {
  branch: Branch;
  sales: number;
  open: number;
  late: number;
  staffIn: number;
  roster: number;
  low: number;
  owed: number;
}

function BranchesTable({ s }: { s: AppState }) {
  const rows: BranchRow[] = s.branches.map((b) => {
    const bo = s.orders.filter((o) => o.branch === b.id);
    return {
      branch: b,
      sales: takings(s, b.id, TODAY).total,
      open: bo.filter((o) => o.status === 'making').length,
      late: s.jobs.filter((j) => orderBranch(s, j.order) === b.id && isLate(j)).length,
      staffIn: s.attendance.filter((a) => a.date === TODAY && s.staff.find((x) => x.id === a.staff)?.branch === b.id).length,
      roster: s.staff.filter((x) => x.branch === b.id).length,
      low: s.materials.filter((m) => (m.stock[b.id] ?? 0) <= m.reorder).length,
      owed: bo.reduce((n, o) => n + balanceOf(o), 0),
    };
  });

  const columns: Column<BranchRow>[] = [
    {
      key: 'name',
      header: 'Branch',
      sortValue: (r) => r.branch.name,
      cell: (r) => (
        <span className="flex items-center gap-2 font-semibold text-text">
          {r.branch.name}
          {r.branch.id === s.branch && (
            <Badge tone="accent" size="sm">
              viewing
            </Badge>
          )}
        </span>
      ),
    },
    { key: 'sales', header: 'Sales today', align: 'right', sortValue: (r) => r.sales, cell: (r) => <span className="tabular-nums">{naira(r.sales)}</span> },
    { key: 'open', header: 'Orders open', align: 'right', sortValue: (r) => r.open, cell: (r) => <span className="tabular-nums">{r.open}</span> },
    {
      key: 'late',
      header: 'Late',
      align: 'right',
      sortValue: (r) => r.late,
      cell: (r) => (r.late ? <Badge tone="danger">{r.late}</Badge> : <span className="tabular-nums">0</span>),
    },
    {
      key: 'staff',
      header: 'Staff in',
      align: 'right',
      hideOnMobile: true,
      sortValue: (r) => r.staffIn,
      cell: (r) => (
        <span className="tabular-nums">
          {r.staffIn}/{r.roster}
        </span>
      ),
    },
    {
      key: 'low',
      header: 'Low stock',
      align: 'right',
      hideOnMobile: true,
      sortValue: (r) => r.low,
      cell: (r) => (r.low ? <Badge tone="warning">{r.low}</Badge> : <span className="tabular-nums">0</span>),
    },
    { key: 'owed', header: 'Owed', align: 'right', sortValue: (r) => r.owed, cell: (r) => <span className="tabular-nums">{naira(r.owed)}</span> },
  ];

  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(r) => r.branch.id}
      onRowClick={(r) => setBranch(r.branch.id)}
      rowClassName={(r) => (r.branch.id === s.branch ? '[&>td]:bg-accent-wash' : undefined)}
      itemNoun="branches"
      caption="Branches"
    />
  );
}
