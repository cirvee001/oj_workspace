import type { PayrollLine } from '@/types/domain';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardFooter,
  CardHeader,
  DataTable,
  EmptyState,
  FooterCell,
  Note,
  PageHeader,
  StatCard,
  StatGrid,
  type Column,
} from '@/components/ui';
import { naira, nairaShort } from '@/lib/format';
import { approvePayroll, preparePayroll, submitPayroll } from '@/store/actions/people';
import { useApp } from '@/store/hooks';
import { can, nameOf } from '@/store/selectors';

const dash = <span className="text-text-muted">—</span>;

/** Monthly payroll: worked out from the system, sent for approval, then locked. */
export function PayrollPage() {
  const s = useApp();
  const p = s.payroll;
  const isOwner = can(s, '*');
  const header = <PageHeader title="Payroll" description={p.month + ' · nothing is paid until the owner approves it.'} />;

  if (!can(s, 'payroll.prepare') && !isOwner) {
    return (
      <>
        {header}
        <EmptyState bordered icon="wallet" title="Not for you" message="Only managers and the owner work on payroll." />
      </>
    );
  }

  if (p.status === 'draft' && !p.lines.length) {
    return (
      <>
        {header}
        <EmptyState
          bordered
          icon="wallet"
          title={'Payroll for ' + p.month}
          message="Payroll is worked out from what the system already knows: salaries, who turned up, who was late, and anything they owe back."
          action={
            <Button leftIcon="spark" onClick={preparePayroll}>
              Work out this month’s payroll
            </Button>
          }
        />
      </>
    );
  }

  const total = p.lines.reduce((n, l) => n + l.net, 0);
  const totalLate = p.lines.reduce((n, l) => n + l.lateMins, 0);
  const totalDeduct = p.lines.reduce((n, l) => n + l.deduct, 0);
  const totalBonus = p.lines.reduce((n, l) => n + l.bonus, 0);
  const totalBase = p.lines.reduce((n, l) => n + l.base, 0);
  const statusLabel = p.status === 'draft' ? 'Draft' : p.status === 'pending' ? 'Waiting' : 'Approved';
  const statusFoot =
    p.status === 'pending'
      ? 'prepared by ' + nameOf(s, p.preparedBy)
      : p.status === 'approved'
        ? 'approved by ' + nameOf(s, p.approvedBy)
        : 'not sent yet';

  const columns: Column<PayrollLine>[] = [
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
    { key: 'base', header: 'Salary', align: 'right', sortValue: (l) => l.base, cell: (l) => <span className="tabular-nums">{naira(l.base)}</span> },
    {
      key: 'late',
      header: 'Late',
      align: 'right',
      sortValue: (l) => l.lateMins,
      hideOnMobile: true,
      cell: (l) => (l.lateMins ? <Badge tone="warning">{l.lateMins + ' min'}</Badge> : dash),
    },
    {
      key: 'deduct',
      header: 'Taken off',
      align: 'right',
      sortValue: (l) => l.deduct,
      hideOnMobile: true,
      cell: (l) => (l.deduct ? <span className="text-danger-text tabular-nums">{naira(l.deduct)}</span> : dash),
    },
    {
      key: 'bonus',
      header: 'Bonus',
      align: 'right',
      sortValue: (l) => l.bonus,
      hideOnMobile: true,
      cell: (l) => (l.bonus ? <span className="text-success-text tabular-nums">{naira(l.bonus)}</span> : dash),
    },
    {
      key: 'net',
      header: 'Take home',
      align: 'right',
      sortValue: (l) => l.net,
      cell: (l) => <span className="font-semibold text-text tabular-nums">{naira(l.net)}</span>,
    },
  ];

  return (
    <>
      {header}
      <StatGrid className="xl:grid-cols-3">
        <StatCard icon="users" label="Staff on this run" value={p.lines.length} />
        <StatCard icon="wallet" label="Total to pay" value={nairaShort(total)} />
        <StatCard
          icon={p.status === 'approved' ? 'check' : 'clock'}
          tone={p.status === 'approved' ? 'success' : p.status === 'pending' ? 'warning' : 'default'}
          label="Status"
          value={statusLabel}
          caption={statusFoot}
        />
      </StatGrid>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title={'Payroll for ' + p.month} description={p.lines.length + ' staff · ' + naira(total) + ' to pay'} divided />
        <DataTable
          bare
          data={p.lines}
          columns={columns}
          rowKey={(l) => l.staff}
          pageSize={null}
          itemNoun="staff"
          footer={
            <tr>
              <FooterCell>Total</FooterCell>
              <FooterCell align="right" className="tabular-nums">
                {naira(totalBase)}
              </FooterCell>
              <FooterCell align="right" className="tabular-nums max-md:hidden">
                {totalLate ? totalLate + ' min' : '—'}
              </FooterCell>
              <FooterCell align="right" className="tabular-nums max-md:hidden">
                {totalDeduct ? naira(totalDeduct) : '—'}
              </FooterCell>
              <FooterCell align="right" className="tabular-nums max-md:hidden">
                {totalBonus ? naira(totalBonus) : '—'}
              </FooterCell>
              <FooterCell align="right" className="tabular-nums">
                {naira(total)}
              </FooterCell>
            </tr>
          }
        />
        <CardFooter className="justify-between">
          {p.status === 'draft' && (
            <>
              <span className="text-body-13 text-text-secondary">Not sent yet. Check the figures, then send it on.</span>
              <Button leftIcon="check" onClick={submitPayroll}>
                Send to the owner for approval
              </Button>
            </>
          )}
          {p.status === 'pending' &&
            (isOwner ? (
              <>
                <span className="text-body-13 text-text-secondary">{'Prepared by ' + nameOf(s, p.preparedBy) + '.'}</span>
                <Button leftIcon="check" onClick={approvePayroll}>
                  Approve and issue payslips
                </Button>
              </>
            ) : (
              <Alert tone="warning" title="Waiting for the owner" className="w-full" />
            ))}
          {p.status === 'approved' && <Alert tone="success" title="Approved — locked. A correction goes on next month." className="w-full" />}
        </CardFooter>
      </Card>

      <Note className="mt-4">
        Lateness is taken from the clock-in tablet, not typed in by anyone. Whoever prepares payroll cannot be the one who
        approves it.
      </Note>
    </>
  );
}
