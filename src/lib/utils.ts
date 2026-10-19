import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/*
 * The named sizes from `fontSize` in tailwind.config.ts. Without this,
 * tailwind-merge reads `text-label` as a text colour and drops it whenever a
 * real colour such as `text-ink` follows, leaving the text at 16px.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {},
    classGroups: {
      'font-size': [{ text: ['label', 'caption', 'body-sm'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
