import { Alert, Badge, Button, Card, CardBody, CardHeader, DataTable, EmptyState, PageHeader, type Column } from '@/components/ui';
import { YARD_VALUE_KOBO } from '@/config/constants';
import { niceDate } from '@/lib/dates';
import { nairaShort, qty, round1 } from '@/lib/format';
import { useApp } from '@/store/hooks';
import { branchName, can, materialOf, nameOf } from '@/store/selectors';
import { acceptCount } from '@/store/actions/stock';
import { openSheet } from '@/store/ui/sheetStore';
import type { AppState } from '@/types/domain';

type Line = AppState['stockCounts'][number]['lines'][number];

export function StockCountsPage() {
  const s = useApp();

  const columns: Column<Line>[] = [
    {
      key: 'item',
      header: 'Item',
      sortValue: (l) => materialOf(s, l.material).name,
      cell: (l) => <span className="font-semibold text-text">{materialOf(s, l.material).name}</span>,
    },
    { key: 'system', header: 'System says', align: 'right', sortValue: (l) => l.system, cell: (l) => <span className="tabular-nums">{qty(l.system)}</span> },
    { key: 'counted', header: 'Actually counted', align: 'right', sortValue: (l) => l.counted, cell: (l) => <span className="tabular-nums">{qty(l.counted)}</span> },
    {
      key: 'diff',
      header: 'Difference',
      align: 'right',
      sortValue: (l) => l.counted - l.system,
      cell: (l) =>
        l.counted === l.system ? (
          <Badge tone="success">matches</Badge>
        ) : (
          <Badge tone="danger">{(l.counted > l.system ? '+' : '') + qty(round1(l.counted - l.system))}</Badge>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Stock counts"
        description="Counting what is physically on the shelf and comparing it to what the system believes. A difference has to be explained."
        actions={
          can(s, 'issue') && (
            <Button leftIcon="layers" onClick={() => openSheet({ type: 'startCount' })}>
              Start a count
            </Button>
          )
        }
      />
      {s.stockCounts.length ? (
        <div className="flex flex-col gap-4">
          {s.stockCounts.map((c) => {
            const diffs = c.lines.filter((l) => l.counted !== l.system);
            const net = c.lines.reduce((n, l) => n + (l.counted - l.system), 0);
            return (
              <Card key={c.id} className="overflow-hidden">
                <CardHeader
                  divided
                  title={c.id + ' · ' + branchName(s, c.branch)}
                  description={'Counted ' + niceDate(c.when) + ' by ' + nameOf(s, c.by)}
                  actions={
                    c.status === 'review' ? (
                      <Badge tone="warning" dot>
                        needs a decision
                      </Badge>
                    ) : (
                      <Badge tone="success">closed</Badge>
                    )
                  }
                />
                <DataTable bare data={c.lines} columns={columns} rowKey={(l) => l.material} itemNoun="items" pageSize={null} />
                {c.status === 'review' && (
                  <CardBody className="border-t border-border pt-5">
                    <Alert
                      tone="warning"
                      title={diffs.length + ' item' + (diffs.length === 1 ? '' : 's') + ' out by ' + qty(round1(net)) + ' in total'}
                      actions={
                        can(s, 'approve') && (
                          <Button size="sm" leftIcon="check" onClick={() => acceptCount(c.id)}>
                            Accept the physical count
                          </Button>
                        )
                      }
                    >
                      Worth about {nairaShort(Math.abs(net) * YARD_VALUE_KOBO)}. Accepting this corrects the stock figures and
                      leaves a permanent record of who accepted it.
                    </Alert>
                  </CardBody>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState bordered icon="layers" title="No counts yet" message="Start one and the shelf gets checked against the system." />
      )}
    </>
  );
}
