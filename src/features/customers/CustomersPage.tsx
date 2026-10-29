import { useMemo, useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  ChannelChip,
  DataTable,
  PageHeader,
  SearchInput,
  Tabs,
  Toolbar,
  type Column,
} from '@/components/ui';
import { isBirthdayToday } from '@/lib/dates';
import { naira } from '@/lib/format';
import type { Customer } from '@/types/domain';
import { useApp } from '@/store/hooks';
import { balanceOf, can } from '@/store/selectors';
import { openSheet } from '@/store/ui/sheetStore';

type Filter = 'all' | 'owing' | 'birthday' | 'vip';

interface CustomerRow {
  c: Customer;
  orders: number;
  spent: number;
  owes: number;
  birthday: boolean;
}

export function CustomersPage() {
  const s = useApp();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const rows = useMemo<CustomerRow[]>(
    () =>
      s.customers.map((c) => {
        const os = s.orders.filter((o) => o.customer === c.id);
        return {
          c,
          orders: os.length,
          spent: os.reduce((n, o) => n + o.paid, 0),
          owes: os.reduce((n, o) => n + balanceOf(o), 0),
          birthday: isBirthdayToday(c.birthday),
        };
      }),
    [s.customers, s.orders],
  );

  const owing = rows.filter((r) => r.owes > 0);
  const birthdays = rows.filter((r) => r.birthday);
  const vip = rows.filter((r) => r.c.tags.includes('VIP'));

  const needle = q.toLowerCase();
  const pool = filter === 'owing' ? owing : filter === 'birthday' ? birthdays : filter === 'vip' ? vip : rows;
  const list = pool.filter((r) => !q || (r.c.name + r.c.phone).toLowerCase().includes(needle));

  const columns: Column<CustomerRow>[] = [
    {
      key: 'name',
      header: 'Customer',
      cell: ({ c, birthday }) => (
        <span className="flex items-center gap-3">
          <Avatar name={c.name} />
          <span className="min-w-0">
            <span className="block font-semibold text-text">{c.name}</span>
            {(birthday || c.tags.length > 0) && (
              <span className="mt-1 flex flex-wrap gap-1">
                {birthday && (
                  <Badge size="sm" tone="danger">
                    birthday today
                  </Badge>
                )}
                {c.tags.map((t) => (
                  <Badge key={t} size="sm" tone={t === 'VIP' ? 'accent' : 'neutral'}>
                    {t}
                  </Badge>
                ))}
              </span>
            )}
          </span>
        </span>
      ),
      sortValue: (r) => r.c.name,
    },
    { key: 'phone', header: 'Phone', cell: (r) => <span className="tabular-nums">{r.c.phone}</span>, hideOnMobile: true },
    {
      key: 'channel',
      header: 'Came from',
      cell: (r) => <ChannelChip channel={r.c.channel} />,
      sortValue: (r) => r.c.channel,
      hideOnMobile: true,
    },
    { key: 'orders', header: 'Orders', align: 'right', cell: (r) => <span className="tabular-nums">{r.orders}</span>, sortValue: (r) => r.orders },
    {
      key: 'spent',
      header: 'Spent',
      align: 'right',
      cell: (r) => <span className="font-medium text-text tabular-nums">{naira(r.spent)}</span>,
      sortValue: (r) => r.spent,
    },
    {
      key: 'owes',
      header: 'Owing',
      align: 'right',
      cell: (r) => (r.owes > 0 ? <Badge tone="danger">{naira(r.owes)}</Badge> : <span className="text-text-muted">—</span>),
      sortValue: (r) => r.owes,
    },
  ];

  return (
    <>
      <PageHeader
        title="Customers"
        description="Who they are, what they ordered, what they are owing, and what they told you."
        actions={
          (can(s, 'customer') || can(s, 'order')) && (
            <Button leftIcon="plus" onClick={() => openSheet({ type: 'customerForm' })}>
              Add customer
            </Button>
          )
        }
      />
      <Toolbar>
        <SearchInput placeholder="Search by name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        <Tabs<Filter>
          aria-label="Filter customers"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: rows.length },
            { value: 'owing', label: 'Owing', count: owing.length },
            { value: 'birthday', label: 'Birthday today', count: birthdays.length },
            { value: 'vip', label: 'VIP', count: vip.length },
          ]}
        />
      </Toolbar>
      <DataTable
        data={list}
        columns={columns}
        rowKey={(r) => r.c.id}
        onRowClick={(r) => openSheet({ type: 'customer', id: r.c.id })}
        itemNoun="customers"
        emptyIcon="users"
        emptyTitle="No customers match"
        emptyMessage="Try another name, phone number or filter."
      />
    </>
  );
}
