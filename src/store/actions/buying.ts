import { TODAY } from '@/lib/dates';
import { naira, plural, qty, toKobo } from '@/lib/format';
import type { GarmentShape, Material, PaymentMethod, Product } from '@/types/domain';
import { getState, update } from '../appStore';
import { branchName, can, myBranch, supplierOf } from '../selectors';
import { toast } from '../ui/toastStore';
import { closeSheet } from '../ui/sheetStore';
import { addLog } from './core';

/** Next id in a series like s1, s2… or m1, m2…: one past the highest number used. */
const nextId = (prefix: string, ids: string[]): string =>
  prefix + (ids.reduce((n, id) => Math.max(n, Number(id.slice(prefix.length)) || 0), 0) + 1);

/* ---------------- purchase orders ---------------- */

export interface PurchaseOrderInput {
  supplier: string;
  material: string;
  qty: number;
  /** Cost of one unit, in naira as typed. */
  costNaira: string | number;
  expected: string;
}

export function createPurchaseOrder(input: PurchaseOrderInput): boolean {
  const s = getState();
  if (!can(s, 'buy')) {
    toast('You do not have permission to buy stock.', 'Ask the store keeper or a manager.');
    return false;
  }
  const m = s.materials.find((x) => x.id === input.material);
  if (!m) {
    toast('Choose what you are buying.');
    return false;
  }
  if (!s.suppliers.some((x) => x.id === input.supplier)) {
    toast('Choose a supplier.');
    return false;
  }
  if (!(input.qty > 0)) {
    toast('How much are you ordering?');
    return false;
  }
  const cost = toKobo(input.costNaira);
  if (!(cost > 0)) {
    toast('Enter what one ' + m.unit.replace(/s$/, '') + ' costs.');
    return false;
  }
  if (!input.expected || input.expected < TODAY) {
    toast('When should it arrive?', 'The date cannot be in the past.');
    return false;
  }
  const here = myBranch(s);
  const sup = supplierOf(s, input.supplier);
  let id = '';
  update((d) => {
    id = here + '/P/' + ++d.counter.po;
    d.pos.unshift({ id, supplier: input.supplier, branch: here, material: m.id, ordered: input.qty, received: 0,
      cost, status: 'sent', when: TODAY, expected: input.expected });
    addLog(d, 'Ordered ' + qty(input.qty) + ' ' + m.unit + ' of ' + m.name + ' from ' + sup.name,
      id + ' · ' + naira(input.qty * cost) + ' · for ' + branchName(d, here));
  });
  closeSheet();
  toast('Purchase order ' + id + ' sent to ' + sup.name + '.', 'Record what arrives when the delivery comes in.');
  return true;
}

/* ---------------- suppliers ---------------- */

export interface SupplierInput {
  name: string;
  phone: string;
  terms: string;
  rating: number;
}

function checkSupplier(input: SupplierInput): boolean {
  const s = getState();
  if (!can(s, 'buy')) {
    toast('You do not have permission to manage suppliers.');
    return false;
  }
  if (!input.name.trim()) {
    toast('What is the supplier called?');
    return false;
  }
  if (!input.phone.trim()) {
    toast('Add a phone number for the supplier.');
    return false;
  }
  if (!(input.rating >= 1 && input.rating <= 5)) {
    toast('Rate them from 1 to 5.');
    return false;
  }
  return true;
}

export function createSupplier(input: SupplierInput): boolean {
  if (!checkSupplier(input)) return false;
  const s = getState();
  const name = input.name.trim();
  if (s.suppliers.some((x) => x.name.toLowerCase() === name.toLowerCase())) {
    toast(name + ' is already a supplier.');
    return false;
  }
  update((d) => {
    d.suppliers.push({ id: nextId('s', d.suppliers.map((x) => x.id)), name, phone: input.phone.trim(),
      terms: input.terms.trim() || 'On delivery', owed: 0, rating: Math.round(input.rating) });
    addLog(d, 'Added supplier ' + name, input.terms.trim());
  });
  closeSheet();
  toast(name + ' added.', 'You can raise purchase orders with them now.');
  return true;
}

export function updateSupplier(id: string, input: SupplierInput): boolean {
  if (!checkSupplier(input)) return false;
  const s = getState();
  const name = input.name.trim();
  if (s.suppliers.some((x) => x.id !== id && x.name.toLowerCase() === name.toLowerCase())) {
    toast('Another supplier is already called ' + name + '.');
    return false;
  }
  update((d) => {
    const sup = d.suppliers.find((x) => x.id === id);
    if (!sup) return;
    sup.name = name;
    sup.phone = input.phone.trim();
    sup.terms = input.terms.trim() || 'On delivery';
    sup.rating = Math.round(input.rating);
    addLog(d, 'Updated supplier ' + name);
  });
  closeSheet();
  toast('Saved.');
  return true;
}

/**
 * Pay a supplier what we owe. This is not a new cost — the cost was counted
 * when the goods arrived — so it only reduces the debt and is logged.
 */
export function paySupplier(id: string, amountNaira: string | number, method: PaymentMethod, note: string): boolean {
  const s = getState();
  if (!can(s, 'money')) {
    toast('You do not have permission to pay suppliers.', 'Ask finance or a manager.');
    return false;
  }
  const sup = s.suppliers.find((x) => x.id === id);
  if (!sup) return false;
  const amount = toKobo(amountNaira);
  if (!(amount > 0)) {
    toast('How much are you paying?');
    return false;
  }
  if (amount > sup.owed) {
    toast('That is more than you owe ' + sup.name + '.', 'You owe them ' + naira(sup.owed) + '.');
    return false;
  }
  update((d) => {
    const x = d.suppliers.find((y) => y.id === id)!;
    x.owed -= amount;
    d.supplierPayments.unshift({ id: 'SP-' + (d.supplierPayments.length + 1), supplier: id, amount, method,
      when: TODAY, by: d.actor!, note: note.trim() });
    addLog(d, 'Paid ' + sup.name + ' ' + naira(amount), method + (note.trim() ? ' · ' + note.trim() : ''));
  });
  closeSheet();
  const left = sup.owed - amount;
  toast('Paid ' + sup.name + ' ' + naira(amount) + '.', left > 0 ? naira(left) + ' still owed.' : 'Nothing owed now.');
  return true;
}

/* ---------------- materials ---------------- */

export interface MaterialInput {
  name: string;
  kind: Material['kind'];
  unit: string;
  patterned: boolean;
  reorder: number;
  costNaira: string | number;
  supplier: string;
}

function checkMaterial(input: MaterialInput): boolean {
  const s = getState();
  if (!(can(s, 'issue') || can(s, 'buy'))) {
    toast('You do not have permission to manage stock items.');
    return false;
  }
  if (!input.name.trim()) {
    toast('What is it called?');
    return false;
  }
  if (!input.unit.trim()) {
    toast('How is it counted?', 'For example yards, reels or packs.');
    return false;
  }
  if (!(input.reorder >= 0)) {
    toast('Enter the level at which to order more.');
    return false;
  }
  if (!(toKobo(input.costNaira) > 0)) {
    toast('Enter what one ' + input.unit.trim().replace(/s$/, '') + ' costs.');
    return false;
  }
  if (!s.suppliers.some((x) => x.id === input.supplier)) {
    toast('Choose who you usually buy it from.');
    return false;
  }
  return true;
}

export function createMaterial(input: MaterialInput): boolean {
  if (!checkMaterial(input)) return false;
  const s = getState();
  const name = input.name.trim();
  if (s.materials.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
    toast(name + ' is already in the store list.');
    return false;
  }
  update((d) => {
    d.materials.push({ id: nextId('m', d.materials.map((m) => m.id)), name, kind: input.kind, unit: input.unit.trim(),
      patterned: input.patterned, reorder: input.reorder, cost: toKobo(input.costNaira), supplier: input.supplier,
      stock: Object.fromEntries(d.branches.map((b) => [b.id, 0])) });
    addLog(d, 'Added ' + name + ' to the store list', input.kind + ' · counted in ' + input.unit.trim());
  });
  closeSheet();
  toast(name + ' added.', 'It starts at nothing in every branch — buy some or record a delivery.');
  return true;
}

export function updateMaterial(id: string, input: MaterialInput): boolean {
  if (!checkMaterial(input)) return false;
  const s = getState();
  const name = input.name.trim();
  if (s.materials.some((m) => m.id !== id && m.name.toLowerCase() === name.toLowerCase())) {
    toast('Another item is already called ' + name + '.');
    return false;
  }
  update((d) => {
    const m = d.materials.find((x) => x.id === id);
    if (!m) return;
    m.name = name;
    m.kind = input.kind;
    m.unit = input.unit.trim();
    m.patterned = input.patterned;
    m.reorder = input.reorder;
    m.cost = toKobo(input.costNaira);
    m.supplier = input.supplier;
    addLog(d, 'Updated ' + name, 'reorder at ' + qty(input.reorder) + ' · ' + naira(m.cost) + ' each');
  });
  closeSheet();
  toast('Saved.');
  return true;
}

/* ---------------- ready-to-wear products ---------------- */

export interface ProductInput {
  name: string;
  priceNaira: string | number;
  shape: GarmentShape;
  patterned: boolean;
  variants: { size: string; colour: string }[];
}

const variantKey = (v: { size: string; colour: string }) => v.size.trim().toLowerCase() + '|' + v.colour;

function checkProduct(input: ProductInput): boolean {
  const s = getState();
  if (!can(s, 'approve')) {
    toast('Only a manager can add or change products.');
    return false;
  }
  if (!input.name.trim()) {
    toast('What is the piece called?');
    return false;
  }
  if (!(toKobo(input.priceNaira) > 0)) {
    toast('Enter the selling price.');
    return false;
  }
  if (!input.variants.length) {
    toast('Add at least one size and colour.');
    return false;
  }
  if (input.variants.some((v) => !v.size.trim() || !v.colour)) {
    toast('Every row needs a size and a colour.');
    return false;
  }
  if (new Set(input.variants.map(variantKey)).size !== input.variants.length) {
    toast('The same size and colour is listed twice.');
    return false;
  }
  return true;
}

export function createProduct(input: ProductInput): boolean {
  if (!checkProduct(input)) return false;
  const name = input.name.trim();
  let sku = '';
  update((d) => {
    const n = d.products.reduce((max, p) => Math.max(max, Number(p.sku.replace(/\D/g, '')) || 0), 0) + 1;
    sku = 'RTW-' + String(n).padStart(3, '0');
    const zero = () => Object.fromEntries(d.branches.map((b) => [b.id, 0]));
    const product: Product = {
      id: nextId('p', d.products.map((p) => p.id)), sku, name, price: toKobo(input.priceNaira), shape: input.shape,
      patterned: input.patterned, sold: 0,
      variants: input.variants.map((v) => ({ size: v.size.trim(), colour: v.colour, stock: zero() })),
    };
    d.products.push(product);
    addLog(d, 'Added ' + name + ' to the rail', sku + ' · ' + plural(product.variants.length, 'size/colour', 'sizes/colours'));
  });
  closeSheet();
  toast(name + ' added as ' + sku + '.', 'It has no stock yet — restock it when pieces come in.');
  return true;
}

export function updateProduct(id: string, input: ProductInput): boolean {
  if (!checkProduct(input)) return false;
  const s = getState();
  const p = s.products.find((x) => x.id === id);
  if (!p) return false;
  const kept = new Set(input.variants.map(variantKey));
  const dropped = p.variants.filter((v) => !kept.has(variantKey(v)) && Object.values(v.stock).some((n) => n > 0));
  if (dropped.length) {
    toast('There is still stock of ' + dropped.map((v) => v.size + ' · ' + v.colour).join(', ') + '.',
      'Sell or move it before removing that size.');
    return false;
  }
  const name = input.name.trim();
  update((d) => {
    const x = d.products.find((y) => y.id === id);
    if (!x) return;
    const zero = () => Object.fromEntries(d.branches.map((b) => [b.id, 0]));
    const old = new Map(x.variants.map((v) => [variantKey(v), v.stock]));
    x.name = name;
    x.price = toKobo(input.priceNaira);
    x.shape = input.shape;
    x.patterned = input.patterned;
    x.variants = input.variants.map((v) => ({ size: v.size.trim(), colour: v.colour, stock: old.get(variantKey(v)) ?? zero() }));
    addLog(d, 'Updated ' + name, x.sku + ' · ' + naira(x.price));
  });
  closeSheet();
  toast('Saved.');
  return true;
}

export function restockProduct(productId: string, rows: { size: string; colour: string; qty: number }[]): boolean {
  const s = getState();
  if (!can(s, 'sell')) {
    toast('You do not have permission to restock the rail.');
    return false;
  }
  const p = s.products.find((x) => x.id === productId);
  if (!p) return false;
  if (rows.some((r) => !Number.isInteger(r.qty) || r.qty < 0)) {
    toast('Enter whole pieces only.');
    return false;
  }
  const adding = rows.filter((r) => r.qty > 0);
  if (!adding.length) {
    toast('How many pieces came in?');
    return false;
  }
  const here = myBranch(s);
  const total = adding.reduce((n, r) => n + r.qty, 0);
  update((d) => {
    const x = d.products.find((y) => y.id === productId)!;
    adding.forEach((r) => {
      const v = x.variants.find((y) => y.size === r.size && y.colour === r.colour);
      if (v) v.stock[here] = (v.stock[here] ?? 0) + r.qty;
    });
    addLog(d, 'Restocked ' + p.name + ' (' + plural(total, 'piece') + ')',
      adding.map((r) => r.qty + ' × ' + r.size + ' ' + r.colour).join(', ') + ' · at ' + branchName(d, here));
  });
  closeSheet();
  toast(plural(total, 'piece') + ' of ' + p.name + ' added to the rail.');
  return true;
}

