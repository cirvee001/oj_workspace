import { useState } from 'react';
import { Button, Field, FormGrid, Input, Select, Sheet } from '@/components/ui';
import {
  INFLUENCER_TIERS,
  addInfluencer,
  updateInfluencer,
  type InfluencerTier,
} from '@/store/actions/marketing';
import { useApp } from '@/store/hooks';
import { closeSheet } from '@/store/ui/sheetStore';

const FORM_ID = 'influencer-form';
const naira = (kobo: number | undefined) => (kobo ? String(kobo / 100) : '');

/** Agree a deal with an influencer (no id) or change one. */
export function InfluencerFormSheet({ id }: { id?: string }) {
  const s = useApp();
  const existing = id ? s.influencers.find((x) => x.id === id) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [handle, setHandle] = useState(existing?.handle ?? '');
  const [tier, setTier] = useState<InfluencerTier>(INFLUENCER_TIERS.find((t) => t === existing?.tier) ?? 'Micro');
  const [followers, setFollowers] = useState(existing?.followers ?? '');
  const [code, setCode] = useState(existing?.code ?? '');
  const [gifted, setGifted] = useState(existing ? String(existing.gifted) : '1');
  const [giftCost, setGiftCost] = useState(naira(existing?.giftCost));
  const [fee, setFee] = useState(naira(existing?.fee));
  const [promised, setPromised] = useState(existing ? String(existing.promised) : '2');

  if (id && !existing) return null;

  return (
    <Sheet
      title={existing ? 'Edit ' + existing.name : 'Add influencer'}
      description={existing ? 'The deal: what we give, what they post, their code.' : 'What we give, what they promise to post, and their code.'}
      footer={
        <>
          <Button variant="secondary" onClick={closeSheet}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} leftIcon="check">
            {existing ? 'Save changes' : 'Add influencer'}
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={(e) => {
          e.preventDefault();
          const input = { name, handle, tier, followers, code, gifted, giftCostNaira: giftCost, feeNaira: fee, promised };
          if (existing) updateInfluencer(existing.id, input);
          else addInfluencer(input);
        }}
      >
        <FormGrid>
          <Field label="Name">
            <Input placeholder="Tiwa Balogun" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Handle">
            <Input
              placeholder="@tiwastyles"
              autoComplete="off"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              onBlur={() => handle.trim() && !handle.trim().startsWith('@') && setHandle('@' + handle.trim())}
            />
          </Field>
          <Field label="Tier">
            <Select value={tier} onChange={(e) => setTier(e.target.value as InfluencerTier)}>
              {INFLUENCER_TIERS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Followers">
            <Input placeholder="28k" value={followers} onChange={(e) => setFollowers(e.target.value)} />
          </Field>
          <Field label="Discount code" hint="Sales with this code are traced to them.">
            <Input placeholder="TIWA10" autoComplete="off" className="uppercase" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          </Field>
          <Field label="Posts promised">
            <Input type="number" inputMode="numeric" min={0} step={1} className="tabular-nums" value={promised} onChange={(e) => setPromised(e.target.value)} />
          </Field>
          <Field label="Outfits gifted">
            <Input type="number" inputMode="numeric" min={0} step={1} className="tabular-nums" value={gifted} onChange={(e) => setGifted(e.target.value)} />
          </Field>
          <Field label="Cost to make them" hint="All the gifted outfits together.">
            <Input prefix="₦" type="number" inputMode="decimal" min={0} placeholder="0" className="tabular-nums" value={giftCost} onChange={(e) => setGiftCost(e.target.value)} />
          </Field>
          <Field label="Fee" optional full hint="Money agreed on top of the outfits.">
            <Input prefix="₦" type="number" inputMode="decimal" min={0} placeholder="0" className="tabular-nums" value={fee} onChange={(e) => setFee(e.target.value)} />
          </Field>
        </FormGrid>
      </form>
    </Sheet>
  );
}
