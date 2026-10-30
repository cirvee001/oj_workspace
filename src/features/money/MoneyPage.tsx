import type { Expense } from '@/types/domain';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  EmptyState,
  Figure,
  IconChip,
  List,
  ListItem,
  PageHeader,
  SectionHeader,
  StatCard,
  StatGrid,
  type Column,
} from '@/components/ui';
import { BarList } from '@/components/charts/BarChart';
import { dueDate, niceDate, TODAY } from '@/lib/dates';
import { naira, nairaShort } from '@/lib/format';
import { useApp } from '@/store/hooks';
import { balanceOf, branchOrders, branchStaff, can, customerOf, myBranch, orderOf, styleOf } from '@/store/selectors';
import { openSheet } from '@/store/ui/sheetStore';

const expenseColumns: Column<Expense>[] = [
  { key: 'what', header: 'What', sortValue: (e) => e.what, cell: (e) => <span className="font-semibold text-text">{e.what}</span> },
  { key: 'cat', header: 'Type', sortValue: (e) => e.cat, cell: (e) => <Badge>{e.cat}</Badge> },
  { key: 'when', header: 'When', sortValue: (e) => e.when, cell: (e) => niceDate(e.when), hideOnMobile: true },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    sortValue: (e) => e.amount,
    cell: (e) => <span className="font-semibold text-text tabular-nums">{naira(e.amount)}</span>,
  },
];

/** What came in, what went out, and what is still owed either way. */
export function MoneyPage() {
  const s = useApp();
  const branch = myBranch(s);
  const income =
    s.payments.filter((p) => orderOf(s, p.order)?.branch === branch).reduce((n, p) => n + p.amount, 0) +
    s.sales.filter((x) => x.branch === branch).reduce((n, x) => n + x.amount, 0);
  const expenses = s.expenses.filter((e) => e.branch === branch);
  const spent = expenses.reduce((n, e) => n + e.amount, 0);
  const wages = branchStaff(s).reduce((n, x) => n + x.salary, 0);
  const supOwed = s.suppliers.reduce((n, x) => n + x.owed, 0);
  const profit = income - spent - wages;
  const owed = branchOrders(s).filter((o) => balanceOf(o) > 0);
  const owedTotal = owed.reduce((n, o) => n + balanceOf(o), 0);
  const suppliersOwed = s.suppliers.filter((x) => x.owed > 0);

  const byCat = new Map<string, number>();
  expenses.forEach((e) => byCat.set(e.cat, (byCat.get(e.cat) ?? 0) + e.amount));
  const catBars = [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, display: nairaShort(value), hint: spent ? Math.round((value / spent) * 100) + '%' : undefined }));

  return (
    <>
      <PageHeader title="Money" description="What came in, what went out, and what is still owed either way." />
      <StatGrid>
        <StatCard label="Money in" value={nairaShort(income)} icon="coins" tone="success" caption="orders and shop sales" />
        <StatCard label="Running costs" value={nairaShort(spent)} icon="receipt" caption="rent, power, transport" />
        <StatCard label="Wages" value={nairaShort(wages)} icon="users" caption="this month" />
        <StatCard
          label={profit >= 0 ? 'Left over' : 'Short'}
          value={nairaShort(Math.abs(profit))}
          icon="wallet"
          tone={profit >= 0 ? 'success' : 'danger'}
          caption={profit >= 0 ? 'before tax' : 'costs are higher'}
        />
      </StatGrid>

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Owed to you"
            description={owed.length ? naira(owedTotal) + ' across ' + owed.length + ' orders' : undefined}
            divided
          />
          {owed.length ? (
            <List bare>
              {owed.map((o) => {
                const name = customerOf(s, o.customer).name;
                return (
                  <ListItem
                    key={o.id}
                    onClick={() => openSheet({ type: 'order', id: o.id })}
                    leading={<Avatar name={name} />}
                    title={name}
                    description={o.id + ' · ' + styleOf(s, o.style).name}
                    trailing={<Figure value={naira(balanceOf(o))} caption={dueDate(o.due)} tone={o.due < TODAY ? 'danger' : undefined} />}
                  />
                );
              })}
            </List>
          ) : (
            <EmptyState size="sm" icon="check" title="Nobody owes you anything." />
          )}
        </Card>

        <Card>
          <CardHeader title="You owe suppliers" description={supOwed ? naira(supOwed) + ' in total' : undefined} divided />
          {supOwed ? (
            <List bare>
              {suppliersOwed.map((x) => (
                <ListItem
                  key={x.id}
                  leading={<IconChip icon="truck" />}
                  title={x.name}
                  description={x.terms}
                  trailing={<Figure value={naira(x.owed)} tone="danger" />}
                />
              ))}
            </List>
          ) : (
            <EmptyState size="sm" icon="check" title="Everything is settled." />
          )}
        </Card>
      </div>

      <SectionHeader
        title="What you spent"
        actions={
          can(s, 'money') && (
            <Button variant="secondary" size="sm" leftIcon="plus" onClick={() => openSheet({ type: 'addExpense' })}>
              Record a cost
            </Button>
          )
        }
      />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <DataTable
          data={expenses}
          columns={expenseColumns}
          rowKey={(e) => e.id}
          defaultSort={{ key: 'when', direction: 'desc' }}
          itemNoun="costs"
          emptyTitle="No costs recorded"
          emptyIcon="receipt"
        />
        {catBars.length > 0 && (
          <Card>
            <CardHeader title="Costs by type" description={naira(spent) + ' in total'} />
            <CardBody>
              <BarList items={catBars} />
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
