/**
 * Demo data: a year of trading across three branches, so every screen has
 * something in it on first load. Deterministic — same data every time.
 *
 * The RNG is consumed in a fixed order; reordering calls changes the data.
 */
import type {
  Attendance,
  Branch,
  BusinessData,
  Channel,
  Customer,
  Enquiry,
  Expense,
  FabricIssue,
  Job,
  Material,
  Order,
  Payment,
  PaymentMethod,
  Sale,
  Size,
  Stage,
  Staff,
  StockCount,
  Style,
  WasteCategory,
} from '@/types/domain';
import { between, createRng, pick } from '@/lib/rng';
import { TODAY, iso, isoFromToday, today } from '@/lib/dates';

const FIRST = ['Adebayo', 'Folake', 'Emeka', 'Aisha', 'Chinelo', 'Tunde', 'Ngozi', 'Yusuf', 'Bisi', 'Kemi',
  'Ifeanyi', 'Zainab', 'Segun', 'Amara', 'Musa', 'Titi', 'Obi', 'Halima', 'Dele', 'Uche', 'Funke', 'Sani',
  'Chidi', 'Rukayat', 'Bode', 'Nneka', 'Ibrahim', 'Yewande', 'Kelechi', 'Simi'];
const LAST = ['Ogundimu', 'Ade', 'Obi', 'Bello', 'Okafor', 'Lawal', 'Bassey', 'Ibrahim', 'Nwosu', 'Eze',
  'Adeleke', 'Balogun', 'Danjuma', 'Okonkwo', 'Yusuf', 'Afolabi', 'Onyeka', 'Suleiman', 'Adeyemi', 'Chukwu'];
const CHANNELS: Channel[] = ['Instagram', 'WhatsApp', 'Snapchat', 'Website', 'Walk-in', 'Phone'];
const SIZES: Size[] = ['S', 'M', 'L', 'XL', '2XL'];
const SEED_STAGES: Stage[] = ['measurement', 'fabric', 'cutting', 'sewing', 'finishing', 'qc', 'ready', 'delivery'];

const pad2 = (n: number) => String(n).padStart(2, '0');

const BRANCHES: Branch[] = [
  { id: 'IK', name: 'Ikeja', address: '14 Awolowo Way', opens: '08:00', lat: null, lng: null },
  { id: 'LEK', name: 'Lekki', address: '3 Admiralty Way', opens: '09:00', lat: null, lng: null },
  { id: 'ABJ', name: 'Abuja', address: '22 Aminu Kano Cr', opens: '09:00', lat: null, lng: null },
];

const STAFF: Staff[] = [
  { id: 'tunde', name: 'Tunde Bello', role: 'owner', roleName: 'Owner', branch: 'IK', dept: 'Management', pin: '440271', badge: '100441', salary: 0, hired: '2019-03-01' },
  { id: 'ngozi', name: 'Ngozi Bassey', role: 'manager', roleName: 'Branch Manager', branch: 'IK', dept: 'Management', pin: '605118', badge: '100605', salary: 35000000, hired: '2021-06-14' },
  { id: 'bisi', name: 'Bisi Lawal', role: 'store', roleName: 'Store Keeper', branch: 'IK', dept: 'Store', pin: '517390', badge: '100517', salary: 18000000, hired: '2022-01-10' },
  { id: 'amaka', name: 'Amaka Obi', role: 'tailor', roleName: 'Tailor', branch: 'IK', dept: 'Production', pin: '482913', badge: '100482', salary: 16000000, hired: '2022-09-05' },
  { id: 'chidi', name: 'Chidi Nwosu', role: 'tailor', roleName: 'Tailor', branch: 'IK', dept: 'Production', pin: '739142', badge: '100739', salary: 15000000, hired: '2024-02-19' },
  { id: 'kelly', name: 'Kelechi Eze', role: 'tailor', roleName: 'Tailor', branch: 'IK', dept: 'Production', pin: '221876', badge: '100221', salary: 15500000, hired: '2023-05-11' },
  { id: 'sade', name: 'Sade Ogun', role: 'sales', roleName: 'Sales', branch: 'IK', dept: 'Sales', pin: '318264', badge: '100318', salary: 14000000, hired: '2023-07-03' },
  { id: 'grace', name: 'Grace Umeh', role: 'ops', roleName: 'Operations Manager', branch: 'IK', dept: 'Management', pin: '770312', badge: '100770', salary: 38000000, hired: '2020-08-17' },
  { id: 'peter', name: 'Peter Adigun', role: 'hr', roleName: 'HR & Admin', branch: 'IK', dept: 'Admin', pin: '451209', badge: '100451', salary: 24000000, hired: '2022-04-05' },
  { id: 'joy', name: 'Joy Nwankwo', role: 'finance', roleName: 'Finance', branch: 'IK', dept: 'Finance', pin: '836514', badge: '100836', salary: 28000000, hired: '2021-11-02' },
  { id: 'musa', name: 'Musa Danjuma', role: 'prod', roleName: 'Production Manager', branch: 'IK', dept: 'Production', pin: '209473', badge: '100209', salary: 26000000, hired: '2022-07-19' },
  { id: 'femi', name: 'Femi Adeleke', role: 'manager', roleName: 'Branch Manager', branch: 'LEK', dept: 'Management', pin: '927405', badge: '100927', salary: 32000000, hired: '2023-11-20' },
  { id: 'halima', name: 'Halima Sani', role: 'tailor', roleName: 'Tailor', branch: 'LEK', dept: 'Production', pin: '664210', badge: '100664', salary: 15000000, hired: '2024-06-02' },
  { id: 'uche', name: 'Uche Okafor', role: 'sales', roleName: 'Sales', branch: 'LEK', dept: 'Sales', pin: '883017', badge: '100883', salary: 13500000, hired: '2025-01-15' },
  { id: 'zainab', name: 'Zainab Musa', role: 'manager', roleName: 'Branch Manager', branch: 'ABJ', dept: 'Management', pin: '145902', badge: '100145', salary: 30000000, hired: '2024-09-09' },
  { id: 'bode', name: 'Bode Afolabi', role: 'tailor', roleName: 'Tailor', branch: 'ABJ', dept: 'Production', pin: '572431', badge: '100572', salary: 14500000, hired: '2025-03-24' },
];

const STYLES: Style[] = [
  { id: 'agbada', name: 'Agbada', price: 15000000, tol: 10, days: 14, specs: { S: 6, M: 7, L: 7.5, XL: 8, '2XL': 9 } },
  { id: 'kaftan', name: 'Kaftan', price: 8500000, tol: 12, days: 10, specs: { S: 4, M: 4.5, L: 5, XL: 5.5, '2XL': 6 } },
  { id: 'gown', name: 'Ball Gown', price: 22000000, tol: 15, days: 21, specs: { S: 5, M: 5.5, L: 6, XL: 6.5, '2XL': 7 } },
  { id: 'iro', name: 'Iro & Buba', price: 11000000, tol: 12, days: 12, specs: { S: 5, M: 5.5, L: 6, XL: 6.5, '2XL': 7 } },
  { id: 'suit', name: 'Two-piece Suit', price: 18000000, tol: 8, days: 16, specs: { S: 3.5, M: 4, L: 4.5, XL: 5, '2XL': 5.5 } },
  { id: 'bubu', name: 'Boubou', price: 9500000, tol: 14, days: 9, specs: { S: 5, M: 5.5, L: 6, XL: 6.5, '2XL': 7 } },
];

function materials(): Material[] {
  return [
    { id: 'm1', name: 'Ankara Blue Wax', kind: 'Fabric', unit: 'yards', patterned: true, reorder: 10, cost: 250000, supplier: 's1', stock: { IK: 42, LEK: 18, ABJ: 12 } },
    { id: 'm2', name: 'Gold Lace', kind: 'Fabric', unit: 'yards', patterned: true, reorder: 8, cost: 820000, supplier: 's2', stock: { IK: 23.5, LEK: 9, ABJ: 6 } },
    { id: 'm3', name: 'Plain Cotton', kind: 'Fabric', unit: 'yards', patterned: false, reorder: 15, cost: 140000, supplier: 's1', stock: { IK: 64, LEK: 31, ABJ: 22 } },
    { id: 'm4', name: 'Lining White', kind: 'Fabric', unit: 'yards', patterned: false, reorder: 14, cost: 90000, supplier: 's1', stock: { IK: 7, LEK: 19, ABJ: 11 } },
    { id: 'm5', name: 'Thread Black', kind: 'Trim', unit: 'reels', patterned: false, reorder: 25, cost: 12000, supplier: 's3', stock: { IK: 64, LEK: 28, ABJ: 19 } },
    { id: 'm6', name: 'Zips 24in', kind: 'Trim', unit: 'pieces', patterned: false, reorder: 30, cost: 35000, supplier: 's3', stock: { IK: 14, LEK: 41, ABJ: 26 } },
    { id: 'm7', name: 'Crystal Stones', kind: 'Trim', unit: 'packs', patterned: false, reorder: 6, cost: 180000, supplier: 's2', stock: { IK: 17, LEK: 4, ABJ: 8 } },
    { id: 'm8', name: 'Aso-oke Maroon', kind: 'Fabric', unit: 'yards', patterned: true, reorder: 8, cost: 640000, supplier: 's4', stock: { IK: 15, LEK: 11, ABJ: 3 } },
    { id: 'm9', name: 'Silk Charmeuse', kind: 'Fabric', unit: 'yards', patterned: false, reorder: 10, cost: 520000, supplier: 's2', stock: { IK: 26, LEK: 13, ABJ: 9 } },
    { id: 'm10', name: 'Buttons Pearl', kind: 'Trim', unit: 'packs', patterned: false, reorder: 10, cost: 28000, supplier: 's3', stock: { IK: 33, LEK: 16, ABJ: 12 } },
  ];
}

export function createSeedData(): BusinessData {
  const r = createRng(20260926);
  const branches = structuredClone(BRANCHES);
  const staff = structuredClone(STAFF);
  const styles = structuredClone(STYLES);
  const mats = materials();
  const fabrics = mats.filter((m) => m.kind === 'Fabric');
  const tailorsAt = (b: string) => staff.filter((s) => s.role === 'tailor' && s.branch === b);

  /* ---- customers ---- */
  const customers: Customer[] = [];
  for (let i = 0; i < 64; i++) {
    const name = pick(r, FIRST) + ' ' + pick(r, LAST);
    const b = pick(r, ['IK', 'IK', 'IK', 'LEK', 'LEK', 'ABJ']);
    const daysAgo = between(r, 5, 700);
    const bd = new Date(1975 + between(r, 0, 28), between(r, 0, 11), between(r, 1, 28));
    customers.push({
      id: 'c' + (i + 1),
      name,
      phone: '080' + between(r, 10000000, 99999999),
      channel: pick(r, CHANNELS),
      birthday: iso(bd),
      branch: b,
      since: isoFromToday(-daysAgo),
      tags: r() > 0.78 ? [pick(r, ['VIP', 'Bridal', 'Corporate', 'Quiet'])] : [],
      sizes:
        r() > 0.5
          ? { Chest: between(r, 36, 50), Shoulder: between(r, 16, 22), 'Sleeve length': between(r, 22, 27), Length: between(r, 50, 62), Neck: between(r, 15, 19) }
          : { Bust: between(r, 32, 44), Waist: between(r, 26, 40), Hip: between(r, 34, 48), 'Dress length': between(r, 48, 60), Shoulder: between(r, 14, 18) },
      notes:
        r() > 0.7
          ? pick(r, ['Prefers heavy brocade.', 'Never ready on Fridays — travels.', 'Always wants extra length.',
              'Pays on delivery, never before.', 'Sister refers a lot of people.'])
          : '',
    });
  }
  /* two birthdays land today so the dashboard has something to show */
  customers[3].birthday = iso(new Date(1988, today.getMonth(), today.getDate()));
  customers[11].birthday = iso(new Date(1994, today.getMonth(), today.getDate()));
  customers[0].name = 'Chief Adebayo Ogundimu';
  customers[0].tags = ['VIP'];
  customers[0].branch = 'IK';

  /* ---- orders, jobs, payments across a year ---- */
  const orders: Order[] = [];
  const jobs: Job[] = [];
  const payments: Payment[] = [];
  const sales: Sale[] = [];
  let onum = 1000;
  let jnum = 200;
  for (let i = 0; i < 138; i++) {
    const daysAgo = Math.floor(Math.pow(r(), 1.5) * 330);
    const c = pick(r, customers);
    const st = pick(r, styles);
    const size = pick(r, SIZES);
    const b = c.branch;
    const created = isoFromToday(-daysAgo);
    const due = isoFromToday(-daysAgo + st.days);
    const total = st.price + between(r, -2, 6) * 250000;
    const done = daysAgo > st.days + 2;
    const paidAll = done || r() > 0.45;
    const paid = paidAll ? total : Math.round((total * pick(r, [0.3, 0.5, 0.5, 0.6])) / 100000) * 100000;
    const id = b + '/' + ++onum;
    orders.push({ id, customer: c.id, style: st.id, size, material: pick(r, fabrics).id,
      branch: b, total, paid, channel: c.channel, due, created, status: done ? 'delivered' : 'making' });
    payments.push({ order: id, amount: paid, when: created, method: pick(r, ['Cash', 'Transfer', 'Card', 'Online'] as PaymentMethod[]) });
    if (!paidAll && r() > 0.6) payments.push({ order: id, amount: 0, when: created, method: 'Transfer' });
    const stage = done ? 'delivery' : SEED_STAGES[Math.min(6, Math.floor(r() * 7))];
    jobs.push({ id: b + '/J/' + ++jnum, order: id, stage, assigned: pick(r, tailorsAt(b)).id,
      due, reworks: r() > 0.85 ? between(r, 1, 3) : 0 });
  }
  /* a handful deliberately running late, today */
  jobs.filter((j) => j.stage !== 'delivery').slice(0, 6).forEach((j, i) => {
    j.due = isoFromToday(-(i + 1) * 2);
  });

  /* a normal morning's trading, so the dashboard is never empty on open */
  ['IK', 'IK', 'IK', 'LEK', 'ABJ'].forEach((b, k) => {
    const c = customers.filter((x) => x.branch === b)[k] ?? customers[k];
    const st = styles[k % styles.length];
    const id = b + '/' + ++onum;
    const total = st.price;
    const dep = Math.round(total * 0.5);
    orders.unshift({ id, customer: c.id, style: st.id, size: pick(r, ['M', 'L', 'XL'] as Size[]),
      material: 'm1', branch: b, total, paid: dep, channel: pick(r, CHANNELS),
      due: isoFromToday(st.days), created: TODAY, status: 'making' });
    payments.push({ order: id, amount: dep, when: TODAY, method: pick(r, ['Cash', 'Transfer', 'Card'] as PaymentMethod[]) });
    jobs.unshift({ id: b + '/J/' + ++jnum, order: id, stage: 'measurement',
      assigned: pick(r, tailorsAt(b)).id, due: isoFromToday(st.days), reworks: 0 });
  });
  /* a few balances settled this morning too */
  orders.filter((o) => o.paid < o.total).slice(0, 4).forEach((o) => {
    const rest = o.total - o.paid;
    o.paid = o.total;
    payments.push({ order: o.id, amount: rest, when: TODAY, method: 'Transfer' });
  });

  /* shop sales over the last 60 days */
  for (let i = 0; i < 90; i++) {
    const daysAgo = between(r, 0, 59);
    sales.push({
      what: pick(r, ['Ankara Shift Dress', 'Linen Shirt', 'Silk Head Wrap', 'Emerald Wrap Dress', 'Evening Gown']) +
        ' · ' + pick(r, ['S', 'M', 'L']) + ' · ' + pick(r, ['Blue', 'White', 'Gold', 'Emerald', 'Wine']),
      amount: pick(r, [4500000, 2800000, 1200000, 6200000, 9800000]),
      when: isoFromToday(-daysAgo),
      branch: pick(r, ['IK', 'IK', 'LEK', 'ABJ']),
      by: pick(r, staff.filter((s) => s.role === 'sales' || s.role === 'manager')).id,
      at: pad2(between(r, 9, 18)) + ':' + pad2(between(r, 0, 59)),
    });
  }

  /* ---- fabric issues, some closed with losses ---- */
  const issues: FabricIssue[] = [];
  let inum = 0;
  jobs.filter((j) => j.stage !== 'measurement').slice(0, 54).forEach((j) => {
    const o = orders.find((x) => x.id === j.order);
    if (!o) return;
    const st = styles.find((s) => s.id === o.style)!;
    const expected = st.specs[o.size];
    const over = r() > 0.78;
    const issued = over ? expected + between(r, 1, 3) : expected;
    const closed = j.stage === 'delivery' || r() > 0.5;
    const rec: FabricIssue = { id: 'is' + ++inum, job: j.id, material: o.material, branch: o.branch, expected,
      requested: issued, issued, to: j.assigned!, by: 'bisi', status: 'issued', returned: closed };
    if (closed) {
      const waste = Math.round(r() * 8) / 10;
      const gap = r() > 0.76 ? Math.round(r() * 18) / 10 : 0;
      const back = Math.max(0, Math.round((issued - expected - waste - gap) * 10) / 10);
      rec.result = {
        used: Math.round((issued - back - waste - gap) * 10) / 10,
        back,
        waste,
        gap,
        reason: gap ? pick(r, ['Cut wrongly the first time', 'Fabric caught in the machine', 'Cannot remember',
          'Gave offcuts to an apprentice']) : '',
        cat: pick(r, ['Normal offcuts', 'Machine damage', 'Cutting mistake', 'Fabric fault'] as WasteCategory[]),
      };
    }
    issues.push(rec);
  });
  /* one still waiting for approval so the queue is never empty */
  const liveJob = jobs.find((j) => j.stage !== 'delivery');
  if (liveJob) {
    const o = orders.find((x) => x.id === liveJob.order)!;
    const st = styles.find((s) => s.id === o.style)!;
    issues.push({ id: 'is' + ++inum, job: liveJob.id, material: o.material, branch: o.branch,
      expected: st.specs[o.size], requested: st.specs[o.size] + 3, issued: null, to: liveJob.assigned!,
      by: liveJob.assigned!, status: 'needs_approval', returned: false,
      reason: 'Fabric is striped, the pattern has to line up at the seams' });
  }

  /* ---- attendance for the last 30 days ---- */
  const attendance: Attendance[] = [];
  for (let day = 0; day < 30; day++) {
    const date = isoFromToday(-day);
    if (new Date(date).getDay() === 0) continue;
    staff.forEach((s) => {
      if (s.role === 'owner' && r() > 0.5) return;
      if (r() > 0.93) return;
      const late = r() > 0.82;
      const hh = late ? between(r, 8, 9) : between(r, 7, 8);
      const mm = between(r, 0, 59);
      attendance.push({
        staff: s.id,
        date,
        in: pad2(hh) + ':' + pad2(mm),
        out: day === 0 ? null : pad2(between(r, 17, 19)) + ':' + pad2(between(r, 0, 59)),
        late,
        how: pick(r, ['badge at the shop', 'badge at the shop', 'badge at the shop',
          'phone location, 18 m away', 'wall poster, 24 m away', 'typed badge number']),
      });
    });
  }

  /* ---- expenses ---- */
  const expenses: Expense[] = [];
  const EXP: [string, string, number][] = [
    ['Generator diesel', 'Power', 4500000], ['Shop rent (month)', 'Rent', 25000000],
    ['Delivery bike fuel', 'Transport', 1200000], ['Machine servicing', 'Repairs', 3200000],
    ['Packaging bags', 'Packaging', 1800000], ['Staff lunch', 'Staff welfare', 2400000],
    ['Instagram ads', 'Marketing', 7500000], ['Electricity bill', 'Power', 6300000],
  ];
  for (let i = 0; i < 46; i++) {
    const e = pick(r, EXP);
    expenses.push({ id: 'e' + i, what: e[0], cat: e[1], amount: Math.round((e[2] * (0.7 + r() * 0.6)) / 10000) * 10000,
      branch: pick(r, ['IK', 'IK', 'LEK', 'ABJ']), when: isoFromToday(-between(r, 0, 120)) });
  }

  /* ---- enquiries ---- */
  const enquiries: Enquiry[] = [];
  for (let i = 0; i < 34; i++) {
    const c = pick(r, customers);
    const st = pick(r, styles);
    const stage = pick(r, ['new', 'new', 'contacted', 'contacted', 'interested', 'awaiting_payment', 'converted', 'lost'] as const);
    const ago = between(r, 0, 40);
    enquiries.push({
      id: 'E-' + (1400 + i), customer: c.id, name: c.name, phone: c.phone,
      source: pick(r, CHANNELS), style: st.id, value: st.price + between(r, -2, 5) * 250000,
      stage, owner: pick(r, staff.filter((x) => x.role === 'sales')).id,
      lastContact: isoFromToday(-ago), nextFollowUp: isoFromToday(between(r, -3, 9)),
      branch: c.branch,
      note: pick(r, ['Asked for the price of an agbada set.', 'Wants it for a wedding in December.',
        'Sent measurements already.', 'Says she will pay at the weekend.',
        'Asked if we deliver to Port Harcourt.', 'Wants to see fabric options first.']),
    });
  }

  /* System figures are whatever the system currently believes, so accepting
     the count genuinely moves the numbers. */
  const at = (id: string, b: string) => mats.find((m) => m.id === id)!.stock[b];
  const stockCounts: StockCount[] = [
    { id: 'SC-09', branch: 'IK', when: isoFromToday(-2), by: 'bisi', status: 'review',
      lines: [
        { material: 'm1', system: at('m1', 'IK'), counted: at('m1', 'IK') },
        { material: 'm2', system: at('m2', 'IK'), counted: at('m2', 'IK') - 1.5 },
        { material: 'm3', system: at('m3', 'IK'), counted: at('m3', 'IK') },
        { material: 'm4', system: at('m4', 'IK'), counted: at('m4', 'IK') - 2 },
      ],
      note: 'Counted before the Abuja transfer went out.' },
    { id: 'SC-08', branch: 'LEK', when: isoFromToday(-16), by: 'femi', status: 'closed',
      lines: [
        { material: 'm1', system: at('m1', 'LEK'), counted: at('m1', 'LEK') },
        { material: 'm6', system: at('m6', 'LEK'), counted: at('m6', 'LEK') },
      ],
      note: '' },
  ];

  return {
    branches, staff, customers, styles, materials: mats, orders, jobs, payments, sales, issues, attendance, expenses, enquiries, stockCounts,

    products: [
      { id: 'p1', sku: 'RTW-001', name: 'Ankara Shift Dress', price: 4500000, shape: 'dress', patterned: true, sold: 271,
        variants: [{ size: 'S', colour: 'Blue', stock: { IK: 3, LEK: 2, ABJ: 1 } }, { size: 'M', colour: 'Blue', stock: { IK: 5, LEK: 1, ABJ: 2 } },
          { size: 'L', colour: 'Rust', stock: { IK: 0, LEK: 4, ABJ: 0 } }] },
      { id: 'p2', sku: 'RTW-002', name: 'Linen Shirt', price: 2800000, shape: 'shirt', patterned: false, sold: 188,
        variants: [{ size: 'M', colour: 'White', stock: { IK: 7, LEK: 3, ABJ: 4 } }, { size: 'L', colour: 'Cream', stock: { IK: 2, LEK: 6, ABJ: 1 } }] },
      { id: 'p3', sku: 'RTW-003', name: 'Silk Head Wrap', price: 1200000, shape: 'wrap', patterned: true, sold: 402,
        variants: [{ size: 'One', colour: 'Gold', stock: { IK: 14, LEK: 8, ABJ: 6 } }] },
      { id: 'p4', sku: 'RTW-004', name: 'Emerald Wrap Dress', price: 6200000, shape: 'dress', patterned: false, sold: 97,
        variants: [{ size: 'M', colour: 'Emerald', stock: { IK: 2, LEK: 0, ABJ: 1 } }, { size: 'L', colour: 'Emerald', stock: { IK: 1, LEK: 3, ABJ: 2 } }] },
      { id: 'p5', sku: 'RTW-005', name: 'Evening Gown', price: 9800000, shape: 'dress', patterned: false, sold: 54,
        variants: [{ size: 'M', colour: 'Wine', stock: { IK: 1, LEK: 1, ABJ: 0 } }, { size: 'L', colour: 'Black', stock: { IK: 0, LEK: 2, ABJ: 1 } }] },
      { id: 'p6', sku: 'RTW-006', name: 'Aso-oke Cap', price: 1800000, shape: 'wrap', patterned: true, sold: 143,
        variants: [{ size: 'One', colour: 'Rust', stock: { IK: 9, LEK: 5, ABJ: 7 } }] },
    ],

    transfers: [
      { id: 'TR/07', from: 'LEK', to: 'IK', material: 'm4', qty: 6, status: 'requested', by: 'ngozi', note: 'Lining running out in Ikeja' },
      { id: 'TR/06', from: 'IK', to: 'ABJ', material: 'm1', qty: 10, status: 'sent', by: 'bisi', note: 'Abuja opening stock' },
      { id: 'TR/05', from: 'IK', to: 'LEK', material: 'm7', qty: 4, status: 'received', by: 'bisi', received: 4, note: '' },
    ],

    suppliers: [
      { id: 's1', name: 'Balogun Textiles', phone: '0802 444 1111', terms: '50% upfront', owed: 4200000, rating: 4 },
      { id: 's2', name: 'Lagos Lace House', phone: '0806 777 8888', terms: 'On delivery', owed: 0, rating: 5 },
      { id: 's3', name: 'Ade Haberdashery', phone: '0811 222 3333', terms: '30 days', owed: 850000, rating: 3 },
      { id: 's4', name: 'Ibadan Aso-oke Weavers', phone: '0803 909 4545', terms: 'Cash', owed: 2600000, rating: 5 },
    ],

    pos: [
      { id: 'IK/P/22', supplier: 's1', branch: 'IK', material: 'm4', ordered: 20, received: 0, cost: 90000, status: 'sent', when: isoFromToday(-4), expected: isoFromToday(2) },
      { id: 'IK/P/21', supplier: 's2', branch: 'IK', material: 'm2', ordered: 15, received: 15, cost: 820000, status: 'received', when: isoFromToday(-12), expected: isoFromToday(-8) },
      { id: 'IK/P/20', supplier: 's4', branch: 'IK', material: 'm8', ordered: 25, received: 12, cost: 640000, status: 'partly', when: isoFromToday(-9), expected: isoFromToday(-2) },
      { id: 'LEK/P/08', supplier: 's3', branch: 'LEK', material: 'm6', ordered: 60, received: 60, cost: 35000, status: 'received', when: isoFromToday(-20), expected: isoFromToday(-15) },
    ],

    supplierPayments: [],

    campaigns: [
      { id: 'cm1', name: 'Birthday wishes', channel: 'WhatsApp', segment: 'Birthdays today', status: 'automatic', sent: 284, replies: 96 },
      { id: 'cm2', name: 'Harmattan collection', channel: 'Instagram + Email', segment: 'Everyone', status: 'draft', sent: 0, replies: 0 },
      { id: 'cm3', name: 'We miss you', channel: 'SMS', segment: 'No order in 6 months', status: 'sent', sent: 58, replies: 7 },
      { id: 'cm4', name: 'Owambe season', channel: 'WhatsApp', segment: 'Spent over ₦100,000', status: 'sent', sent: 121, replies: 34 },
    ],

    automations: [
      { id: 'a1', trigger: 'Payment received', msg: 'Thank you — we have received your payment.', on: true },
      { id: 'a2', trigger: 'Order moved to Ready', msg: 'Your outfit is ready for collection.', on: true },
      { id: 'a3', trigger: 'Delivered', msg: 'Thank you for choosing us.', on: true },
      { id: 'a4', trigger: 'No order in 6 months', msg: 'We miss you — here is 10% off.', on: false },
      { id: 'a5', trigger: 'Birthday', msg: 'Happy birthday from all of us.', on: true },
      { id: 'a6', trigger: 'Balance still owing after 7 days', msg: 'A gentle reminder about your balance.', on: false },
    ],

    influencers: [
      { id: 'in1', name: 'Tiwa Balogun', handle: '@tiwastyles', tier: 'Macro', followers: '184k', gifted: 2, giftCost: 29000000,
        fee: 25000000, paid: 25000000, promised: 3,
        posts: [{ platform: 'Instagram', when: isoFromToday(-5), reach: 41200 }, { platform: 'Instagram', when: isoFromToday(-19), reach: 38700 }],
        code: 'TIWA10', sales: 11, salesValue: 94000000, status: 'running' },
      { id: 'in2', name: 'Kunle Eze', handle: '@kunlewears', tier: 'Micro', followers: '28k', gifted: 1, giftCost: 8500000,
        fee: 0, paid: 0, promised: 2, posts: [], code: 'KUNLE10', sales: 0, salesValue: 0, status: 'agreed' },
      { id: 'in3', name: 'Dami Okoro', handle: '@damistyle', tier: 'Micro', followers: '46k', gifted: 1, giftCost: 15000000,
        fee: 6000000, paid: 6000000, promised: 2, posts: [{ platform: 'TikTok', when: isoFromToday(-11), reach: 88400 }],
        code: 'DAMI10', sales: 6, salesValue: 41000000, status: 'running' },
    ],

    chats: [
      { id: 'ch1', customer: 'c2', channel: 'WhatsApp', assigned: 'sade', status: 'open', messages: [
        { from: 'them', text: 'Good afternoon. Is my gown ready?', at: '10:12' },
        { from: 'us', text: 'Good afternoon ma. It is at cutting today, still on track for Friday.', at: '10:20' },
        { from: 'them', text: 'Thank you. Can we add beading to the sleeves?', at: '10:41' }] },
      { id: 'ch2', customer: 'c4', channel: 'Instagram', assigned: null, status: 'open', messages: [
        { from: 'them', text: 'Hi! Do you ship to Abuja?', at: '09:05' }] },
      { id: 'ch3', customer: 'c7', channel: 'WhatsApp', assigned: null, status: 'open', messages: [
        { from: 'them', text: 'Please how much for agbada for my son wedding?', at: '08:32' }] },
      { id: 'ch4', customer: 'c12', channel: 'Website', assigned: 'uche', status: 'open', messages: [
        { from: 'them', text: 'I sent the transfer yesterday, did it come in?', at: '11:48' },
        { from: 'us', text: 'Let me check and come back to you right away.', at: '11:55' }] },
    ],

    leave: [
      { id: 'L-21', staff: 'amaka', kind: 'Annual leave', from: isoFromToday(6), to: isoFromToday(12), days: 5,
        reason: 'Family wedding in Ibadan', status: 'requested', decidedBy: null },
      { id: 'L-20', staff: 'chidi', kind: 'Sick leave', from: isoFromToday(-2), to: isoFromToday(-1), days: 2,
        reason: 'Malaria, has a note from the clinic', status: 'approved', decidedBy: 'peter' },
      { id: 'L-19', staff: 'uche', kind: 'Emergency leave', from: isoFromToday(1), to: isoFromToday(1), days: 1,
        reason: 'Needs to travel for a family matter', status: 'requested', decidedBy: null },
      { id: 'L-18', staff: 'sade', kind: 'Annual leave', from: isoFromToday(-30), to: isoFromToday(-24), days: 5,
        reason: 'Rest', status: 'approved', decidedBy: 'peter' },
    ],
    leaveAllowance: 20,

    expensesPending: [
      { id: 'X-44', what: 'Emergency generator repair', cat: 'Repairs', amount: 8500000, branch: 'IK', by: 'bisi', when: isoFromToday(-1) },
      { id: 'X-45', what: 'Fabric delivery van hire', cat: 'Transport', amount: 3200000, branch: 'LEK', by: 'femi', when: TODAY },
    ],

    payroll: {
      month: today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
      status: 'draft', preparedBy: null, approvedBy: null, lines: [],
    },
    alerts: [],
    log: [],
    counter: { order: onum, job: jnum, issue: inum, transfer: 8, po: 23 },
  };
}
