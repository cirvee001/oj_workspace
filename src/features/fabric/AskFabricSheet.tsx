import { useState, type FormEvent } from 'react';
import { Button, EmptyState, Field, FormGrid, Input, KeyValue, KeyValueList, Note, Select, Sheet } from '@/components/ui';
import { qty } from '@/lib/format';
import { useApp } from '@/store/hooks';
import { branchJobs, customerOf, jobOf, materialOf, myBranch, orderOf, stockOf, styleOf, tailors } from '@/store/selectors';
import { requestFabric } from '@/store/actions/fabric';
import { closeSheet } from '@/store/ui/sheetStore';
import type { AppState } from '@/types/domain';

const FORM_ID = 'ask-fabric-form';
const DESCRIPTION = 'Fabric is always given out against one job and one person.';

/** The order behind a job, if both exist. */
const orderForJob = (s: AppState, jobId: string) => {
  const j = jobOf(s, jobId);
  return j ? orderOf(s, j.order) : undefined;
};

/** Yards a job's style and size needs, or 0 if the job cannot be found. */
function needFor(s: AppState, jobId: string): number {
  const o = orderForJob(s, jobId);
  return o ? styleOf(s, o.style).specs[o.size] : 0;
}

export function AskFabricSheet({ jobId: preJob }: { jobId?: string }) {
  const s = useApp();
  const open = branchJobs(s).filter((j) => j.stage !== 'delivery');
  const people = tailors(s);

  const [jobId, setJobId] = useState(() =>
    preJob && open.some((j) => j.id === preJob) ? preJob : (open[0]?.id ?? ''),
  );
  const [collector, setCollector] = useState(() =>
    s.actor && people.some((p) => p.id === s.actor) ? s.actor : (people[0]?.id ?? ''),
  );
  const [yards, setYards] = useState(() => qty(needFor(s, jobId)));

  if (!open.length) {
    return (
      <Sheet
        title="Ask for fabric"
        description={DESCRIPTION}
        footer={
          <Button variant="secondary" onClick={closeSheet}>
            Close
          </Button>
        }
      >
        <EmptyState icon="layers" title="No open jobs" message="There are no open jobs to ask fabric for." size="sm" />
      </Sheet>
    );
  }

  const o = orderForJob(s, jobId);
  const st = styleOf(s, o?.style ?? '');
  const need = o ? st.specs[o.size] : 0;
  const m = materialOf(s, o?.material ?? '');
  const allow = Math.round(need * (1 + st.tol / 100) * 100) / 100;
  const want = Number(yards || 0);
  const over = want > allow;

  const changeJob = (id: string) => {
    setJobId(id);
    setYards(qty(needFor(s, id)));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void requestFabric({ jobId, collector, yards: want });
  };

  return (
    <Sheet
      title="Ask for fabric"
      description={DESCRIPTION}
      footer={
        <>
          <Button variant="secondary" onClick={closeSheet}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} leftIcon="layers">
            Send the request
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit}>
        <FormGrid>
          <Field label="Which job" full>
            <Select value={jobId} onChange={(e) => changeJob(e.target.value)}>
              {open.map((j) => {
                const jo = orderOf(s, j.order);
                return (
                  <option key={j.id} value={j.id}>
                    {j.id +
                      ' — ' +
                      (jo ? styleOf(s, jo.style).name + ' ' + jo.size + ' for ' + customerOf(s, jo.customer).name : '')}
                  </option>
                );
              })}
            </Select>
          </Field>
          <Field label="Who is collecting">
            <Select value={collector} onChange={(e) => setCollector(e.target.value)}>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="How many yards">
            <Input type="number" step="0.5" value={yards} suffix="yd" onChange={(e) => setYards(e.target.value)} />
          </Field>
        </FormGrid>

        <div className="mt-5 rounded-tile bg-surface-sunken px-4 py-1.5">
          <KeyValueList>
            <KeyValue label="Fabric">{m.name}</KeyValue>
            <KeyValue label="In the store">{qty(stockOf(s, m.id, myBranch(s))) + ' yards'}</KeyValue>
            <KeyValue label={st.name + ' size ' + (o?.size ?? '') + ' takes'}>{qty(need) + ' yards'}</KeyValue>
            <KeyValue label="Allowed without asking">{'up to ' + qty(allow) + ' yards'}</KeyValue>
            <KeyValue label="You are asking for" total tone={over ? 'warning' : 'success'}>
              {qty(want) + ' yards' + (over ? ' — needs approval' : '')}
            </KeyValue>
          </KeyValueList>
        </div>
        <Note>One job and one name is what makes it possible to answer "where did it go?" months later.</Note>
      </form>
    </Sheet>
  );
}
