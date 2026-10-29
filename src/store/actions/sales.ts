import type { Channel, EnquiryStage } from '@/types/domain';
import { enquiryStageName, isEnquiryClosed } from '@/config/constants';
import { TODAY, clockTime, isoFromToday, niceDate } from '@/lib/dates';
import { naira } from '@/lib/format';
import { getState, update } from '../appStore';
import { branchName, customerOf, myBranch, styleOf } from '../selectors';
import { toast } from '../ui/toastStore';
import { closeSheet } from '../ui/sheetStore';
import { addLog } from './core';
import { createCustomer } from './customers';

/* ---------------- ready-to-wear rail ---------------- */

export function sellPiece(productId: string, size: string, colour: string): void {
  const s = getState();
  const here = myBranch(s);
  const p = s.products.find((x) => x.id === productId);
  const v = p?.variants.find((x) => x.size === size && x.colour === colour);
  if (!p || !v) return;
  const have = v.stock[here] ?? 0;
  if (have <= 0) {
    const other = s.branches.find((b) => b.id !== here && (v.stock[b.id] ?? 0) > 0);
    toast('That one is finished at ' + branchName(s, here) + '.',
      other ? other.name + ' still has ' + v.stock[other.id] + '. Ask them to send one over.' : 'None left anywhere. Worth making more.');
    return;
  }
  update((d) => {
    const dv = d.products.find((x) => x.id === productId)!.variants.find((x) => x.size === size && x.colour === colour)!;
    dv.stock[here] = have - 1;
    d.sales.unshift({ what: p.name + ' · ' + size + ' · ' + colour, amount: p.price, when: TODAY, branch: here, by: d.actor!, at: clockTime() });
    addLog(d, 'Sold ' + p.name + ' (' + size + ', ' + colour + ')', naira(p.price));
  });
  toast('Sold. ' + naira(p.price) + ' taken.',
    have - 1 === 0 ? 'That was the last one in that size.' : have - 1 + ' left at ' + branchName(s, here) + '.');
}

/** Attach a photo to a product. It stays on this device — nothing is uploaded. */
export function setProductPhoto(productId: string, file: File): void {
  if (file.size > 4 * 1024 * 1024) {
    toast('That picture is too big.', 'Try one under 4MB.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    update((d) => {
      d.photos[productId] = String(reader.result);
      addLog(d, 'Added a photo to ' + (d.products.find((p) => p.id === productId)?.name ?? ''));
    });
    toast('Photo added.', 'It stays on this device — nothing is uploaded.');
  };
  reader.onerror = () => toast('That file could not be read.', 'Try a different picture.');
  reader.readAsDataURL(file);
}

/* ---------------- messages ---------------- */

export function sendChatReply(chatId: string, text: string): boolean {
  const t = text.trim();
  if (!t) {
    toast('Write something first.');
    return false;
  }
  const s = getState();
  const c = s.chats.find((x) => x.id === chatId);
  if (!c) return false;
  const who = customerOf(s, c.customer).name;
  update((d) => {
    const chat = d.chats.find((x) => x.id === chatId)!;
    chat.messages.push({ from: 'us', text: t, at: clockTime() });
    if (!chat.assigned) chat.assigned = d.actor;
    addLog(d, 'Replied to ' + who, c.channel + ': "' + t.slice(0, 40) + '"');
  });
  toast('Sent.', 'It is saved on ' + who + '’s record.');
  return true;
}

/* ---------------- enquiries (PRD §12) ---------------- */

export function moveEnquiry(id: string, to: EnquiryStage): void {
  const e = getState().enquiries.find((x) => x.id === id);
  if (!e) return;
  if (to === e.stage) {
    closeSheet();
    return;
  }
  const next = isEnquiryClosed(to) ? '' : isoFromToday(3);
  update((d) => {
    const rec = d.enquiries.find((x) => x.id === id)!;
    rec.stage = to;
    rec.lastContact = TODAY;
    rec.nextFollowUp = next;
    addLog(d, 'Moved enquiry ' + id + ' to ' + enquiryStageName(to), e.name);
  });
  closeSheet();
  toast(e.name + ' is now "' + enquiryStageName(to) + '".', next ? 'Next follow-up set for ' + niceDate(next) + '.' : '');
}

export type NewEnquiryInput =
  | { who: 'existing'; customer: string; source: Channel; style: string; note: string }
  | { who: 'new'; name: string; phone: string; source: Channel; style: string; note: string };

/**
 * Log an enquiry. Someone new is added as a customer first (came from the
 * enquiry's source), so the follow-up and any later order land on one record.
 */
export function saveEnquiry(input: NewEnquiryInput): boolean {
  let customerId: string;
  if (input.who === 'new') {
    if (input.name.trim().length < 2 || !input.phone.trim()) {
      toast('Enter their name and phone number.');
      return false;
    }
    const id = createCustomer({ name: input.name, phone: input.phone, channel: input.source, birthday: '', tags: [],
      notes: '', sizes: {} });
    if (!id) return false;
    customerId = id;
  } else {
    if (!getState().customers.some((c) => c.id === input.customer)) {
      toast('Choose who is asking.');
      return false;
    }
    customerId = input.customer;
  }
  const c = customerOf(getState(), customerId);
  const follow = isoFromToday(2);
  update((d) => {
    const max = d.enquiries.reduce((n, x) => Math.max(n, Number(x.id.replace(/\D/g, '')) || 0), 1499);
    d.enquiries.unshift({ id: 'E-' + (max + 1), customer: c.id, name: c.name, phone: c.phone,
      source: input.source, style: input.style, value: styleOf(d, input.style).price, stage: 'new', owner: d.actor!,
      lastContact: TODAY, nextFollowUp: follow, branch: myBranch(d), note: input.note.trim() });
    addLog(d, 'Added an enquiry from ' + c.name, input.source + ' · ' + styleOf(d, input.style).name);
  });
  closeSheet();
  toast('Enquiry saved.', (input.who === 'new' ? c.name + ' is now a customer. ' : '') + 'Follow up set for ' + niceDate(follow) + '.');
  return true;
}
