import { Avatar, Badge, PageHeader, StatCard, StatGrid } from '@/components/ui';
import { STAGES } from '@/config/constants';
import { dueDate } from '@/lib/dates';
import { useApp } from '@/store/hooks';
import { branchJobs, customerOf, isLate, me, nameOf, orderOf, styleOf } from '@/store/selectors';
import { openSheet } from '@/store/ui/sheetStore';

export function ProductionPage() {
  const s = useApp();
  const mine = me(s).role === 'tailor';
  const jobs = branchJobs(s).filter((j) => !mine || j.assigned === s.actor || !j.assigned);

  const making = jobs.filter((j) => j.stage !== 'ready' && j.stage !== 'delivery').length;
  const late = jobs.filter(isLate).length;
  const ready = jobs.filter((j) => j.stage === 'ready').length;
  const redone = jobs.filter((j) => j.reworks > 0).length;

  return (
    <>
      <PageHeader
        title="Workshop"
        description={
          mine
            ? 'Your jobs. Tap one to say you are finished with your part.'
            : 'Every garment being made, and who is holding it. Tap a job to move it on.'
        }
      />

      <StatGrid className="mb-6">
        <StatCard label="In production" value={making} icon="scissors" caption="being made now" />
        <StatCard
          label="Late"
          value={late}
          icon="clock"
          tone={late ? 'danger' : 'success'}
          caption={late ? 'past their due date' : 'everything on time'}
        />
        <StatCard label="Ready for pickup" value={ready} icon="check" tone="success" caption="waiting for the customer" />
        <StatCard
          label="Redone"
          value={redone}
          icon="history"
          tone={redone ? 'warning' : 'default'}
          caption="sent back at least once"
        />
      </StatGrid>

      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-3">
        {STAGES.map(({ key, label }) => {
          const inLane = jobs.filter((j) => j.stage === key);
          return (
            <section key={key} aria-label={label} className="flex w-72 shrink-0 flex-col rounded-card bg-surface-sunken p-2">
              <header className="flex items-center justify-between gap-2 px-2 pt-1.5 pb-2.5">
                <h2 className="text-body-14 font-semibold text-text">{label}</h2>
                <Badge size="sm" tone={inLane.length ? 'accent' : 'neutral'}>
                  {inLane.length}
                </Badge>
              </header>
              <div className="flex min-h-16 flex-1 flex-col gap-2">
                {inLane.length ? (
                  inLane.map((j) => {
                    const o = orderOf(s, j.order);
                    const open = () => openSheet({ type: 'job', id: j.id });
                    const who = j.assigned ? nameOf(s, j.assigned) : null;
                    const lateJob = isLate(j);
                    return (
                      <div
                        key={j.id}
                        role="button"
                        tabIndex={0}
                        onClick={open}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            open();
                          }
                        }}
                        className="cursor-pointer rounded-tile bg-surface p-3.5 shadow-card transition-shadow hover:ring-2 hover:ring-accent-subtle"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-body-13 font-semibold text-text tabular-nums">{j.id}</span>
                          <div className="flex items-center gap-1">
                            {j.reworks > 0 && (
                              <Badge size="sm" tone="warning">
                                {'Redone ' + j.reworks + '×'}
                              </Badge>
                            )}
                            {lateJob && (
                              <Badge size="sm" tone="danger" dot>
                                Late
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="mt-1.5 truncate text-body-14 font-semibold text-text">
                          {o ? customerOf(s, o.customer).name : '—'}
                        </p>
                        <p className="mt-0.5 truncate text-body-13 text-text-secondary">
                          {o ? styleOf(s, o.style).name + ' · ' + o.size : '—'}
                        </p>
                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                          <span className="flex min-w-0 items-center gap-2">
                            {who ? (
                              <>
                                <Avatar name={who} size="sm" className="size-6 text-[10px]" />
                                <span className="truncate text-body-12 text-text-label">{who}</span>
                              </>
                            ) : (
                              <span className="text-body-12 text-text-muted">Nobody yet</span>
                            )}
                          </span>
                          <span
                            className={
                              lateJob
                                ? 'shrink-0 text-body-12 font-semibold text-danger-text tabular-nums'
                                : 'shrink-0 text-body-12 text-text-muted tabular-nums'
                            }
                          >
                            {dueDate(j.due)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="grid flex-1 place-items-center rounded-tile border border-dashed border-border-strong px-3 py-5 text-body-12 text-text-muted">
                    No jobs here
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
