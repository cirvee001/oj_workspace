import {
  Badge,
  Button,
  Card,
  CardHeader,
  ChannelChip,
  PageHeader,
  Queue,
  QueueItem,
  SectionHeader,
  StatCard,
  StatGrid,
} from '@/components/ui';
import { ENQUIRY_STAGES, enquiryStageName, isEnquiryClosed } from '@/config/constants';
import { TODAY, niceDate } from '@/lib/dates';
import { firstName, naira, nairaShort } from '@/lib/format';
import type { Enquiry } from '@/types/domain';
import { useApp } from '@/store/hooks';
import { can, myBranch, nameOf, styleOf } from '@/store/selectors';
import { openSheet } from '@/store/ui/sheetStore';

/** "Adaeze Okafor" → "Adaeze O." */
const shortName = (name: string): string => {
  const [first = '', second = ''] = name.split(' ');
  return first + ' ' + second.slice(0, 1) + '.';
};

export function EnquiriesPage() {
  const s = useApp();
  const here = myBranch(s);
  const all = can(s, '*');
  const mine = s.enquiries.filter((e) => e.branch === here || all);
  const open = mine.filter((e) => !isEnquiryClosed(e.stage));
  const dueToday = open.filter((e) => e.nextFollowUp <= TODAY);
  const worth = open.reduce((n, e) => n + e.value, 0);
  const won = mine.filter((e) => e.stage === 'converted').length;
  const rate = mine.length ? Math.round((won / mine.length) * 100) : 0;
  const view = (e: Enquiry) => openSheet({ type: 'enquiry', id: e.id });

  return (
    <>
      <PageHeader
        title="Enquiries"
        description="Everyone who asked about us but has not ordered yet. Nobody should be forgotten because a message got buried."
        actions={
          can(s, 'order') && (
            <Button leftIcon="plus" onClick={() => openSheet({ type: 'newEnquiry' })}>
              Add an enquiry
            </Button>
          )
        }
      />

      <StatGrid>
        <StatCard icon="chat" label="Open enquiries" value={open.length} caption={mine.length + ' in total'} />
        <StatCard
          icon="clock"
          tone={dueToday.length ? 'warning' : 'success'}
          label="Follow up today"
          value={dueToday.length}
          delta={dueToday.length ? { label: 'due', good: false } : undefined}
          caption={dueToday.length ? 'these go cold if you leave them' : 'nothing overdue'}
        />
        <StatCard icon="coins" label="Possible value" value={nairaShort(worth)} caption="if every open enquiry ordered" />
        <StatCard icon="check" tone="success" label="Turned into orders" value={rate + '%'} caption={won + ' of ' + mine.length} />
      </StatGrid>

      {dueToday.length > 0 && (
        <Card className="mt-6">
          <CardHeader
            title="Follow up today"
            description={dueToday.length > 6 ? `Showing 6 of ${dueToday.length}` : undefined}
            actions={<Badge tone="warning">{dueToday.length}</Badge>}
          />
          <Queue>
            {dueToday.slice(0, 6).map((e) => (
              <QueueItem
                key={e.id}
                icon="chat"
                urgent={e.nextFollowUp < TODAY}
                onClick={() => view(e)}
                title={
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    {e.name} <Badge size="sm">{enquiryStageName(e.stage)}</Badge>
                    <span className="font-normal text-text-secondary tabular-nums">· {naira(e.value)}</span>
                  </span>
                }
                description={
                  styleOf(s, e.style).name +
                  ' · ' +
                  e.phone +
                  ' · last spoke ' +
                  niceDate(e.lastContact) +
                  ' · ' +
                  firstName(nameOf(s, e.owner))
                }
              />
            ))}
          </Queue>
        </Card>
      )}

      <SectionHeader title="The pipeline" />
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-3">
        {ENQUIRY_STAGES.map(({ key, label }) => {
          const inLane = mine.filter((e) => e.stage === key);
          const val = inLane.reduce((n, e) => n + e.value, 0);
          return (
            <section key={key} className="flex w-72 shrink-0 flex-col rounded-card bg-surface-sunken p-2">
              <header className="flex items-center justify-between gap-2 px-2 pt-1.5 pb-2.5">
                <h3 className="text-body-13 font-semibold text-text">{label}</h3>
                <Badge size="sm" variant="outline">
                  {inLane.length}
                </Badge>
              </header>
              <div className="flex min-h-12 flex-1 flex-col gap-2">
                {inLane.length ? (
                  inLane.slice(0, 8).map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => view(e)}
                      className="block w-full rounded-tile bg-surface p-3.5 text-left shadow-card transition-shadow hover:ring-2 hover:ring-accent-subtle"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="truncate text-body-14 font-semibold text-text">{shortName(e.name)}</span>
                        <span className="shrink-0 text-body-13 font-semibold text-text tabular-nums">{naira(e.value)}</span>
                      </div>
                      <p className="mt-0.5 truncate text-body-13 text-text-secondary">{styleOf(s, e.style).name}</p>
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <ChannelChip channel={e.source} />
                        <span
                          className={
                            e.nextFollowUp <= TODAY && !isEnquiryClosed(e.stage)
                              ? 'text-body-12 font-medium text-warning-text'
                              : 'text-body-12 text-text-muted'
                          }
                        >
                          follow up {niceDate(e.nextFollowUp)}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="px-2 py-3 text-body-13 text-text-muted">Nobody here</p>
                )}
              </div>
              {inLane.length > 0 && (
                <p className="mt-2 px-2 pb-1 text-body-12 text-text-secondary tabular-nums">
                  {nairaShort(val)} in this column{inLane.length > 8 ? ` · ${inLane.length - 8} more` : ''}
                </p>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
