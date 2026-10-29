import {
  Alert,
  Avatar,
  Badge,
  Button,
  ChannelChip,
  EmptyState,
  Figure,
  KeyValue,
  KeyValueList,
  List,
  ListItem,
  Note,
  SectionHeader,
  Sheet,
} from '@/components/ui';
import { isBirthdayToday, niceDate } from '@/lib/dates';
import { naira } from '@/lib/format';
import { useGo } from '@/hooks/useGo';
import { useApp } from '@/store/hooks';
import { balanceOf, can, styleOf } from '@/store/selectors';
import { openSheet } from '@/store/ui/sheetStore';

export function CustomerSheet({ id }: { id: string }) {
  const s = useApp();
  const go = useGo();
  const c = s.customers.find((x) => x.id === id);
  if (!c) return null;

  const os = s.orders.filter((o) => o.customer === id);
  const spent = os.reduce((n, o) => n + o.paid, 0);
  const chat = s.chats.find((x) => x.customer === id);
  const sizes = Object.entries(c.sizes);

  return (
    <Sheet
      title={c.name}
      description="Their details, measurements and every order they have placed."
      footer={
        <>
          {chat && (
            <Button variant="secondary" leftIcon="chat" onClick={() => go('chat')}>
              Open the conversation
            </Button>
          )}
          {(can(s, 'customer') || can(s, 'order')) && (
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
    >
      <div className="mb-4 flex items-center gap-4 rounded-tile bg-surface-sunken p-4">
        <Avatar name={c.name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-heading-18 text-text">{c.name}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <ChannelChip channel={c.channel} />
            {isBirthdayToday(c.birthday) && <Badge tone="danger">birthday today</Badge>}
            {c.tags.map((t) => (
              <Badge key={t} tone={t === 'VIP' ? 'accent' : 'neutral'}>
                {t}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <KeyValueList>
        <KeyValue label="Phone">{c.phone}</KeyValue>
        <KeyValue label="Birthday">
          {c.birthday ? new Date(c.birthday).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) : '—'}
        </KeyValue>
        <KeyValue label="First came from">{c.channel}</KeyValue>
        <KeyValue label="Customer since">{niceDate(c.since)}</KeyValue>
        <KeyValue label="Spent with you" total>
          {naira(spent)}
        </KeyValue>
      </KeyValueList>

      {c.notes && (
        <Alert tone="info" title="Notes" className="mt-4">
          {c.notes}
        </Alert>
      )}

      <SectionHeader title="Measurements" className="mt-6" />
      {sizes.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {sizes.map(([k, v]) => (
            <div key={k} className="rounded-tile bg-surface-sunken px-3.5 py-2.5">
              <p className="truncate text-body-12 text-text-muted">{k}</p>
              <p className="font-display text-body-15 font-semibold text-text tabular-nums">{v}"</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No measurements yet" size="sm" className="rounded-tile bg-surface-sunken" />
      )}
      <Note>
        Taken {niceDate(c.since)}. A new set is added when they change — old orders keep the measurements they were cut
        from.
      </Note>

      <SectionHeader title="Orders" className="mt-6" />
      {os.length ? (
        <List bare className="-mx-4 md:-mx-5">
          {os.map((o) => (
            <ListItem
              key={o.id}
              onClick={() => openSheet({ type: 'order', id: o.id })}
              title={styleOf(s, o.style).name + ' · ' + o.size}
              description={o.id + ' · ' + niceDate(o.created)}
              trailing={
                <Figure
                  value={naira(o.total)}
                  caption={o.status === 'cancelled' ? 'cancelled' : balanceOf(o) > 0 ? 'owing ' + naira(balanceOf(o)) : undefined}
                />
              }
            />
          ))}
        </List>
      ) : (
        <EmptyState title="No orders yet" icon="receipt" size="sm" className="rounded-tile bg-surface-sunken" />
      )}
    </Sheet>
  );
}
