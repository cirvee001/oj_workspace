import { extendTailwindMerge } from 'tailwind-merge';

/*
 * Teach tailwind-merge about the custom tokens in index.css. Without the
 * font-size entries it reads `text-body-14` as a text COLOUR and drops a real
 * colour such as `text-on-accent` sitting next to it.
 */
const merge = extendTailwindMerge({
  extend: {
    theme: { radius: ['card', 'ctl', 'tile', 'tag'] },
    classGroups: {
      'font-size': [{ text: ['body-12', 'body-13', 'body-14', 'body-15', 'heading-18', 'heading-20', 'heading-24', 'display-40', 'label-11', 'eyebrow'] }],
    },
  },
});

/** Join class names, skipping falsy values; later classes win on conflicts. */
export const cn = (...parts: (string | false | null | undefined)[]): string => merge(parts.filter(Boolean).join(' '));
