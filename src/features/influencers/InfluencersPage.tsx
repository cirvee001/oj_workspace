import { Avatar, Badge, Button, DataTable, PageHeader, ProgressBar, StatCard, StatGrid, type Column } from '@/components/ui';
import { naira, nairaShort, plural } from '@/lib/format';
import type { Influencer } from '@/types/domain';
import { useApp } from '@/store/hooks';
import { can } from '@/store/selectors';
import { openSheet } from '@/store/ui/sheetStore';

const costOf = (i: Influencer) => i.paid + i.giftCost;
const owedOf = (i: Influencer) => Math.max(0, i.promised - i.posts.length);

export function InfluencersPage() {
  const s = useApp();
  const spend = s.influencers.reduce((n, i) => n + costOf(i), 0);
  const back = s.influencers.reduce((n, i) => n + i.salesValue, 0);
  const owedPosts = s.influencers.reduce((n, i) => n + owedOf(i), 0);

  const columns: Column<Influencer>[] = [
    {
      key: 'name',
      header: 'Influencer',
      cell: (i) => (
        <span className="flex items-center gap-3">
          <Avatar name={i.name} />
          <span className="min-w-0">
            <span className="block font-semibold text-text">{i.name}</span>
            <span className="block text-body-13 text-text-secondary">
              {i.handle} · {i.tier} · {i.followers}
            </span>
          </span>
        </span>
      ),
      sortValue: (i) => i.name,
    },
    {
      key: 'code',
      header: 'Code',
      cell: (i) => (
        <Badge variant="outline" size="sm">
          {i.code}
        </Badge>
      ),
      hideOnMobile: true,
    },
    {
      key: 'posts',
      header: 'Posts',
      cell: (i) => {
        const owed = owedOf(i);
        return owed ? <Badge tone="warning">{plural(owed, 'post') + ' still owed'}</Badge> : <Badge tone="success">all posts delivered</Badge>;
      },
      sortValue: (i) => owedOf(i),
      hideOnMobile: true,
    },
    {
      key: 'sales',
      header: 'Sales',
      align: 'right',
      cell: (i) => (
        <span className="tabular-nums">
          <span className="block font-semibold text-text">{naira(i.salesValue)}</span>
          <span className="block text-body-12 text-text-muted">{plural(i.sales, 'sale')}</span>
        </span>
      ),
      sortValue: (i) => i.salesValue,
    },
    {
      key: 'roi',
      header: 'Back vs cost',
      width: 200,
      cell: (i) => {
        const cost = costOf(i);
        return (
          <ProgressBar
            value={i.salesValue}
            max={cost}
            size="sm"
            tone={i.salesValue >= cost ? 'success' : 'warning'}
            valueLabel={'cost ' + naira(cost)}
          />
        );
      },
      sortValue: (i) => (costOf(i) ? i.salesValue / costOf(i) : 0),
      hideOnMobile: true,
    },
  ];

  return (
    <>
      <PageHeader
        title="Influencers"
        description="What you gave them, what you paid, what they actually posted, and what came back in sales."
        actions={
          can(s, 'market') && (
            <Button leftIcon="plus" onClick={() => openSheet({ type: 'influencerForm' })}>
              Add influencer
            </Button>
          )
        }
      />
      <StatGrid className="mb-6 xl:grid-cols-3">
        <StatCard icon="wallet" label="Spent on them" value={nairaShort(spend)} caption="outfits plus fees" />
        <StatCard
          icon="chart"
          tone={back < spend ? 'danger' : 'success'}
          label="Sales traced back"
          value={nairaShort(back)}
          delta={{ label: back < spend ? 'less than you spent' : 'more than you spent', good: back >= spend }}
        />
        <StatCard
          icon="photo"
          tone={owedPosts ? 'warning' : 'success'}
          label="Posts owed"
          value={owedPosts}
          caption="promised but not posted"
        />
      </StatGrid>

      <DataTable
        data={s.influencers}
        columns={columns}
        rowKey={(i) => i.id}
        onRowClick={(i) => openSheet({ type: 'influencer', id: i.id })}
        itemNoun="influencers"
        emptyIcon="star"
        emptyTitle="No influencers yet"
      />
    </>
  );
}
