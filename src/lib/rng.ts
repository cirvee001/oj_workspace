/** Deterministic LCG so the demo data looks the same on every load. */
export type Rng = () => number;

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const pick = <T,>(r: Rng, list: readonly T[]): T => list[Math.floor(r() * list.length)];

export const between = (r: Rng, a: number, b: number): number => a + Math.floor(r() * (b - a + 1));
