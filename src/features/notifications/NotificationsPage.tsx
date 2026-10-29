import { useState } from 'react';
import {
  Badge,
  EmptyState,
  IconChip,
  List,
  ListItem,
  PageHeader,
  SectionHeader,
  Tabs,
  Toolbar,
  type BadgeTone,
} from '@/components/ui';
import { useOpenTarget } from '@/hooks/useGo';
import { buildNotifications, type NoticeLevel } from '@/store/derived';
import { useApp } from '@/store/hooks';

type ChipTone = 'danger' | 'warning' | 'neutral';

const GROUPS: readonly { level: NoticeLevel; tone: BadgeTone; chip: ChipTone }[] = [
  { level: 'Urgent', tone: 'danger', chip: 'danger' },
  { level: 'Important', tone: 'warning', chip: 'warning' },
  { level: 'Normal', tone: 'neutral', chip: 'neutral' },
];

type Filter = 'all' | NoticeLevel;

export function NotificationsPage() {
  const s = useApp();
  const openTarget = useOpenTarget();
  const all = buildNotifications(s);
  const [filter, setFilter] = useState<Filter>('all');

  const count = (level: NoticeLevel) => all.filter((n) => n.level === level).length;
  const options: readonly { value: Filter; label: string; count?: number }[] = [
    { value: 'all', label: 'All', count: all.length },
    ...GROUPS.map((g) => ({ value: g.level, label: g.level, count: count(g.level) })),
  ];

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Ranked, so the things that stop work are at the top. This is not a feed of everything that happens."
      />
      {all.length > 0 && (
        <Toolbar>
          <Tabs aria-label="Filter by level" options={options} value={filter} onChange={setFilter} />
        </Toolbar>
      )}
      {GROUPS.filter((g) => filter === 'all' || g.level === filter).map(({ level, tone, chip }, gi) => {
        const list = all.filter((n) => n.level === level);
        if (!list.length) return null;
        return (
          <section key={level}>
            <SectionHeader
              className={gi === 0 ? 'mt-2' : undefined}
              title={
                <>
                  {level} <Badge tone={tone}>{list.length}</Badge>
                </>
              }
            />
            <List>
              {list.map((n, i) => (
                <ListItem
                  key={i}
                  leading={<IconChip icon={n.icon} tone={chip} />}
                  title={n.title}
                  description={n.body}
                  onClick={n.target ? () => openTarget(n.target) : undefined}
                />
              ))}
            </List>
          </section>
        );
      })}
      {all.length > 0 && filter !== 'all' && count(filter) === 0 && (
        <EmptyState bordered title={'Nothing ' + filter.toLowerCase()} message="Try another level." icon="check" />
      )}
      {!all.length && <EmptyState bordered title="Nothing to tell you" message="Everything is running normally." icon="check" />}
    </>
  );
}
