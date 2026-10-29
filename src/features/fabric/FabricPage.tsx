import {
  Badge,
  Button,
  Card,
  CardHeader,
  DataTable,
  PageHeader,
  ProgressBar,
  Queue,
  QueueItem,
  SectionHeader,
  StatCard,
  StatGrid,
  type Column,
  type ProgressTone,
} from '@/components/ui';
import { MaterialSwatch } from './MaterialSwatch';
import { naira, nairaShort, qty } from '@/lib/format';
import { useApp } from '@/store/hooks';
import { branchName, can, jobOf, materialOf, myBranch, nameOf, orderOf, stockOf, styleOf } from '@/store/selectors';
import { decideIssue, exportFabric } from '@/store/actions/fabric';
import { openSheet } from '@/store/ui/sheetStore';
import type { FabricIssue, Material } from '@/types/domain';

type StockRow = { m: Material; have: number };

const stockTone = (have: number, reorder: number): ProgressTone =>
  have <= reorder / 2 ? 'danger' : have <= reorder ? 'warning' : 'success';

export function FabricPage() {
  const s = useApp();
  const here = myBranch(s);
  const canBuy = can(s, 'buy');
  const canEditStock = can(s, 'issue') || canBuy;
  const pend = s.issues.filter((i) => i.status === 'needs_approval');
  const out = s.issues.filter((i) => i.status === 'issued' && !i.returned);
  const done = s.issues.filter((i) => i.returned && i.result);

  const stock: StockRow[] = s.materials.map((m) => ({ m, have: stockOf(s, m.id, here) }));
  const low = stock.filter((r) => r.have <= r.m.reorder).length;
  const worth = stock.reduce((n, r) => n + r.have * r.m.cost, 0);
  const outYards = out.reduce((n, i) => n + (i.issued ?? 0), 0);
  const missing = done.reduce((n, i) => n + Math.max(0, i.result!.gap), 0);

  const stockCols: Column<StockRow>[] = [
    {
      key: 'item',
      header: 'Item',
      sortValue: (r) => r.m.name,
      cell: (r) => (
        <span className="flex items-center gap-3">
          <MaterialSwatch material={r.m} />
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="font-semibold text-text">{r.m.name}</span>
            {r.m.patterned && <Badge size="sm">patterned</Badge>}
          </span>
        </span>
      ),
    },
    { key: 'kind', header: 'Type', sortValue: (r) => r.m.kind, cell: (r) => r.m.kind, hideOnMobile: true },
    {
      key: 'left',
      header: 'Left',
      width: 220,
      sortValue: (r) => r.have,
      cell: (r) => (
        <ProgressBar
          size="sm"
          value={r.have}
          max={Math.max(r.m.reorder * 3, r.have, 1)}
          tone={stockTone(r.have, r.m.reorder)}
          label={<span className="tabular-nums">{qty(r.have) + ' ' + r.m.unit}</span>}
        />
      ),
    },
    { key: 'reorder', header: 'Reorder at', align: 'right', sortValue: (r) => r.m.reorder, cell: (r) => <span className="tabular-nums">{qty(r.m.reorder)}</span> },
    {
      key: 'worth',
      header: 'Worth',
      align: 'right',
      sortValue: (r) => r.have * r.m.cost,
      cell: (r) => <span className="font-medium text-text tabular-nums">{naira(r.have * r.m.cost)}</span>,
      hideOnMobile: true,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      sortValue: (r) => r.have <= r.m.reorder,
      cell: (r) => (r.have <= r.m.reorder ? <Badge tone="warning">order more</Badge> : <Badge tone="success">fine</Badge>),
    },
    ...(canBuy
      ? [
          {
            key: 'act',
            header: <span className="sr-only">Actions</span>,
            align: 'right',
            cell: (r) =>
              r.have <= r.m.reorder ? (
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon="truck"
                  onClick={(e) => {
                    e.stopPropagation();
                    openSheet({ type: 'newPurchaseOrder', materialId: r.m.id });
                  }}
                >
                  Order
                </Button>
              ) : null,
          } satisfies Column<StockRow>,
        ]
      : []),
  ];

  const outCols: Column<FabricIssue>[] = [
    { key: 'job', header: 'Job', sortValue: (i) => i.job, cell: (i) => <span className="font-semibold text-text tabular-nums">{i.job}</span> },
    {
      key: 'fabric',
      header: 'Fabric',
      sortValue: (i) => materialOf(s, i.material).name,
      cell: (i) => (
        <span className="flex items-center gap-2.5">
          <MaterialSwatch material={materialOf(s, i.material)} size={28} />
          {materialOf(s, i.material).name}
        </span>
      ),
    },
    { key: 'given', header: 'Given', align: 'right', sortValue: (i) => i.issued, cell: (i) => <span className="tabular-nums">{qty(i.issued)}</span> },
    { key: 'needs', header: 'Style needs', align: 'right', sortValue: (i) => i.expected, cell: (i) => <span className="tabular-nums">{qty(i.expected)}</span>, hideOnMobile: true },
    { key: 'with', header: 'With', sortValue: (i) => nameOf(s, i.to), cell: (i) => nameOf(s, i.to) },
    {
      key: 'act',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      cell: (i) => (
        <Button variant="secondary" size="sm" onClick={() => openSheet({ type: 'returnFabric', issueId: i.id })}>
          Bring back
        </Button>
      ),
    },
  ];

  const doneCols: Column<FabricIssue>[] = [
    { key: 'job', header: 'Job', sortValue: (i) => i.job, cell: (i) => <span className="font-semibold text-text tabular-nums">{i.job}</span> },
    { key: 'who', header: 'Who', sortValue: (i) => nameOf(s, i.to), cell: (i) => nameOf(s, i.to) },
    { key: 'given', header: 'Given', align: 'right', sortValue: (i) => i.issued, cell: (i) => <span className="tabular-nums">{qty(i.issued)}</span> },
    { key: 'used', header: 'Used', align: 'right', sortValue: (i) => i.result!.used, cell: (i) => <span className="tabular-nums">{qty(i.result!.used)}</span>, hideOnMobile: true },
    { key: 'back', header: 'Back', align: 'right', sortValue: (i) => i.result!.back, cell: (i) => <span className="tabular-nums">{qty(i.result!.back)}</span>, hideOnMobile: true },
    { key: 'waste', header: 'Waste', align: 'right', sortValue: (i) => i.result!.waste, cell: (i) => <span className="tabular-nums">{qty(i.result!.waste)}</span> },
    {
      key: 'gap',
      header: 'Missing',
      align: 'right',
      sortValue: (i) => i.result!.gap,
      cell: (i) => (i.result!.gap > 0 ? <Badge tone="danger">{qty(i.result!.gap)}</Badge> : <span className="tabular-nums text-text-muted">0</span>),
    },
    { key: 'reason', header: 'Reason', cell: (i) => i.result!.reason || i.result!.cat || '—', hideOnMobile: true },
  ];

  return (
    <>
      <PageHeader
        title="Fabric store"
        description="Nothing leaves the store without a job and a name against it."
        actions={
          <>
            <Button variant="secondary" leftIcon="download" onClick={exportFabric}>
              Download
            </Button>
            {canEditStock && (
              <Button variant="secondary" leftIcon="plus" onClick={() => openSheet({ type: 'materialForm' })}>
                Add material
              </Button>
            )}
            {canBuy && (
              <Button variant="secondary" leftIcon="truck" onClick={() => openSheet({ type: 'newPurchaseOrder' })}>
                Buy more
              </Button>
            )}
            {(can(s, 'request') || can(s, 'issue')) && (
              <Button leftIcon="plus" onClick={() => openSheet({ type: 'askFabric' })}>
                Ask for fabric
              </Button>
            )}
          </>
        }
      />

      <StatGrid>
        <StatCard
          label="Items low"
          value={low}
          icon="layers"
          tone={low ? 'warning' : 'success'}
          caption={low ? 'at or below reorder level' : 'everything well stocked'}
        />
        <StatCard label="Value in store" value={nairaShort(worth)} icon="coins" caption={'at ' + branchName(s, here)} />
        <StatCard label="Fabric out now" value={qty(outYards)} unit="yd" icon="scissors" caption={out.length + ' with someone'} />
        <StatCard
          label="Missing yards"
          value={qty(missing)}
          unit="yd"
          icon="x"
          tone={missing > 0 ? 'danger' : 'success'}
          caption={missing > 0 ? 'nobody could account for' : 'every yard accounted for'}
        />
      </StatGrid>

      {pend.length > 0 && (
        <Card className="mt-6">
          <CardHeader
            title={
              <>
                Waiting for approval <Badge tone="warning">{pend.length}</Badge>
              </>
            }
            description="These ask for more than the style allows."
          />
          <Queue>
            {pend.map((i) => {
              const j = jobOf(s, i.job);
              const o = j && orderOf(s, j.order);
              const st = styleOf(s, o?.style ?? '');
              const allow = Math.round(i.expected * (1 + st.tol / 100) * 100) / 100;
              return (
                <QueueItem
                  key={i.id}
                  icon="layers"
                  urgent
                  title={nameOf(s, i.to) + ' wants ' + qty(i.requested) + ' yards of ' + materialOf(s, i.material).name}
                  description={
                    <>
                      Job {i.job} · {st.name} normally takes {qty(i.expected)} yards, and up to {qty(allow)} is allowed
                      without asking. Reason given: "{i.reason || '—'}"
                    </>
                  }
                  actions={
                    <>
                      <Button variant="secondary" size="sm" onClick={() => decideIssue(i.id, false)}>
                        Turn it down
                      </Button>
                      <Button size="sm" leftIcon="check" onClick={() => decideIssue(i.id, true)}>
                        Approve
                      </Button>
                    </>
                  }
                />
              );
            })}
          </Queue>
        </Card>
      )}

      <SectionHeader title={'What is in the store at ' + branchName(s, here)} />
      <DataTable
        data={stock}
        columns={stockCols}
        rowKey={(r) => r.m.id}
        itemNoun="items"
        /* the whole store on one page: you scan it top to bottom when counting or ordering */
        pageSize={null}
        onRowClick={canEditStock ? (r) => openSheet({ type: 'materialForm', id: r.m.id }) : undefined}
      />

      <SectionHeader title="Out with someone right now" />
      <DataTable
        data={out}
        columns={outCols}
        rowKey={(i) => i.id}
        itemNoun="issues"
        emptyTitle="Nothing is out"
        emptyMessage="Every yard is accounted for."
        emptyIcon="check"
      />

      {done.length > 0 && (
        <>
          <SectionHeader title="Waste and missing fabric" />
          <DataTable
            data={done}
            columns={doneCols}
            rowKey={(i) => i.id}
            itemNoun="returns"
            defaultSort={{ key: 'gap', direction: 'desc' }}
          />
        </>
      )}
    </>
  );
}
