/**
 * Minimal QR encoder: byte mode, error-correction level M, versions 1–10.
 * Enough for a badge or poster payload. Returns a boolean module matrix.
 */

type Cell = boolean | null;
type Matrix = Cell[][];

/* --- Galois field 256 ---------------------------------------------------- */
const EXP = new Array<number>(512);
const LOG = new Array<number>(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}
const mul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

function rsGenerator(n: number): number[] {
  let poly = [1];
  for (let i = 0; i < n; i++) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= mul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data: number[], ecLen: number): number[] {
  const gen = rsGenerator(ecLen);
  const res = new Array<number>(ecLen).fill(0);
  for (const d of data) {
    const factor = d ^ res[0];
    res.shift();
    res.push(0);
    for (let i = 0; i < gen.length - 1; i++) res[i] ^= mul(gen[i + 1], factor);
  }
  return res;
}

/* --- per-version tables for EC level M ----------------------------------- */
/** [totalCodewords, ecPerBlock, group1Blocks, group1Data, group2Blocks, group2Data] */
const VER: Record<number, [number, number, number, number, number, number]> = {
  1: [26, 10, 1, 16, 0, 0],
  2: [44, 16, 1, 28, 0, 0],
  3: [70, 26, 1, 44, 0, 0],
  4: [100, 18, 2, 32, 0, 0],
  5: [134, 24, 2, 43, 0, 0],
  6: [172, 16, 4, 27, 0, 0],
  7: [196, 18, 4, 31, 0, 0],
  8: [242, 22, 2, 38, 2, 39],
  9: [292, 22, 3, 36, 2, 37],
  10: [346, 26, 4, 43, 1, 44],
};
const ALIGN: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

const capacity = (v: number) => VER[v][2] * VER[v][3] + VER[v][4] * VER[v][5];

function toBytes(str: string): number[] {
  return Array.from(new TextEncoder().encode(str));
}

function pickVersion(len: number): number {
  for (let v = 1; v <= 10; v++) {
    const bits = 4 + (v < 10 ? 8 : 16) + len * 8;
    if (Math.ceil(bits / 8) <= capacity(v)) return v;
  }
  throw new Error('QR payload too long for this encoder');
}

function buildData(bytes: number[], v: number): number[] {
  const bits: number[] = [];
  const push = (val: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };
  push(4, 4); // byte mode
  push(bytes.length, v < 10 ? 8 : 16);
  bytes.forEach((b) => push(b, 8));
  const cap = capacity(v) * 8;
  for (let i = 0; i < 4 && bits.length < cap; i++) bits.push(0); // terminator
  while (bits.length % 8) bits.push(0);
  const words: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    words.push(b);
  }
  const pad = [0xec, 0x11];
  let k = 0;
  while (words.length < capacity(v)) words.push(pad[k++ % 2]);
  return words;
}

function interleave(words: number[], v: number): number[] {
  const t = VER[v];
  const ecLen = t[1];
  const blocks: number[][] = [];
  let pos = 0;
  for (let i = 0; i < t[2]; i++) {
    blocks.push(words.slice(pos, pos + t[3]));
    pos += t[3];
  }
  for (let i = 0; i < t[4]; i++) {
    blocks.push(words.slice(pos, pos + t[5]));
    pos += t[5];
  }
  const ecs = blocks.map((b) => rsEncode(b, ecLen));
  const out: number[] = [];
  const maxD = Math.max(...blocks.map((b) => b.length));
  for (let i = 0; i < maxD; i++) blocks.forEach((b) => i < b.length && out.push(b[i]));
  for (let i = 0; i < ecLen; i++) ecs.forEach((e) => out.push(e[i]));
  return out;
}

/* --- matrix -------------------------------------------------------------- */
function makeMatrix(v: number): Matrix {
  const n = v * 4 + 17;
  const m: Matrix = Array.from({ length: n }, () => new Array<Cell>(n).fill(null));
  const finder = (r: number, c: number) => {
    for (let i = -1; i <= 7; i++)
      for (let j = -1; j <= 7; j++) {
        const rr = r + i;
        const cc = c + j;
        if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
        m[rr][cc] =
          (i >= 0 && i <= 6 && (j === 0 || j === 6)) ||
          (j >= 0 && j <= 6 && (i === 0 || i === 6)) ||
          (i >= 2 && i <= 4 && j >= 2 && j <= 4);
      }
  };
  finder(0, 0);
  finder(0, n - 7);
  finder(n - 7, 0);
  for (let i = 8; i < n - 8; i++) {
    m[6][i] = i % 2 === 0;
    m[i][6] = i % 2 === 0;
  }
  const ac = ALIGN[v];
  for (const r of ac)
    for (const c of ac) {
      if ((r < 9 && c < 9) || (r < 9 && c > n - 10) || (r > n - 10 && c < 9)) continue;
      for (let i = -2; i <= 2; i++)
        for (let j = -2; j <= 2; j++)
          m[r + i][c + j] = Math.abs(i) === 2 || Math.abs(j) === 2 || (i === 0 && j === 0);
    }
  m[n - 8][8] = true; // dark module
  return m;
}

function reserveFormat(m: Matrix, n: number): [number, number][] {
  const res: [number, number][] = [];
  for (let i = 0; i < 9; i++) {
    if (m[8][i] === null) res.push([8, i]);
    if (m[i][8] === null) res.push([i, 8]);
  }
  for (let i = n - 8; i < n; i++) {
    if (m[8][i] === null) res.push([8, i]);
    if (m[i][8] === null) res.push([i, 8]);
  }
  return res;
}

const MASKS: ((r: number, c: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function place(m: Matrix, n: number, bytes: number[], mask: number) {
  const used = m.map((row) => row.map((v) => v !== null));
  reserveFormat(m, n).forEach(([r, c]) => (used[r][c] = true));
  let bit = 0;
  const total = bytes.length * 8;
  const get = (i: number) => (bytes[i >> 3] >> (7 - (i & 7))) & 1;
  let up = true;
  for (let col = n - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let i = 0; i < n; i++) {
      const row = up ? n - 1 - i : i;
      for (let k = 0; k < 2; k++) {
        const c = col - k;
        if (used[row][c]) continue;
        let b = bit < total ? get(bit) : 0;
        bit++;
        if (MASKS[mask](row, c)) b ^= 1;
        m[row][c] = !!b;
      }
    }
    up = !up;
  }
}

function formatBits(mask: number): number {
  const data = (0 << 3) | mask; // EC level M = 00
  let rem = data << 10;
  const g = 0x537;
  for (let i = 14; i >= 10; i--) if ((rem >> i) & 1) rem ^= g << (i - 10);
  return ((data << 10) | rem) ^ 0x5412;
}

/**
 * Canonical bit mapping. Bit 0 lands at (0,8) and (8,n-1) — getting this order
 * backwards still round-trips through your own reader, but no real scanner
 * will read it.
 */
function putFormat(m: Matrix, n: number, mask: number) {
  const bits = formatBits(mask);
  for (let i = 0; i < 15; i++) {
    const on = ((bits >> i) & 1) === 1;
    if (i < 6) m[i][8] = on;
    else if (i < 8) m[i + 1][8] = on;
    else m[n - 15 + i][8] = on;

    if (i < 8) m[8][n - i - 1] = on;
    else if (i < 9) m[8][15 - i - 1 + 1] = on;
    else m[8][15 - i - 1] = on;
  }
  m[n - 8][8] = true;
}

function versionBits(v: number): number {
  let rem = v << 12;
  const g = 0x1f25;
  for (let i = 17; i >= 12; i--) if ((rem >> i) & 1) rem ^= g << (i - 12);
  return (v << 12) | rem;
}

function putVersion(m: Matrix, n: number, v: number) {
  if (v < 7) return;
  const bits = versionBits(v);
  for (let i = 0; i < 18; i++) {
    const b = ((bits >> i) & 1) === 1;
    const r = Math.floor(i / 3);
    const c = i % 3;
    m[r][n - 11 + c] = b;
    m[n - 11 + c][r] = b;
  }
}

function penalty(m: Matrix, n: number): number {
  let p = 0;
  const runs = (get: (a: number, b: number) => Cell) => {
    for (let a = 0; a < n; a++) {
      let run = 1;
      for (let b = 1; b < n; b++) {
        if (get(a, b) === get(a, b - 1)) run++;
        else {
          if (run >= 5) p += 3 + (run - 5);
          run = 1;
        }
      }
      if (run >= 5) p += 3 + (run - 5);
    }
  };
  runs((r, c) => m[r][c]);
  runs((c, r) => m[r][c]);
  for (let r = 0; r < n - 1; r++)
    for (let c = 0; c < n - 1; c++)
      if (m[r][c] === m[r][c + 1] && m[r][c] === m[r + 1][c] && m[r][c] === m[r + 1][c + 1]) p += 3;
  let dark = 0;
  m.forEach((row) => row.forEach((v) => v && dark++));
  p += Math.floor(Math.abs((dark * 100) / (n * n) - 50) / 5) * 10;
  return p;
}

export function encodeQR(str: string): boolean[][] {
  const bytes = toBytes(str);
  const v = pickVersion(bytes.length);
  const n = v * 4 + 17;
  const words = interleave(buildData(bytes, v), v);
  let best: Matrix | null = null;
  let bestP = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const m = makeMatrix(v);
    putVersion(m, n, v);
    place(m, n, words, mask);
    putFormat(m, n, mask);
    const p = penalty(m, n);
    if (p < bestP) {
      bestP = p;
      best = m;
    }
  }
  return best!.map((row) => row.map((x) => !!x));
}

/** SVG path data for the dark modules, offset by a quiet zone. */
export function qrPath(matrix: boolean[][], quiet: number): string {
  let path = '';
  matrix.forEach((row, r) =>
    row.forEach((on, c) => {
      if (on) path += 'M' + (c + quiet) + ' ' + (r + quiet) + 'h1v1h-1z';
    }),
  );
  return path;
}

export const badgePayload = (staffId: string, badge: string) => `FBOS-ID|${staffId}|${badge}`;
export const posterPayload = (branchId: string) => `FBOS-BRANCH|${branchId}|clockin`;
