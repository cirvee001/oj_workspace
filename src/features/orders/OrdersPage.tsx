import { useMemo, useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  ChannelChip,
  DataTable,
  PageHeader,
  SearchInput,
  StatCard,
  StatGrid,
  Tabs,
  Toolbar,
  type Column,
} from '@/components/ui';
import { isoFromToday, niceDate } from '@/lib/dates';
import { naira, nairaShort, plural } from '@/lib/format';
import type { Order } from '@/types/domain';
import { useApp } from '@/store/hooks';
import { balanceOf, branchOrders, can, customerOf, isOpenOrder, styleOf } from '@/store/selectors';
import { exportOrders } from '@/store/actions/orders';
import { openSheet } from '@/store/ui/sheetStore';

type Filter = 'all' | 'owing' | 'making' | 'delivered' | 'cancelled';

export function OrdersPage() {
  const s = useApp();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const orders = branchOrders(s);
  const owing = orders.filter((o) => balanceOf(o) > 0);
  const making = orders.filter(isOpenOrder);
  const delivered = orders.filter((o) => o.status === 'delivered');
  const cancelled = orders.filter((o) => o.status === 'cancelled');
  const weekEnd = isoFromToday(7);
  const dueThisWeek = making.filter((o) => o.due <= weekEnd);
  const owingTotal = owing.reduce((n, o) => n + balanceOf(o), 0);
  const social = orders.filter((o) => o.channel === 'Instagram' || o.channel === 'WhatsApp');

  const needle = q.toLowerCase();
  const pool =
    filter === 'owing'
      ? owing
      : filter === 'making'
        ? making
        : filter === 'delivered'
          ? delivered
          : filter === 'cancelled'
            ? cancelled
            : orders;
  const list = pool.filter(
    (o) => !q || (o.id + customerOf(s, o.customer).name + styleOf(s, o.style).name).toLowerCase().includes(needle),
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
        key: 'customer',
        header: 'Customer',
        cell: (o) => {
          const name = customerOf(s, o.customer).name;
          return (
            <span className="flex items-center gap-2.5">
              <Avatar name={name} size="sm" />
              <span className="font-medium text-text">{name}</span>
            </span>
          );
        },
        sortValue: (o) => customerOf(s, o.customer).name,
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
        key: 'channel',
        header: 'Came from',
        cell: (o) => <ChannelChip channel={o.channel} />,
        sortValue: (o) => o.channel,
        hideOnMobile: true,
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
          const bal = balanceOf(o);
          if (o.status === 'cancelled') return <span className="text-text-muted">—</span>;
          return bal > 0 ? <Badge tone="danger">{naira(bal)}</Badge> : <Badge tone="success">paid</Badge>;
        },
        sortValue: (o) => balanceOf(o),
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
            <span className="tabular-nums">{niceDate(o.due)}</span>
          ),
        sortValue: (o) => o.due,
      },
    ],
    [s],
  );

  return (
    <>
      <PageHeader
        title="Orders"
        description="Every order, wherever it came from — Instagram, WhatsApp, Snapchat, the website or the shop door."
        actions={
          <>
            <Button variant="secondary" leftIcon="download" onClick={exportOrders}>
              Download
            </Button>
            {can(s, 'order') && (
              <Button leftIcon="plus" onClick={() => openSheet({ type: 'newOrder' })}>
                Take a new order
              </Button>
            )}
          </>
        }
      />

      <StatGrid className="mb-6">
        <StatCard icon="scissors" label="Open orders" value={making.length} caption={plural(orders.length, 'order') + ' in total'} />
        <StatCard
          icon="wallet"
          tone={owingTotal > 0 ? 'warning' : 'success'}
          label="Owing"
          value={nairaShort(owingTotal)}
          caption={owing.length ? plural(owing.length, 'order') + ' not fully paid' : 'everyone has paid'}
        />
        <StatCard icon="cal" label="Due this week" value={dueThisWeek.length} caption="still being made" />
        <StatCard
          icon="chat"
          label="From Instagram & WhatsApp"
          value={social.length}
          caption={orders.length ? Math.round((social.length / orders.length) * 100) + '% of orders' : 'no orders yet'}
        />
      </StatGrid>

      <Toolbar>
        <SearchInput placeholder="Search by name or order number" value={q} onChange={(e) => setQ(e.target.value)} />
        <Tabs<Filter>
          aria-label="Filter orders"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: orders.length },
            { value: 'owing', label: 'Owing', count: owing.length },
            { value: 'making', label: 'In production', count: making.length },
            { value: 'delivered', label: 'Delivered', count: delivered.length },
            { value: 'cancelled', label: 'Cancelled', count: cancelled.length },
          ]}
        />
      </Toolbar>

      <DataTable
        data={list}
        columns={columns}
        rowKey={(o) => o.id}
        onRowClick={(o) => openSheet({ type: 'order', id: o.id })}
        itemNoun="orders"
        emptyIcon="receipt"
        emptyTitle={orders.length ? 'No orders match' : 'No orders yet'}
        emptyMessage={orders.length ? 'Try another name or filter.' : 'Take one and it appears here.'}
      />
    </>
  );
}
