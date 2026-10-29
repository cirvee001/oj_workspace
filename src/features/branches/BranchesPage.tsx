import { ArrowRight, MapPin } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconChip,
  List,
  ListItem,
  PageHeader,
  SectionHeader,
  type BadgeTone,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { qty } from '@/lib/format';
import { useApp } from '@/store/hooks';
import { branchName, can, materialOf } from '@/store/selectors';
import { setBranch } from '@/store/actions/session';
import { approveTransfer, receiveTransfer, sendTransfer } from '@/store/actions/stock';
import { openSheet } from '@/store/ui/sheetStore';
import type { AppState, Transfer } from '@/types/domain';

const TRANSFER_STATUS: Record<Transfer['status'], { label: string; tone: BadgeTone }> = {
  requested: { label: 'requested', tone: 'warning' },
  approved: { label: 'approved', tone: 'success' },
  sent: { label: 'in transit', tone: 'info' },
  received: { label: 'received', tone: 'success' },
  declined: { label: 'declined', tone: 'danger' },
};

function TransferAction({ s, t }: { s: AppState; t: Transfer }) {
  switch (t.status) {
    case 'requested':
      return can(s, 'approve') ? (
        <Button size="sm" leftIcon="check" onClick={() => approveTransfer(t.id)}>
          Approve
        </Button>
      ) : (
        <Badge>waiting for a manager</Badge>
      );
    case 'approved':
      return (
        <Button size="sm" leftIcon="truck" onClick={() => sendTransfer(t.id)}>
          Send it
        </Button>
      );
    case 'sent':
      return (
        <Button size="sm" leftIcon="check" onClick={() => void receiveTransfer(t.id)}>
          It has arrived
        </Button>
      );
    default:
      return null;
  }
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-tile bg-surface-sunken px-3.5 py-2.5">
      <p className="font-display text-heading-20 font-semibold text-text tabular-nums">{value}</p>
      <p className="text-body-12 text-text-muted">{label}</p>
    </div>
  );
}

export function BranchesPage() {
  const s = useApp();

  return (
    <>
      <PageHeader
        title="Branches"
        description="Each branch runs itself. You see all of them."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {s.branches.map((b) => {
          const open = s.orders.filter((o) => o.branch === b.id && o.status === 'making').length;
          const staff = s.staff.filter((x) => x.branch === b.id).length;
          const viewing = b.id === s.branch;
          return (
            <Card key={b.id} padding="default" className={cn('flex flex-col', viewing && 'ring-2 ring-accent-subtle')}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <IconChip icon="build" tone={viewing ? 'accent' : 'neutral'} />
                  <div className="min-w-0">
                    <h3 className="truncate text-body-15 font-bold text-text">{b.name}</h3>
                    <p className="mt-0.5 flex items-start gap-1 text-body-13 text-text-secondary">
                      <MapPin size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                      <span className="min-w-0">{b.address}</span>
                    </p>
                  </div>
                </div>
                {viewing ? (
                  <Badge tone="accent" dot>
                    viewing
                  </Badge>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => setBranch(b.id)}>
                    View
                  </Button>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <Stat value={staff} label="staff" />
                <Stat value={open} label="orders open" />
              </div>
              <p className="mt-3 text-body-12 text-text-muted">{'Opens ' + b.opens}</p>
            </Card>
          );
        })}
      </div>

      <SectionHeader
        title="Stock moving between branches"
        actions={
          can(s, 'transfer') && (
            <Button leftIcon="truck" onClick={() => openSheet({ type: 'newTransfer' })}>
              Move stock to another branch
            </Button>
          )
        }
      />
      {s.transfers.length ? (
        <List>
          {s.transfers.map((t) => {
            const m = materialOf(s, t.material);
            const st = TRANSFER_STATUS[t.status];
            return (
              <ListItem
                key={t.id}
                leading={<IconChip icon="truck" tone={t.status === 'sent' ? 'accent' : 'neutral'} />}
                title={
                  <>
                    {qty(t.qty) + ' ' + m.unit + ' of ' + m.name}
                    <Badge size="sm" tone={st.tone}>
                      {st.label}
                    </Badge>
                  </>
                }
                description={
                  <span className="inline-flex flex-wrap items-center gap-x-1.5">
                    {branchName(s, t.from)}
                    <ArrowRight size={12} aria-hidden="true" className="shrink-0" />
                    {branchName(s, t.to)} · {t.id}
                    {t.status === 'sent' && <span className="font-medium text-info-ink"> · belongs to neither branch</span>}
                    {t.note && ' · ' + t.note}
                  </span>
                }
                trailing={<TransferAction s={s} t={t} />}
              />
            );
          })}
        </List>
      ) : (
        <EmptyState bordered icon="truck" title="Nothing moving" message="No stock is being transferred right now." />
      )}
    </>
  );
}
