import { BarList } from '@/components/charts/BarChart';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  EmptyState,
  List,
  ListItem,
  Note,
  PageHeader,
  SectionHeader,
  type Column,
} from '@/components/ui';
import { ago } from '@/lib/dates';
import { naira, qty } from '@/lib/format';
import { exportFabric } from '@/store/actions/fabric';
import { useApp } from '@/store/hooks';
import { quietCustomers, tailors } from '@/store/selectors';
import { useOpenCustomer } from '@/hooks/useGo';

interface VarianceRow {
  id: string;
  name: string;
  jobs: number;
  given: number;
  should: number;
  missing: number;
}

interface TailorRow {
  id: string;
  name: string;
  done: number;
  open: number;
  redone: number;
}

const num = (v: string | number) => <span className="tabular-nums">{v}</span>;
const nameCell = (name: string) => (
  <span className="flex items-center gap-2.5 font-semibold text-text">
    <Avatar name={name} size="sm" />
    {name}
  </span>
);

const VARIANCE_COLUMNS: Column<VarianceRow>[] = [
  { key: 'name', header: 'Tailor', sortValue: (r) => r.name, cell: (r) => nameCell(r.name) },
  { key: 'jobs', header: 'Jobs', align: 'right', sortValue: (r) => r.jobs, cell: (r) => num(r.jobs) },
  { key: 'given', header: 'Given', align: 'right', sortValue: (r) => r.given, cell: (r) => num(qty(r.given)) },
  { key: 'should', header: 'Should have used', align: 'right', hideOnMobile: true, sortValue: (r) => r.should, cell: (r) => num(qty(r.should)) },
  {
    key: 'over',
    header: 'Over',
    align: 'right',
    sortValue: (r) => Math.max(0, r.given - r.should),
    cell: (r) => num(r.given > r.should ? '+' + qty(r.given - r.should) : '0'),
  },
  {
    key: 'missing',
    header: 'Missing',
    align: 'right',
    sortValue: (r) => r.missing,
    cell: (r) => (r.missing > 0 ? <Badge tone="danger">{qty(r.missing)}</Badge> : num('0')),
  },
];

const TAILOR_COLUMNS: Column<TailorRow>[] = [
  { key: 'name', header: 'Tailor', sortValue: (r) => r.name, cell: (r) => nameCell(r.name) },
  { key: 'done', header: 'Finished', align: 'right', sortValue: (r) => r.done, cell: (r) => num(r.done) },
  { key: 'open', header: 'In hand', align: 'right', sortValue: (r) => r.open, cell: (r) => num(r.open) },
  {
    key: 'redone',
    header: 'Had to redo',
    align: 'right',
    sortValue: (r) => r.redone,
    cell: (r) => (r.redone ? <Badge tone="danger">{r.redone}</Badge> : num('0')),
  },
];

export function ReportsPage() {
  const s = useApp();
  const openCustomer = useOpenCustomer();

  const variance: VarianceRow[] = tailors(s)
    .map((t) => {
      const iss = s.issues.filter((i) => i.to === t.id && i.issued);
      return {
        id: t.id,
        name: t.name,
        jobs: iss.length,
        given: iss.reduce((n, i) => n + (i.issued ?? 0), 0),
        should: iss.reduce((n, i) => n + i.expected, 0),
        missing: iss.reduce((n, i) => n + (i.result?.gap ?? 0), 0),
      };
    })
    .filter((r) => r.jobs);

  const byChannel = new Map<string, number>();
  s.orders.forEach((o) => byChannel.set(o.channel, (byChannel.get(o.channel) ?? 0) + o.total));
  const channelTotal = [...byChannel.values()].reduce((a, b) => a + b, 0);
  const channels = [...byChannel.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([channel, total]) => ({
      label: channel,
      value: total,
      display: naira(total),
      hint: channelTotal ? Math.round((total / channelTotal) * 100) + '%' : undefined,
    }));

  const eff: TailorRow[] = tailors(s).map((t) => {
    const theirs = s.jobs.filter((j) => j.assigned === t.id);
    return {
      id: t.id,
      name: t.name,
      done: theirs.filter((j) => j.stage === 'delivery').length,
      open: theirs.filter((j) => j.stage !== 'delivery').length,
      redone: theirs.reduce((n, j) => n + j.reworks, 0),
    };
  });

  const quiet = quietCustomers(s);
  /* When they last ordered (they have gone quiet, so it is over six months ago), or that they never have. */
  const lastOrderLine = (customerId: string, since: string): string => {
    const last = s.orders.filter((o) => o.customer === customerId).reduce((m, o) => (o.created > m ? o.created : m), '');
    return last ? 'Last ordered ' + ago(last).toLowerCase() : 'No order since joining ' + ago(since).toLowerCase();
  };

  return (
    <>
      <PageHeader
        title="Reports"
        description="The numbers that tell you something you did not already know."
        actions={
          <Button variant="secondary" leftIcon="download" onClick={exportFabric}>
            Download fabric usage
          </Button>
        }
      />

      <SectionHeader title="Fabric variance by tailor" className="mt-0" />
      <DataTable
        data={variance}
        columns={VARIANCE_COLUMNS}
        rowKey={(r) => r.id}
        defaultSort={{ key: 'missing', direction: 'desc' }}
        itemNoun="tailors"
        caption="Fabric variance by tailor"
        emptyIcon="layers"
        emptyTitle="Nothing yet"
        emptyMessage="Give out some fabric and this fills in."
      />
      {variance.length > 0 && (
        <Note>
          Over a few months this becomes the most useful page in the system — it shows who loses fabric and who does not,
          without anyone having to accuse anybody.
        </Note>
      )}

      <div className="mt-8 grid items-start gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Where the money comes from" description="Order value by channel" />
          <CardBody>
            {channels.length ? (
              <BarList items={channels} />
            ) : (
              <EmptyState size="sm" icon="coins" title="No orders yet" />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="How the tailors are doing" description="Finished, in hand and redone" divided />
          <DataTable
            bare
            data={eff}
            columns={TAILOR_COLUMNS}
            rowKey={(r) => r.id}
            itemNoun="tailors"
            caption="How the tailors are doing"
            emptyIcon="scissors"
            emptyTitle="No tailors yet"
          />
        </Card>
      </div>

      <SectionHeader
        title={
          <>
            Customers who have gone quiet {quiet.length > 0 && <Badge tone="warning">{quiet.length}</Badge>}
          </>
        }
      />
      {quiet.length ? (
        <List>
          {quiet.map((c) => (
            <ListItem
              key={c.id}
              leading={<Avatar name={c.name} />}
              title={c.name}
              description={lastOrderLine(c.id, c.since) + ' · ' + c.phone}
              trailing={<Badge tone="warning">worth a message</Badge>}
              onClick={() => openCustomer(c.id)}
            />
          ))}
        </List>
      ) : (
        <EmptyState bordered title="Everyone is active" message="No customer has gone quiet." icon="users" />
      )}
    </>
  );
}
