import { useRef, type ChangeEvent } from 'react';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Figure,
  Icon,
  List,
  ListItem,
  PageHeader,
  SectionHeader,
  StatCard,
  StatGrid,
} from '@/components/ui';
import { SWATCH } from '@/config/constants';
import { useGo } from '@/hooks/useGo';
import { cn } from '@/lib/cn';
import { TODAY } from '@/lib/dates';
import { naira, nairaShort } from '@/lib/format';
import { useApp } from '@/store/hooks';
import { branchName, can, myBranch, nameOf } from '@/store/selectors';
import { sellPiece, setProductPhoto } from '@/store/actions/sales';
import { openSheet } from '@/store/ui/sheetStore';
import { Garment } from './Garment';

export function ProductsPage() {
  const s = useApp();
  const go = useGo();
  const here = myBranch(s);
  const canSell = can(s, 'sell');
  const canEdit = can(s, 'approve');

  /* One hidden file picker shared by every card; remembers which product asked. */
  const fileRef = useRef<HTMLInputElement>(null);
  const forProduct = useRef<string | null>(null);

  const pickPhoto = (productId: string) => {
    forProduct.current = productId;
    fileRef.current?.click();
  };
  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    const pid = forProduct.current;
    e.target.value = '';
    if (f && pid) setProductPhoto(pid, f);
  };

  const left = (stock: Record<string, number>) => stock[here] ?? 0;
  const totalUnits = s.products.reduce((n, p) => n + p.variants.reduce((m, v) => m + left(v.stock), 0), 0);
  const value = s.products.reduce((n, p) => n + p.variants.reduce((m, v) => m + left(v.stock) * p.price, 0), 0);
  const outOf = s.products.reduce((n, p) => n + p.variants.filter((v) => left(v.stock) === 0).length, 0);
  const soldToday = s.sales.filter((x) => x.when === TODAY && x.branch === here);

  return (
    <>
      <PageHeader
        title="Ready to wear"
        description="Finished pieces on the rail. Stock comes down the moment one is sold."
        actions={
          <>
            {canSell && (
              <Button variant="secondary" leftIcon="layers" onClick={() => go('fabric')}>
                Fabric store
              </Button>
            )}
            {canEdit && (
              <Button leftIcon="plus" onClick={() => openSheet({ type: 'productForm' })}>
                Add product
              </Button>
            )}
          </>
        }
      />

      <StatGrid className="mb-6">
        <StatCard label="Pieces on the rail" value={totalUnits} icon="tag" caption={'at ' + branchName(s, here)} />
        <StatCard label="Rail is worth" value={nairaShort(value)} icon="coins" caption="at selling price" />
        <StatCard
          label="Sold today"
          value={soldToday.length}
          icon="receipt"
          tone="success"
          caption={nairaShort(soldToday.reduce((n, x) => n + x.amount, 0)) + ' taken'}
        />
        <StatCard
          label="Gaps on the rail"
          value={outOf}
          icon="x"
          tone={outOf ? 'danger' : 'success'}
          caption={outOf ? 'sizes with none left' : 'every size in stock'}
        />
      </StatGrid>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
        {s.products.map((p) => {
          /* A photo taken in the shop wins over the catalogue photo. */
          const shot = s.photos[p.id] ?? p.photo;
          const total = p.variants.reduce((n, v) => n + left(v.stock), 0);
          const first = p.variants[0];
          return (
            <article key={p.id} className="flex min-w-0 flex-col rounded-card bg-surface p-2.5 shadow-card">
              <div className="relative aspect-4/5 overflow-hidden rounded-tile bg-surface-sunken">
                {shot ? (
                  <img src={shot} alt={p.name} loading="lazy" decoding="async" className="block size-full object-cover object-top" />
                ) : (
                  <Garment shape={p.shape} colour={first?.colour ?? ''} patterned={p.patterned} id={p.id} />
                )}
                {total === 0 && (
                  <Badge tone="danger" className="absolute top-2.5 left-2.5">
                    none left
                  </Badge>
                )}
                {canSell && (
                  <button
                    type="button"
                    title="Add a photo"
                    onClick={() => pickPhoto(p.id)}
                    className="absolute right-2.5 bottom-2.5 inline-flex h-7 items-center gap-1.5 rounded-ctl bg-surface px-2.5 text-body-12 font-medium text-text shadow-card transition-colors hover:bg-surface-hover"
                  >
                    <Icon name="photo" size={14} /> Photo
                  </button>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-3 px-1.5 pt-3 pb-1.5">
                <div className="flex items-start gap-2.5">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-body-14 font-bold text-text">{p.name}</h3>
                    <p className="text-body-12 text-text-muted">{p.sku}</p>
                  </div>
                  <span className="ml-auto font-display text-body-15 font-semibold whitespace-nowrap text-text tabular-nums">
                    {naira(p.price)}
                  </span>
                </div>
                <ul className="mt-auto divide-y divide-border border-t border-border">
                  {p.variants.map((v) => {
                    const have = left(v.stock);
                    return (
                      <li key={v.size + v.colour} className="flex items-center gap-2 py-1.5 text-body-13">
                        <span
                          aria-hidden="true"
                          className="size-3 flex-none rounded-full ring-1 ring-border-strong"
                          style={{ background: SWATCH[v.colour] ?? 'var(--color-text-muted)' }}
                        />
                        <span className="min-w-0 flex-1 truncate text-text-label">{v.size + ' · ' + v.colour}</span>
                        <span
                          className={cn(
                            'text-body-12 whitespace-nowrap tabular-nums',
                            have ? 'text-text-muted' : 'font-medium text-danger-text',
                          )}
                        >
                          {have ? have + ' left' : 'none'}
                        </span>
                        <Button
                          size="sm"
                          variant={canSell && have > 0 ? 'primary' : 'secondary'}
                          disabled={!(canSell && have > 0)}
                          className="h-7 px-2.5 text-body-12"
                          onClick={() => sellPiece(p.id, v.size, v.colour)}
                        >
                          Sell
                        </Button>
                      </li>
                    );
                  })}
                </ul>
                {(canSell || canEdit) && (
                  <div className="flex items-center justify-end gap-1.5">
                    {canEdit && (
                      <Button size="sm" variant="ghost" leftIcon="edit" onClick={() => openSheet({ type: 'productForm', id: p.id })}>
                        Edit
                      </Button>
                    )}
                    {canSell && (
                      <Button size="sm" variant="secondary" leftIcon="plus" onClick={() => openSheet({ type: 'restock', productId: p.id })}>
                        Restock
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <SectionHeader title="Sold today" />
      {soldToday.length ? (
        <List>
          {soldToday.map((x, i) => (
            <ListItem
              key={x.at + '-' + i}
              leading={<Avatar name={nameOf(s, x.by)} />}
              title={x.what}
              description={x.at + ' · sold by ' + nameOf(s, x.by)}
              trailing={<Figure value={naira(x.amount)} />}
            />
          ))}
        </List>
      ) : (
        <EmptyState bordered icon="tag" title="Nothing sold yet today" message="Sales appear here as they happen." />
      )}
    </>
  );
}
