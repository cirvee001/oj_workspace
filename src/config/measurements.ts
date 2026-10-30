/**
 * The measurement book, as a Nigerian tailor keeps it.
 *
 * Measurements are in inches, the unit Lagos and Abuja workshops still cut in.
 * Points are grouped by the garment they are used for, and each carries the
 * shorthand a tailor writes in the book (N, Sh, C, T…), so a printout reads
 * the way the workshop already reads.
 *
 * `label` is also the key under which a value is stored on Customer.sizes,
 * so renaming a label is a data migration — add a new point instead.
 */
import type { Figure, Fit } from '@/types/domain';

export interface MeasurementPoint {
  /** Stored key and the name shown on screen. */
  label: string;
  /** The tailor's shorthand. */
  code: string;
  /** How to take it, in one line. */
  how: string;
}

export interface MeasurementGroup {
  id: string;
  title: string;
  /** What it is used for. */
  for: string;
  points: MeasurementPoint[];
}

export const FIGURES: readonly { value: Figure; label: string }[] = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
];

export const FITS: readonly { value: Fit; label: string; hint: string }[] = [
  { value: 'Fitted', label: 'Fitted', hint: 'Close to the body' },
  { value: 'Regular', label: 'Regular', hint: 'Standard ease' },
  { value: 'Free', label: 'Free', hint: 'Loose, flowing' },
];

export const MEASUREMENT_BOOK: Record<Figure, MeasurementGroup[]> = {
  men: [
    {
      id: 'top',
      title: 'Top',
      for: 'Kaftan, buba, senator, shirt',
      points: [
        { label: 'Neck', code: 'N', how: 'Round the base of the neck, one finger inside the tape.' },
        { label: 'Shoulder', code: 'Sh', how: 'Across the back, from shoulder bone to shoulder bone.' },
        { label: 'Chest', code: 'C', how: 'Round the fullest part of the chest, under the arms.' },
        { label: 'Tummy', code: 'T', how: 'Round the stomach at the navel, relaxed.' },
        { label: 'Top length', code: 'L', how: 'From the shoulder by the neck down to where the top should end.' },
        { label: 'Long sleeve', code: 'SL', how: 'From the shoulder bone to the wrist, arm hanging relaxed.' },
        { label: 'Short sleeve', code: 'SS', how: 'From the shoulder bone to just above the elbow.' },
        { label: 'Round sleeve', code: 'RS', how: 'Round the upper arm at its fullest, by the armpit.' },
        { label: 'Cuff', code: 'Cf', how: 'Round the wrist, loose enough to slip the hand through.' },
      ],
    },
    {
      id: 'agbada',
      title: 'Agbada',
      for: 'The flowing outer robe',
      points: [
        { label: 'Agbada length', code: 'AL', how: 'From the shoulder by the neck down to the ankle, with shoes on.' },
        { label: 'Agbada width', code: 'AW', how: 'Arms stretched out to the sides: wrist to wrist across the back.' },
      ],
    },
    {
      id: 'trousers',
      title: 'Trousers',
      for: 'Sokoto, suit trousers',
      points: [
        { label: 'Waist', code: 'W', how: 'Round where the trousers will sit, usually just below the navel.' },
        { label: 'Hip', code: 'H', how: 'Round the fullest part of the seat, feet together.' },
        { label: 'Thigh', code: 'Th', how: 'Round the top of the leg at its fullest.' },
        { label: 'Knee', code: 'K', how: 'Round the knee, leg straight.' },
        { label: 'Trouser length', code: 'TL', how: 'From the waist down the side of the leg to the ankle.' },
        { label: 'Inside leg', code: 'IL', how: 'From the crotch down the inside of the leg to the ankle.' },
        { label: 'Bottom', code: 'B', how: 'Round the trouser opening at the ankle — how wide the leg ends.' },
        { label: 'Crotch', code: 'Cr', how: 'Seated: from the waist at the side down to the chair.' },
      ],
    },
    {
      id: 'cap',
      title: 'Cap',
      for: 'Fila',
      points: [{ label: 'Head', code: 'Hd', how: 'Round the head, across the forehead and above the ears.' }],
    },
  ],
  women: [
    {
      id: 'top',
      title: 'Top',
      for: 'Buba, blouse, gown bodice',
      points: [
        { label: 'Shoulder', code: 'Sh', how: 'Across the back, from shoulder bone to shoulder bone.' },
        { label: 'Bust', code: 'B', how: 'Round the fullest part of the bust, tape level across the back.' },
        { label: 'Under-bust', code: 'UB', how: 'Round the ribcage, just under the bust.' },
        { label: 'Bust point', code: 'BP', how: 'From the shoulder by the neck down to the tip of the bust.' },
        { label: 'Nipple to nipple', code: 'NN', how: 'Straight across, from bust point to bust point.' },
        { label: 'Shoulder to under-bust', code: 'SUB', how: 'From the shoulder by the neck down to just under the bust.' },
        { label: 'Half length', code: 'HL', how: 'From the shoulder by the neck, over the bust, to the natural waist.' },
        { label: 'Waist', code: 'W', how: 'Round the narrowest part, usually just above the navel.' },
        { label: 'Blouse length', code: 'BL', how: 'From the shoulder by the neck down to where the buba should end.' },
        { label: 'Arm hole', code: 'AH', how: 'Round the arm where it joins the shoulder.' },
        { label: 'Round sleeve', code: 'RS', how: 'Round the upper arm at its fullest.' },
        { label: 'Sleeve length', code: 'SL', how: 'From the shoulder bone to where the sleeve should end.' },
      ],
    },
    {
      id: 'lower',
      title: 'Hip & wrapper',
      for: 'Iro, skirt, trousers',
      points: [
        { label: 'Hip', code: 'H', how: 'Round the fullest part of the hips and bottom, feet together.' },
        { label: 'Waist to hip', code: 'WH', how: 'From the waist down the side to the fullest part of the hip.' },
        { label: 'Thigh', code: 'Th', how: 'Round the top of the leg at its fullest.' },
        { label: 'Knee length', code: 'KL', how: 'From the waist down to the middle of the knee.' },
        { label: 'Wrapper length', code: 'WL', how: 'From the waist down to the ankle, or wherever the iro should end.' },
      ],
    },
    {
      id: 'gown',
      title: 'Gown',
      for: 'Gowns, dresses, boubou',
      points: [
        { label: 'Shoulder to knee', code: 'SK', how: 'From the shoulder by the neck down to the knee.' },
        { label: 'Gown length', code: 'GL', how: 'From the shoulder by the neck to the hem, with the shoes she will wear.' },
      ],
    },
    {
      id: 'head',
      title: 'Head',
      for: 'Gele, hat',
      points: [{ label: 'Head', code: 'Hd', how: 'Round the head, across the forehead and above the ears.' }],
    },
  ],
};

/** Every point in a figure's book, in order. */
export const pointsFor = (figure: Figure): MeasurementPoint[] => MEASUREMENT_BOOK[figure].flatMap((g) => g.points);

/** The groups a tailor needs for each style, so a job shows only what matters. */
const STYLE_GROUPS: Record<string, string[]> = {
  agbada: ['top', 'agbada', 'trousers', 'cap'],
  kaftan: ['top', 'trousers'],
  suit: ['top', 'trousers'],
  gown: ['top', 'gown'],
  iro: ['top', 'lower', 'head'],
  bubu: ['top', 'gown'],
};

export function groupsForStyle(figure: Figure, styleId?: string): MeasurementGroup[] {
  const wanted = styleId ? STYLE_GROUPS[styleId] : undefined;
  const all = MEASUREMENT_BOOK[figure];
  return wanted ? all.filter((g) => wanted.includes(g.id)) : all;
}

/**
 * Which book a customer's sizes were taken against. Uses the stored figure,
 * else guesses from the keys (only women's book has Bust).
 */
export const figureOf = (c: { figure?: Figure; sizes: Record<string, number> }): Figure =>
  c.figure ?? ('Bust' in c.sizes || 'Under-bust' in c.sizes ? 'women' : 'men');
