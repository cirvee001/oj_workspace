import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ChannelChip,
  DashGrid,
  DataTable,
  EmptyState,
  Figure,
  IconChip,
  KeyValue,
  KeyValueList,
  List,
  ListItem,
  PageHeader,
  SectionHeader,
  StatCard,
  StatGrid,
  type Column,
} from '@/components/ui';
import { enquiryStageName } from '@/config/constants';
import { ago, dueDate, isBirthdayToday, longDate, timeOf } from '@/lib/dates';
import { naira } from '@/lib/format';
import { useGo } from '@/hooks/useGo';
import { useApp } from '@/store/hooks';
import { balanceOf, branchName, can, styleOf } from '@/store/selectors';
import { openSheet } from '@/store/ui/sheetStore';
import type { Order } from '@/types/domain';
import { MeasurementBook } from './MeasurementBook';

const dayMonth = (isoDate: string): string =>
  isoDate ? new Date(isoDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) : '—';

/** A customer's full record: who they are, what they ordered and owe, their measurements and history. */
export function CustomerProfilePage() {
  const { id = '' } = useParams<{ id: string }>();
  const s = useApp();
  const go = useGo();
  const c = s.customers.find((x) => x.id === id);

  const orders = useMemo(
    () => s.orders.filter((o) => o.customer === id).sort((a, b) => b.created.localeCompare(a.created)),
    [s.orders, id],
  );

  const columns = useMemo<Column<Order>[]>(
    () => [
      {
        key: 'id',
        header: 'Order',
        cell: (o) => <span className="font-semibold text-text tabular-nums">{o.id}</span>,
        sortValue: (o) => o.id,
      },
      {
        key: 'what',
        header: 'What',
        cell: (o) => (
          <>
            {styleOf(s, o.style).name} · {o.size}
          </>
        ),
        sortValue: (o) => styleOf(s, o.style).name,
        hideOnMobile: true,
      },
      {
        key: 'due',
        header: 'Ready by',
        cell: (o) =>
          o.status === 'cancelled' ? (
            <Badge tone="danger">cancelled</Badge>
          ) : o.status === 'delivered' ? (
            <Badge>delivered</Badge>
          ) : (
            <span className="tabular-nums">{dueDate(o.due)}</span>
          ),
        sortValue: (o) => o.due,
      },
      {
        key: 'total',
        header: 'Total',
        align: 'right',
        cell: (o) => <span className="tabular-nums">{naira(o.total)}</span>,
        sortValue: (o) => o.total,
      },
      {
        key: 'owing',
        header: 'Owing',
        align: 'right',
        cell: (o) => {
          if (o.status === 'cancelled') return <span className="text-text-muted">—</span>;
          const bal = balanceOf(o);
          return bal > 0 ? <Badge tone="danger">{naira(bal)}</Badge> : <Badge tone="success">paid</Badge>;
        },
        sortValue: (o) => balanceOf(o),
      },
    ],
    [s],
  );

  if (!c) {
    return (
      <EmptyState
        bordered
        icon="users"
        title="Customer not found"
        message="They may have been removed, or the link is wrong."
        action={
          <Button variant="secondary" leftIcon="chevL" onClick={() => go('customers')}>
            Back to customers
          </Button>
        }
      />
    );
  }

  const spent = orders.reduce((n, o) => n + o.paid, 0);
  const owes = orders.reduce((n, o) => n + balanceOf(o), 0);
  const making = orders.filter((o) => o.status === 'making').length;
  const lastOrder = orders[0];
  const chat = s.chats.find((x) => x.customer === id);
  const enquiries = s.enquiries.filter((e) => e.customer === id);
  const canEdit = can(s, 'customer') || can(s, 'order');
  const name = c.name.toLowerCase();
  const activity = s.log
    .filter((l) => (l.what + ' ' + l.detail).toLowerCase().includes(name))
    .sort((a, b) => b.at - a.at)
    .slice(0, 8);
  const lastMessages = chat ? chat.messages.slice(-3) : [];

  return (
    <>
      <Button variant="link" leftIcon="chevL" className="mb-1" onClick={() => go('customers')}>
        Customers
      </Button>
      <PageHeader
        title={
          <span className="flex items-center gap-4">
            <Avatar name={c.name} size="lg" />
            <span className="min-w-0">{c.name}</span>
          </span>
        }
        meta={
          <span className="flex flex-wrap items-center gap-1.5">
            <ChannelChip channel={c.channel} />
            {isBirthdayToday(c.birthday) && <Badge tone="danger">birthday today</Badge>}
            {c.tags.map((t) => (
              <Badge key={t} tone={t === 'VIP' ? 'accent' : 'neutral'}>
                {t}
              </Badge>
            ))}
          </span>
        }
        description={'Customer since ' + longDate(c.since) + ' · ' + branchName(s, c.branch)}
        actions={
          <>
            {chat && (
              <Button variant="secondary" leftIcon="chat" onClick={() => openSheet({ type: 'chat', id: chat.id })}>
                Message
              </Button>
            )}
            {canEdit && (
              <Button variant="secondary" leftIcon="edit" onClick={() => openSheet({ type: 'customerForm', id })}>
                Edit
              </Button>
            )}
            {can(s, 'order') && (
              <Button leftIcon="plus" onClick={() => openSheet({ type: 'newOrder', customerId: id })}>
                New order
              </Button>
            )}
          </>
        }
      />

      <StatGrid>
        <StatCard label="Spent with you" value={naira(spent)} />
        <StatCard
          label="Owing"
          value={owes > 0 ? naira(owes) : 'Nothing'}
          tone={owes > 0 ? 'danger' : 'default'}
        />
        <StatCard
          label="Orders"
          value={orders.length}
          caption={making ? making + ' in production' : 'None in production'}
        />
        <StatCard
          label="Last order"
          value={lastOrder ? ago(lastOrder.created) : 'Never'}
          caption={lastOrder ? longDate(lastOrder.created) : undefined}
        />
      </StatGrid>

      <DashGrid className="mt-6">
        <div className="min-w-0">
          <SectionHeader title="Orders" className="mt-0" />
          <DataTable
            data={orders}
            columns={columns}
            rowKey={(o) => o.id}
            onRowClick={(o) => openSheet({ type: 'order', id: o.id })}
            itemNoun="orders"
            emptyIcon="receipt"
            emptyTitle="No orders yet"
            emptyMessage="Their orders will show here."
            pageSize={8}
          />

          <SectionHeader title="Enquiries" />
          {enquiries.length ? (
            <List>
              {enquiries.map((e) => (
                <ListItem
                  key={e.id}
                  leading={<IconChip icon="chat" />}
                  onClick={() => openSheet({ type: 'enquiry', id: e.id })}
                  title={styleOf(s, e.style).name}
                  description={e.id + ' · last contact ' + ago(e.lastContact)}
                  trailing={<Figure value={naira(e.value)} caption={enquiryStageName(e.stage)} />}
                />
              ))}
            </List>
          ) : (
            <EmptyState bordered size="sm" icon="chat" title="No enquiries" />
          )}

          {chat && lastMessages.length > 0 && (
            <>
              <SectionHeader
                title="Conversation"
                actions={
                  <Button variant="ghost" size="sm" onClick={() => openSheet({ type: 'chat', id: chat.id })}>
                    Open
                  </Button>
                }
              />
              <Card padding="tight">
                <ul className="flex flex-col gap-2">
                  {lastMessages.map((m, i) => (
                    <li key={i} className={m.from === 'us' ? 'flex justify-end' : 'flex justify-start'}>
                      <div
                        className={
                          m.from === 'us'
                            ? 'max-w-[80%] rounded-tile bg-accent px-3.5 py-2 text-body-13 text-on-accent'
                            : 'max-w-[80%] rounded-tile bg-surface-sunken px-3.5 py-2 text-body-13 text-text'
                        }
                      >
                        <p>{m.text}</p>
                        <p className="mt-1 text-body-12 opacity-70">{m.at}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader title="Contact" />
            <CardBody>
              <KeyValueList>
                <KeyValue label="Phone">
                  <a className="tabular-nums underline-offset-2 hover:underline" href={'tel:' + c.phone.replace(/\s+/g, '')}>
                    {c.phone}
                  </a>
                </KeyValue>
                <KeyValue label="Birthday">{dayMonth(c.birthday)}</KeyValue>
                <KeyValue label="First came from">{c.channel}</KeyValue>
                <KeyValue label="Branch">{branchName(s, c.branch)}</KeyValue>
                <KeyValue label="Customer since">
                  <span title={longDate(c.since)}>{ago(c.since)}</span>
                </KeyValue>
              </KeyValueList>
            </CardBody>
          </Card>

          {c.notes && (
            <Alert tone="info" title="Notes">
              {c.notes}
            </Alert>
          )}

          <Card>
            <CardHeader
              title="Measurements"
              actions={
                canEdit && (
                  <Button variant="ghost" size="sm" leftIcon="edit" onClick={() => openSheet({ type: 'customerForm', id })}>
                    Update
                  </Button>
                )
              }
            />
            <CardBody>
              <MeasurementBook customer={c} compact />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Activity" />
            {activity.length ? (
              <List bare>
                {activity.map((l, i) => (
                  <ListItem
                    key={i}
                    leading={<IconChip icon="history" />}
                    title={l.what}
                    description={l.detail + ' · ' + l.who}
                    trailing={<span className="text-body-12 text-text-muted tabular-nums">{timeOf(l.at)}</span>}
                  />
                ))}
              </List>
            ) : (
              <CardBody>
                <EmptyState size="sm" icon="history" title="Nothing logged yet" className="rounded-tile bg-surface-sunken" />
              </CardBody>
            )}
          </Card>
        </div>
      </DashGrid>
    </>
  );
}
