/** ⌘K search across clients, orders, jobs, staff, fabric, products, enquiries and screens (PRD §33). */
import { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, Search } from 'lucide-react';
import type { AppState } from '@/types/domain';
import { Icon, type IconName } from '@/components/ui';
import { NAV, canSeeScreen } from '@/config/navigation';
import { enquiryStageName, stageName } from '@/config/constants';
import { naira, qty } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useApp } from '@/store/hooks';
import type { Target } from '@/store/derived';
import { branchName, customerOf, myBranch, nameOf, stockOf, styleOf } from '@/store/selectors';
import { useOpenTarget } from '@/hooks/useGo';

interface Hit {
  group: string;
  icon: IconName;
  title: string;
  body: string;
  target: Target;
}

function search(s: AppState, term: string): Hit[] {
  const has = (text: string) => text.toLowerCase().includes(term);
  const here = myBranch(s);
  const hits: Hit[] = [];
  NAV.flatMap((g) => g.items)
    .filter((i) => canSeeScreen(s, i.key) && has(i.label))
    .slice(0, 3)
    .forEach((i) => hits.push({ group: 'Go to', icon: i.icon, title: i.label, body: 'Screen', target: { screen: i.key } }));
  s.customers.filter((c) => has(c.name + c.phone)).slice(0, 4).forEach((c) =>
    hits.push({ group: 'Clients', icon: 'users', title: c.name, body: c.phone, target: { sheet: { type: 'customer', id: c.id } } }),
  );
  s.orders.filter((o) => has(o.id + customerOf(s, o.customer).name)).slice(0, 4).forEach((o) =>
    hits.push({ group: 'Orders', icon: 'receipt', title: `${o.id} · ${styleOf(s, o.style).name}`, body: `${customerOf(s, o.customer).name} · ${naira(o.total)}`, target: { sheet: { type: 'order', id: o.id } } }),
  );
  s.jobs.filter((j) => has(j.id)).slice(0, 3).forEach((j) =>
    hits.push({ group: 'Jobs', icon: 'scissors', title: j.id, body: `${stageName(j.stage)} · ${nameOf(s, j.assigned)}`, target: { sheet: { type: 'job', id: j.id } } }),
  );
  s.staff.filter((x) => has(x.name + x.badge)).slice(0, 3).forEach((x) =>
    hits.push({ group: 'Staff', icon: 'staff', title: x.name, body: `${x.roleName} · ${branchName(s, x.branch)}`, target: { sheet: { type: 'staff', id: x.id } } }),
  );
  s.materials.filter((m) => has(m.name)).slice(0, 3).forEach((m) =>
    hits.push({ group: 'Fabric', icon: 'layers', title: m.name, body: `${qty(stockOf(s, m.id, here))} ${m.unit} at ${branchName(s, here)}`, target: { screen: 'fabric' } }),
  );
  s.products.filter((p) => has(p.name + p.sku)).slice(0, 3).forEach((p) =>
    hits.push({ group: 'Products', icon: 'tag', title: p.name, body: `${p.sku} · ${naira(p.price)}`, target: { screen: 'shop' } }),
  );
  s.enquiries.filter((e) => has(e.name + e.phone + e.id)).slice(0, 3).forEach((e) =>
    hits.push({ group: 'Enquiries', icon: 'chat', title: e.name, body: `${enquiryStageName(e.stage)} · ${styleOf(s, e.style).name}`, target: { sheet: { type: 'enquiry', id: e.id } } }),
  );
  return hits;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useApp();
  const openTarget = useOpenTarget();
  const [value, setValue] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const term = value.trim().toLowerCase();
  const hits = useMemo(() => (term.length < 2 ? [] : search(s, term)), [s, term]);

  useEffect(() => {
    if (!open) setValue('');
  }, [open]);
  useEffect(() => setActive(0), [term]);
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const choose = (h: Hit) => {
    onClose();
    openTarget(h.target);
  };

  return (
    <div className="no-print fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]" role="presentation">
      <div className="fixed inset-0 animate-in bg-ui-950/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label="Search" className="relative w-full max-w-xl animate-scale-in overflow-hidden rounded-card bg-surface shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-5">
          <Search size={18} className="shrink-0 text-text-muted" aria-hidden="true" />
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(hits.length - 1, a + 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              }
              if (e.key === 'Enter' && hits[active]) choose(hits[active]);
            }}
            placeholder="Search clients, orders, staff, fabric…"
            aria-label="Search"
            role="combobox"
            aria-expanded={hits.length > 0}
            aria-controls="cmdk-list"
            className="h-14 w-full bg-transparent text-body-15 text-text outline-none placeholder:text-text-muted"
          />
          <kbd className="rounded-tag border border-border px-1.5 py-0.5 font-mono text-[10px] text-text-muted">Esc</kbd>
        </div>
        <ul ref={listRef} id="cmdk-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {term.length < 2 && <li className="px-3 py-6 text-center text-body-13 text-text-muted">Type at least two letters.</li>}
          {term.length >= 2 && !hits.length && (
            <li className="px-3 py-6 text-center text-body-13 text-text-muted">Nothing matches &ldquo;{value}&rdquo;.</li>
          )}
          {hits.map((h, i) => (
            <li key={i}>
              {(i === 0 || hits[i - 1].group !== h.group) && <p className="px-3 pt-3 pb-1.5 text-eyebrow text-text-muted">{h.group}</p>}
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(h)}
                className={cn('flex w-full items-center gap-3 rounded-ctl px-3 py-2.5 text-left', i === active && 'bg-accent-wash')}
              >
                <span className={cn('grid size-8 shrink-0 place-items-center rounded-tile', i === active ? 'bg-accent-subtle text-accent' : 'bg-surface-sunken text-text-secondary')}>
                  <Icon name={h.icon} size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-14 font-semibold text-text">{h.title}</span>
                  <span className="block truncate text-body-12 text-text-muted">{h.body}</span>
                </span>
                {i === active && <CornerDownLeft size={14} className="shrink-0 text-text-muted" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
