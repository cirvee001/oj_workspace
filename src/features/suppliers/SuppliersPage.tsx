import { Star } from 'lucide-react';
import { Badge, Button, Card, DataTable, Icon, PageHeader, ProgressBar, SectionHeader, type BadgeTone, type Column } from '@/components/ui';
import { cn } from '@/lib/cn';
import { TODAY } from '@/lib/dates';
import { naira, qty } from '@/lib/format';
import { useApp } from '@/store/hooks';
import { can, materialOf, nameOf, supplierOf } from '@/store/selectors';
import { receiveGoods } from '@/store/actions/stock';
import { openSheet } from '@/store/ui/sheetStore';
import type { PurchaseOrder } from '@/types/domain';

const PO_STATUS: Record<PurchaseOrder['status'], { label: string; tone: BadgeTone }> = {
  received: { label: 'all in', tone: 'success' },
  partly: { label: 'partly', tone: 'warning' },
  sent: { label: 'sent', tone: 'info' },
};

const shortDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={rating + ' out of 5'}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={13}
          aria-hidden="true"
          className={cn(n <= rating ? 'fill-current text-warning-text' : 'text-border-interactive')}
        />
      ))}
    </span>
  );
}

export function SuppliersPage() {
  const s = useApp();
  const canBuy = can(s, 'buy');
  const canPay = can(s, 'money');

  const columns: Column<PurchaseOrder>[] = [
    { key: 'id', header: 'Number', sortValue: (p) => p.id, cell: (p) => <span className="font-semibold text-text tabular-nums">{p.id}</span> },
    { key: 'supplier', header: 'Supplier', sortValue: (p) => supplierOf(s, p.supplier).name, cell: (p) => supplierOf(s, p.supplier).name },
    { key: 'what', header: 'What', sortValue: (p) => materialOf(s, p.material).name, cell: (p) => materialOf(s, p.material).name, hideOnMobile: true },
    {
      key: 'arrived',
      header: 'Arrived',
      width: 200,
      sortValue: (p) => (p.ordered ? p.received / p.ordered : 0),
      cell: (p) => (
        <ProgressBar
          size="sm"
          value={p.received}
          max={p.ordered}
          tone={p.received >= p.ordered ? 'success' : p.received > 0 ? 'warning' : 'neutral'}
          label={<span className="tabular-nums">{qty(p.received) + ' of ' + qty(p.ordered)}</span>}
        />
      ),
    },
    {
      key: 'cost',
      header: 'Cost',
      align: 'right',
      sortValue: (p) => p.ordered * p.cost,
      cell: (p) => <span className="font-medium text-text tabular-nums">{naira(p.ordered * p.cost)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (p) => p.status,
      cell: (p) => <Badge tone={PO_STATUS[p.status].tone}>{PO_STATUS[p.status].label}</Badge>,
    },
    {
      key: 'act',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      cell: (p) =>
        p.status !== 'received' && canBuy ? (
          <Button size="sm" variant="secondary" leftIcon="truck" onClick={() => void receiveGoods(p.id)}>
            Record what came
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Buying"
        description="Suppliers, what you ordered, what actually arrived, and what you still owe them."
        actions={
          canBuy && (
            <Button leftIcon="plus" onClick={() => openSheet({ type: 'newPurchaseOrder' })}>
              New purchase order
            </Button>
          )
        }
      />

      <SectionHeader title="Purchase orders" className="mt-0" />
      <DataTable
        data={s.pos}
        columns={columns}
        rowKey={(p) => p.id}
        itemNoun="orders"
        emptyTitle="No purchase orders yet"
        emptyMessage="Orders you send to suppliers appear here."
        emptyIcon="truck"
      />

      <SectionHeader
        title="Suppliers"
        actions={
          canBuy && (
            <Button size="sm" variant="secondary" leftIcon="plus" onClick={() => openSheet({ type: 'supplierForm' })}>
              Add supplier
            </Button>
          )
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {s.suppliers.map((x) => {
          const paid = s.supplierPayments.filter((p) => p.supplier === x.id).slice(0, 2);
          return (
            <Card key={x.id} padding="default" className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-body-15 font-bold text-text">{x.name}</h3>
                  <div className="mt-1">
                    <Stars rating={x.rating} />
                  </div>
                </div>
                {canBuy ? (
                  <Button size="sm" variant="ghost" leftIcon="edit" onClick={() => openSheet({ type: 'supplierForm', id: x.id })}>
                    Edit
                  </Button>
                ) : (
                  <span className="grid size-9 shrink-0 place-items-center rounded-tile bg-accent-subtle text-accent">
                    <Icon name="truck" size={16} />
                  </span>
                )}
              </div>
              <dl className="mt-4 space-y-1.5 text-body-13">
                <div className="flex justify-between gap-3">
                  <dt className="text-text-muted">Phone</dt>
                  <dd className="text-text tabular-nums">{x.phone}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-text-muted">Terms</dt>
                  <dd className="text-right text-text">{x.terms}</dd>
                </div>
              </dl>
              <div className="mt-4 flex items-end justify-between gap-3 border-t border-border pt-4">
                {x.owed > 0 ? (
                  <>
                    <span className="text-body-13 text-text-secondary">You owe</span>
                    <span className="font-display text-heading-18 font-semibold text-danger-text tabular-nums">{naira(x.owed)}</span>
                  </>
                ) : (
                  <>
                    <span className="text-body-13 text-text-secondary">Balance</span>
                    <Badge tone="success">settled</Badge>
                  </>
                )}
              </div>
              {x.owed > 0 && canPay && (
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon="wallet"
                  className="mt-3 self-end"
                  onClick={() => openSheet({ type: 'paySupplier', id: x.id })}
                >
                  Pay
                </Button>
              )}
              {paid.length > 0 && (
                <ul className="stitch mt-3 space-y-1 border-t pt-3 text-body-12">
                  {paid.map((p) => (
                    <li key={p.id} className="flex justify-between gap-3">
                      <span className="truncate text-text-muted">
                        {(p.when === TODAY ? 'Paid today' : 'Paid ' + shortDate(p.when)) + ' · ' + p.method + ' · ' + nameOf(s, p.by)}
                      </span>
                      <span className="text-text tabular-nums">{naira(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
