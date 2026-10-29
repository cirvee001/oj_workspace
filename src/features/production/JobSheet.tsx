import { Check } from 'lucide-react';
import { Button, Field, KeyValue, KeyValueList, Select, Sheet } from '@/components/ui';
import { STAGES, stageName } from '@/config/constants';
import { cn } from '@/lib/cn';
import { naira, qty } from '@/lib/format';
import { useApp } from '@/store/hooks';
import { customerOf, jobOf, materialOf, orderOf, styleOf, tailors, balanceOf } from '@/store/selectors';
import { advanceJob, assignJob, canMoveJob, failQC } from '@/store/actions/workshop';
import { openSheet } from '@/store/ui/sheetStore';

/** The eight workshop stages as small pills: done ones ticked, the current one in accent. */
function StageStepper({ current }: { current: number }) {
  return (
    <ol aria-label="Stages" className="mb-5 flex flex-wrap gap-1.5">
      {STAGES.map((st, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li
            key={st.key}
            aria-current={now ? 'step' : undefined}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-tag px-2.5 text-body-12 font-medium whitespace-nowrap',
              done && 'bg-success-fill text-success-ink',
              now && 'bg-accent text-on-accent',
              !done && !now && 'bg-surface-sunken text-text-muted',
            )}
          >
            {done ? (
              <Check size={12} aria-hidden="true" />
            ) : (
              <span aria-hidden="true" className={cn('size-1.5 rounded-full bg-current', !now && 'opacity-50')} />
            )}
            {st.label}
          </li>
        );
      })}
    </ol>
  );
}

export function JobSheet({ id }: { id: string }) {
  const s = useApp();
  const j = jobOf(s, id);
  const o = j && orderOf(s, j.order);
  if (!j || !o) return null;

  const st = styleOf(s, o.style);
  const idx = STAGES.findIndex((x) => x.key === j.stage);
  const next = STAGES[idx + 1];
  const mine = s.issues.filter((i) => i.job === id && i.status === 'issued');
  const outstanding = mine.find((i) => !i.returned);
  const given = mine.reduce((n, i) => n + (i.issued ?? 0), 0);
  const bal = balanceOf(o);
  const canMove = canMoveJob(id);
  const hasActions = (next && canMove) || j.stage === 'qc' || !!outstanding || j.stage === 'fabric' || j.stage === 'measurement';

  const footer = (
    <>
      {(j.stage === 'fabric' || j.stage === 'measurement') && (
        <Button variant="secondary" leftIcon="layers" onClick={() => openSheet({ type: 'askFabric', jobId: id })}>
          Ask for fabric
        </Button>
      )}
      {outstanding && (
        <Button variant="secondary" onClick={() => openSheet({ type: 'returnFabric', issueId: outstanding.id })}>
          Bring back leftovers
        </Button>
      )}
      {j.stage === 'qc' && (
        <Button variant="secondary" leftIcon="x" onClick={() => void failQC(id)}>
          Not good enough — send back
        </Button>
      )}
      {next && canMove && (
        <Button leftIcon="check" onClick={() => void advanceJob(id)}>
          Finished — send to {next.label}
        </Button>
      )}
    </>
  );

  return (
    <Sheet
      title={'Job ' + id}
      tag={stageName(j.stage)}
      description={st.name + ' for ' + customerOf(s, o.customer).name + '. Move it on when your part is done.'}
      footer={hasActions ? footer : undefined}
    >
      <StageStepper current={idx} />

      <KeyValueList>
        <KeyValue label="Customer">{customerOf(s, o.customer).name}</KeyValue>
        <KeyValue label="Making">{st.name + ' · size ' + o.size}</KeyValue>
        <KeyValue label="Fabric chosen">{materialOf(s, o.material).name}</KeyValue>
        <KeyValue label="This style needs">{qty(st.specs[o.size]) + ' yards'}</KeyValue>
        <KeyValue label="Given out so far">{given ? qty(given) + ' yards' : 'nothing yet'}</KeyValue>
        <KeyValue label="Now at">{stageName(j.stage)}</KeyValue>
        <KeyValue label="Redone" tone={j.reworks ? 'warning' : undefined}>
          {j.reworks ? j.reworks + ' times' : 'never'}
        </KeyValue>
        <KeyValue label="Still owing" total tone={bal > 0 ? 'danger' : 'success'}>
          {bal > 0 ? naira(bal) : 'paid in full'}
        </KeyValue>
      </KeyValueList>

      <Field label="Who is doing it" className="mt-5">
        <Select value={j.assigned ?? ''} onChange={(e) => assignJob(id, e.target.value || null)}>
          <option value="">— nobody —</option>
          {tailors(s).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </Field>
    </Sheet>
  );
}
