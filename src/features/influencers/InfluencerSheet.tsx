import {
  Button,
  EmptyState,
  IconChip,
  KeyValue,
  KeyValueList,
  List,
  ListItem,
  ProgressBar,
  SectionHeader,
  Sheet,
} from '@/components/ui';
import { niceDate } from '@/lib/dates';
import { naira } from '@/lib/format';
import { useApp } from '@/store/hooks';
import { can } from '@/store/selectors';
import { recordInfluencerPost } from '@/store/actions/marketing';
import { openSheet } from '@/store/ui/sheetStore';

export function InfluencerSheet({ id }: { id: string }) {
  const s = useApp();
  const i = s.influencers.find((x) => x.id === id);
  if (!i) return null;

  const owed = Math.max(0, i.promised - i.posts.length);
  const cost = i.paid + i.giftCost;
  const paidOff = i.salesValue >= cost;

  return (
    <Sheet
      title={i.name}
      tag={i.handle}
      description="What we gave, what they posted and what came back."
      footer={
        can(s, 'market') && (
          <>
            <Button variant="secondary" leftIcon="edit" onClick={() => openSheet({ type: 'influencerForm', id })}>
              Edit
            </Button>
            <Button leftIcon="plus" onClick={() => void recordInfluencerPost(id)}>
              Record a post
            </Button>
          </>
        )
      }
    >
      <KeyValueList>
        <KeyValue label="Handle">{i.handle}</KeyValue>
        <KeyValue label="Following">
          {i.followers} · {i.tier}
        </KeyValue>
        <KeyValue label="Outfits gifted">
          {i.gifted} ({naira(i.giftCost)} to make)
        </KeyValue>
        <KeyValue label="Money paid">{naira(i.paid)}</KeyValue>
        <KeyValue label="Posts promised">{i.promised}</KeyValue>
        <KeyValue label="Posts delivered" tone={owed ? 'warning' : undefined}>
          {i.posts.length}
          {owed ? ' — ' + owed + ' still owed' : ''}
        </KeyValue>
        <KeyValue label="Their code">{i.code}</KeyValue>
        <KeyValue label="Sales through that code" total>
          {naira(i.salesValue)} from {i.sales} orders
        </KeyValue>
      </KeyValueList>

      <div className="mt-4 rounded-tile bg-surface-sunken p-4">
        <ProgressBar
          value={i.salesValue}
          max={cost}
          tone={paidOff ? 'success' : 'warning'}
          label={paidOff ? 'Paid for itself.' : 'Has not covered its cost yet.'}
          valueLabel={naira(i.salesValue) + ' of ' + naira(cost)}
        />
      </div>

      <SectionHeader title="What they posted" className="mt-6" />
      {i.posts.length ? (
        <List bare className="-mx-4 md:-mx-5">
          {i.posts.map((p, n) => (
            <ListItem
              key={n}
              leading={<IconChip icon="photo" />}
              title={p.platform}
              description={niceDate(p.when) + ' · ' + p.reach.toLocaleString() + ' people reached'}
            />
          ))}
        </List>
      ) : (
        <EmptyState
          title="Nothing posted yet"
          message="They have been gifted but have not posted."
          icon="photo"
          size="sm"
          className="rounded-tile bg-surface-sunken"
        />
      )}
    </Sheet>
  );
}
