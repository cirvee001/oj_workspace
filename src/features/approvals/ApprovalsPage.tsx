import { useState } from 'react';
import {
  Badge,
  Button,
  DetailCard,
  EmptyState,
  FocusPanel,
  IconChip,
  List,
  ListItem,
  PageHeader,
  SectionHeader,
  StatCard,
  StatGrid,
  onAccent,
  type FocusItem,
} from '@/components/ui';
import { pendingApprovals, type ApprovalItem } from '@/store/derived';
import { useApp } from '@/store/hooks';
import { branchName, can, nameOf } from '@/store/selectors';
import { openSheet } from '@/store/ui/sheetStore';

const keyOf = (a: ApprovalItem) => a.kind + a.id;

export function ApprovalsPage() {
  const s = useApp();
  const all = pendingApprovals(s);
  const mine = all.filter((a) => can(s, a.perm));
  const others = all.filter((a) => !can(s, a.perm));
  const [selected, setSelected] = useState<string | null>(null);

  const items: FocusItem[] = mine.map((a) => ({
    key: keyOf(a),
    title: a.what,
    avatarName: a.by ? nameOf(s, a.by) : undefined,
    detail: a.kind + (a.by === s.actor ? ' · you asked for this' : ''),
    trailing: a.urgent ? 'Urgent' : undefined,
  }));
  const current = mine.find((a) => keyOf(a) === selected);

  return (
    <>
      <PageHeader
        title="Approvals"
        description="Everything waiting on a decision, in one place. You cannot approve something you asked for yourself."
        actions={
          !can(s, 'money') && (
            <Button variant="secondary" leftIcon="coins" onClick={() => openSheet({ type: 'addExpense' })}>
              Submit a cost
            </Button>
          )
        }
      />
      <StatGrid>
        <StatCard icon="check" label="Waiting on you" value={mine.length} caption={all.length + ' waiting in total'} />
        <StatCard
          icon="bell"
          tone={mine.some((a) => a.urgent) ? 'danger' : 'default'}
          label="Urgent"
          value={mine.filter((a) => a.urgent).length}
          caption="holding up production or money"
        />
        <StatCard
          icon="layers"
          tone="warning"
          label="Extra material"
          value={all.filter((a) => a.kind === 'Extra material').length}
          caption="fabric over the style allowance"
        />
        <StatCard
          icon="cal"
          label="Leave & expenses"
          value={all.filter((a) => a.kind === 'Leave' || a.kind === 'Expense').length}
          caption="people and spending"
        />
      </StatGrid>

      <SectionHeader title="Waiting for a decision" />
      {mine.length ? (
        <FocusPanel
          title="Your decisions"
          description={mine.length + ' waiting · urgent ones first'}
          items={[...items].sort((a, b) => Number(!!b.trailing) - Number(!!a.trailing))}
          selectedKey={selected}
          onSelect={setSelected}
          detail={current && <ApprovalDetail a={current} own={current.by === s.actor} requester={current.by ? nameOf(s, current.by) : '—'} branch={branchName(s, current.branch)} />}
        />
      ) : (
        <EmptyState bordered title="Nothing waiting" message="Every request has been dealt with." icon="check" />
      )}

      {others.length > 0 && (
        <>
          <SectionHeader
            title={
              <>
                Waiting for someone else <Badge>{others.length}</Badge>
              </>
            }
          />
          <List>
            {others.map((a) => (
              <ListItem
                key={keyOf(a)}
                leading={<IconChip icon={a.icon} tone={a.urgent ? 'warning' : 'neutral'} />}
                title={a.what}
                description={a.kind + ' · ' + a.detail.slice(0, 80)}
                trailing={<Badge>not yours to approve</Badge>}
              />
            ))}
          </List>
        </>
      )}
    </>
  );
}

function ApprovalDetail({ a, own, requester, branch }: { a: ApprovalItem; own: boolean; requester: string; branch: string }) {
  return (
    <DetailCard
      eyebrow={a.kind + (a.urgent ? ' · urgent' : '')}
      title={a.what}
      fields={[
        ['Asked by', requester],
        ['Branch', branch],
      ]}
      actions={
        own ? (
          <span className="inline-flex h-10 items-center rounded-ctl bg-accent-subtle px-4 text-body-14 font-medium text-accent-hover">You asked for this</span>
        ) : (
          <>
            <Button leftIcon="check" className={onAccent.primary} onClick={a.approve}>
              Approve
            </Button>
            {a.decline && (
              <Button variant="secondary" leftIcon="x" className={onAccent.secondary} onClick={a.decline}>
                Decline
              </Button>
            )}
          </>
        )
      }
    >
      {a.detail}
    </DetailCard>
  );
}
