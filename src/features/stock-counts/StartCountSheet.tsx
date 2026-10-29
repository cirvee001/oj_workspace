import { useState, type FormEvent } from 'react';
import { Button, DataTable, Input, Note, Sheet, type Column } from '@/components/ui';
import { cn } from '@/lib/cn';
import { qty } from '@/lib/format';
import { useApp } from '@/store/hooks';
import { branchName, myBranch, stockOf } from '@/store/selectors';
import { countableMaterials, submitCount } from '@/store/actions/stock';
import { closeSheet } from '@/store/ui/sheetStore';
import type { Material } from '@/types/domain';

const FORM_ID = 'start-count-form';

export function StartCountSheet() {
  const s = useApp();
  const here = myBranch(s);
  const [mats] = useState(countableMaterials);
  const [counted, setCounted] = useState<Record<string, string>>(() =>
    Object.fromEntries(mats.map((m) => [m.id, qty(stockOf(s, m.id, here))])),
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    submitCount(Object.fromEntries(mats.map((m) => [m.id, Number(counted[m.id] || 0)])));
  };

  const columns: Column<Material>[] = [
    { key: 'item', header: 'Item', cell: (m) => <span className="font-semibold text-text">{m.name}</span> },
    {
      key: 'system',
      header: 'System says',
      align: 'right',
      cell: (m) => <span className="tabular-nums">{qty(stockOf(s, m.id, here)) + ' ' + m.unit}</span>,
    },
    {
      key: 'counted',
      header: 'You counted',
      align: 'right',
      width: 136,
      cell: (m) => {
        const off = Number(counted[m.id] || 0) !== stockOf(s, m.id, here);
        return (
          <Input
            type="number"
            step="0.5"
            aria-label={'Counted ' + m.name}
            containerClassName={cn('ml-auto h-8 w-28 px-3', off && 'border-warning-line bg-warning-fill')}
            className="text-right tabular-nums"
            value={counted[m.id] ?? ''}
            onChange={(e) => setCounted((c) => ({ ...c, [m.id]: e.target.value }))}
          />
        );
      },
    },
  ];

  return (
    <Sheet
      title="Count the store"
      tag={branchName(s, here)}
      description="Type what is actually on the shelf."
      footer={
        <>
          <Button variant="secondary" onClick={closeSheet}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} leftIcon="check">
            Submit the count
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit}>
        <div className="-mx-2">
          <DataTable bare density="compact" data={mats} columns={columns} rowKey={(m) => m.id} pageSize={null} />
        </div>
        <Note>Anything that does not match has to be explained before it is accepted.</Note>
      </form>
    </Sheet>
  );
}
