import { MESSAGE_COST_NAIRA } from '@/config/constants';
import { TODAY } from '@/lib/dates';
import { plural, toKobo } from '@/lib/format';
import { getState, update } from '../appStore';
import { can } from '../selectors';
import { toast } from '../ui/toastStore';
import { closeSheet } from '../ui/sheetStore';
import { confirmDialog, promptDialog } from '../ui/dialogStore';
import { addLog } from './core';

/** Send a message to a group of customers. Messages cost money, so confirm first. */
export async function sendToGroup(group: string, count: number): Promise<void> {
  if (!count) {
    toast('Nobody is in that group today.');
    return;
  }
  const ok = await confirmDialog({
    title: 'Send to ' + plural(count, 'customer') + '?',
    message: 'Everyone in "' + group + '" gets this message. Messages cost money — roughly ₦' +
      count * MESSAGE_COST_NAIRA + ' at ₦' + MESSAGE_COST_NAIRA + ' each.',
    confirmLabel: 'Send it',
  });
  if (!ok) return;
  update((d) => {
    const c = d.campaigns.find((x) => x.segment === group);
    if (c) {
      c.sent += count;
      c.status = 'sent';
    } else {
      d.campaigns.unshift({ id: 'cm' + Date.now(), name: 'Message to ' + group, channel: 'WhatsApp', segment: group,
        status: 'sent', sent: count, replies: 0 });
    }
    addLog(d, 'Sent a campaign to ' + group, count + ' customers');
  });
  toast('Sent to ' + count + ' customers.', 'Replies land in Messages.');
}

export function toggleAutomation(id: string): void {
  let on = false;
  let trigger = '';
  update((d) => {
    const a = d.automations.find((x) => x.id === id)!;
    a.on = !a.on;
    on = a.on;
    trigger = a.trigger;
    addLog(d, (a.on ? 'Turned on' : 'Turned off') + ' the automatic message', a.trigger);
  });
  toast(trigger + ' messages are now ' + (on ? 'on' : 'off') + '.');
}

export async function recordInfluencerPost(id: string): Promise<void> {
  const reach = await promptDialog({
    title: 'Record a post',
    message: 'How many people did it reach?',
    defaultValue: '12000',
    inputType: 'number',
    confirmLabel: 'Record it',
  });
  if (reach === null) return;
  const n = Number(reach);
  if (isNaN(n) || n < 0) {
    toast('Enter a number.');
    return;
  }
  update((d) => {
    const i = d.influencers.find((x) => x.id === id)!;
    i.posts.push({ platform: 'Instagram', when: TODAY, reach: n });
    if (i.status === 'agreed') i.status = 'running';
    addLog(d, 'Recorded a post by ' + i.name, n.toLocaleString() + ' reached');
  });
  const i = getState().influencers.find((x) => x.id === id)!;
  const owed = Math.max(0, i.promised - i.posts.length);
  toast('Recorded.', owed ? plural(owed, 'post') + ' still owed.' : 'All promised posts delivered.');
}

/* ---------------- influencers ---------------- */

export const INFLUENCER_TIERS = ['Nano', 'Micro', 'Macro'] as const;
export type InfluencerTier = (typeof INFLUENCER_TIERS)[number];

export interface InfluencerInput {
  name: string;
  handle: string;
  tier: InfluencerTier;
  /** As people say it: "28k". */
  followers: string;
  code: string;
  gifted: string | number;
  giftCostNaira: string | number;
  feeNaira: string | number;
  promised: string | number;
}

/** Shared checks for add and edit. Returns the cleaned values, or null after a toast. */
function checkInfluencer(input: InfluencerInput, id?: string) {
  const s = getState();
  if (!can(s, 'market')) {
    toast('Only marketing can manage influencers.');
    return null;
  }
  const name = input.name.trim().replace(/\s+/g, ' ');
  const bare = input.handle.trim().replace(/^@+/, '');
  const handle = '@' + bare;
  const code = input.code.trim().toUpperCase().replace(/\s+/g, '');
  const followers = input.followers.trim();
  const gifted = Number(input.gifted || 0);
  const promised = Number(input.promised || 0);
  const giftCost = toKobo(input.giftCostNaira);
  const fee = toKobo(input.feeNaira);
  if (name.length < 2) {
    toast('Enter their name.');
    return null;
  }
  if (!/^[A-Za-z0-9._]{2,30}$/.test(bare)) {
    toast('Check the handle.', 'Letters, numbers, dots and underscores, like @tiwastyles.');
    return null;
  }
  if (!INFLUENCER_TIERS.includes(input.tier)) {
    toast('Pick a tier.');
    return null;
  }
  if (!followers) {
    toast('Enter how many people follow them.', 'For example 28k.');
    return null;
  }
  if (!/^[A-Z0-9]{3,16}$/.test(code)) {
    toast('Check the discount code.', '3 to 16 letters or numbers, like TIWA10.');
    return null;
  }
  if (s.influencers.some((x) => x.id !== id && x.code.toUpperCase() === code)) {
    toast('Someone already has the code ' + code + '.', 'Each influencer needs their own code so sales trace back.');
    return null;
  }
  if (s.influencers.some((x) => x.id !== id && x.handle.toLowerCase() === handle.toLowerCase())) {
    toast(handle + ' is already on the list.');
    return null;
  }
  if (![gifted, promised].every((n) => Number.isInteger(n) && n >= 0)) {
    toast('Outfits and posts are whole numbers.');
    return null;
  }
  if (!(giftCost >= 0) || !(fee >= 0)) {
    toast('Check the amounts.');
    return null;
  }
  if (gifted > 0 && giftCost === 0) {
    toast('Enter what the gifted outfits cost to make.');
    return null;
  }
  return { name, handle, code, followers, gifted, promised, giftCost, fee };
}

export function addInfluencer(input: InfluencerInput): boolean {
  const ok = checkInfluencer(input);
  if (!ok) return false;
  update((d) => {
    const n = d.influencers.reduce((max, x) => Math.max(max, Number(x.id.replace(/^in/, '')) || 0), 0) + 1;
    d.influencers.push({ id: 'in' + n, ...ok, tier: input.tier, paid: 0, posts: [], sales: 0, salesValue: 0, status: 'agreed' });
    addLog(d, 'Agreed a deal with ' + ok.name, ok.handle + ' · code ' + ok.code);
  });
  closeSheet();
  toast(ok.name + ' added.', 'Sales with ' + ok.code + ' will be traced to them.');
  return true;
}

export function updateInfluencer(id: string, input: InfluencerInput): boolean {
  if (!getState().influencers.some((x) => x.id === id)) return false;
  const ok = checkInfluencer(input, id);
  if (!ok) return false;
  update((d) => {
    const i = d.influencers.find((x) => x.id === id)!;
    Object.assign(i, ok, { tier: input.tier });
    addLog(d, 'Updated the deal with ' + ok.name, ok.handle + ' · code ' + ok.code);
  });
  closeSheet();
  toast('Saved.', ok.name + '’s deal is up to date.');
  return true;
}
