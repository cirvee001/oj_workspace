import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  IconChip,
  List,
  ListItem,
  PageHeader,
  ProgressBar,
  SectionHeader,
  Switch,
  type BadgeTone,
  type Column,
} from '@/components/ui';
import { isBirthdayToday } from '@/lib/dates';
import type { Campaign } from '@/types/domain';
import { useApp } from '@/store/hooks';
import { can, customerOwes, customerSpent, quietCustomers } from '@/store/selectors';
import { sendToGroup, toggleAutomation } from '@/store/actions/marketing';

const statusTone = (status: Campaign['status']): BadgeTone =>
  status === 'sent' ? 'success' : status === 'draft' ? 'neutral' : 'accent';

type Group = { name: string; count: number };

export function MarketingPage() {
  const s = useApp();
  const market = can(s, 'market');
  const groups: Group[] = [
    { name: 'Everyone', count: s.customers.length },
    { name: 'Birthdays today', count: s.customers.filter((c) => isBirthdayToday(c.birthday)).length },
    { name: 'Spent over ₦100,000', count: s.customers.filter((c) => customerSpent(s, c.id) > 10_000_000).length },
    { name: 'Owing money', count: s.customers.filter((c) => customerOwes(s, c.id) > 0).length },
    { name: 'No order in 6 months', count: quietCustomers(s).length },
  ];

  const groupColumns: Column<Group>[] = [
    {
      key: 'name',
      header: 'Group',
      cell: (g) => (
        <span className="flex items-center gap-3">
          <IconChip icon="users" />
          <span className="font-semibold text-text">{g.name}</span>
        </span>
      ),
      sortValue: (g) => g.name,
    },
    {
      key: 'count',
      header: 'How many',
      align: 'right',
      cell: (g) => <span className="tabular-nums">{g.count}</span>,
      sortValue: (g) => g.count,
    },
    {
      key: 'send',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      cell: (g) =>
        market && (
          <Button variant="secondary" size="sm" leftIcon="mega" onClick={() => void sendToGroup(g.name, g.count)}>
            Send a message
          </Button>
        ),
    },
  ];

  return (
    <>
      <PageHeader title="Marketing" description="Who to talk to, and what goes out on its own." />

      <SectionHeader title="Groups of customers" className="mt-0" />
      <DataTable data={groups} columns={groupColumns} rowKey={(g) => g.name} pageSize={null} itemNoun="groups" />

      <SectionHeader title="Campaigns" />
      {s.campaigns.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {s.campaigns.map((c) => (
            <Card key={c.id} padding="tight" className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-body-15 font-bold text-text">{c.name}</h3>
                  <p className="mt-0.5 truncate text-body-13 text-text-secondary">{c.segment}</p>
                </div>
                <Badge tone={statusTone(c.status)}>{c.status}</Badge>
              </div>
              <div>
                <Badge size="sm" variant="outline">
                  {c.channel}
                </Badge>
              </div>
              <div className="mt-auto">
                {c.sent ? (
                  <ProgressBar
                    value={c.replies}
                    max={c.sent}
                    tone="success"
                    size="sm"
                    label={c.sent + ' sent, ' + c.replies + ' replied'}
                    valueLabel={Math.round((c.replies / c.sent) * 100) + '%'}
                  />
                ) : (
                  <p className="text-body-13 text-text-muted">not sent yet</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No campaigns yet" icon="mega" bordered />
      )}

      <SectionHeader title="Messages that send themselves" />
      <List>
        {s.automations.map((a) => (
          <ListItem
            key={a.id}
            leading={<IconChip icon="spark" tone={a.on ? 'accent' : 'neutral'} />}
            title={'When: ' + a.trigger}
            description={'"' + a.msg + '"'}
            trailing={
              market ? (
                <Switch checked={a.on} onChange={() => toggleAutomation(a.id)} label={(a.on ? 'Turn off: ' : 'Turn on: ') + a.trigger} />
              ) : (
                <Badge tone={a.on ? 'success' : 'neutral'}>{a.on ? 'on' : 'off'}</Badge>
              )
            }
          />
        ))}
      </List>
    </>
  );
}
