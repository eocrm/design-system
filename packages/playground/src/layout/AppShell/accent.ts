import { createContext, useContext } from 'react';

export const ACCENT_KEY = 'eocrm-playground-accent';

/**
 * Every accent, in menu order. `blue` is the default (no `data-accent`).
 * `top` / `body` shade the eocrm chevron mark the way the Teal pine asset does:
 * a light top chevron (the accent's dark-theme value) over the light-theme body.
 * Blue and Teal pine keep their original asset colours (Teal pine's body predates
 * the current token). Hand-copied from tokens.json — retuning an accent there
 * does not update its mark here.
 */
export const ACCENTS = [
  { value: 'blue', label: 'Blue', top: '#0052CC', body: '#0052CC' },
  { value: 'tealpine', label: 'Teal pine', top: '#6DCFC4', body: '#17736D' },
  { value: 'indigo', label: 'Indigo', top: '#A3A8FF', body: '#4C4BD1' },
  { value: 'grape', label: 'Grape', top: '#C9A0F0', body: '#7B3FB3' },
  { value: 'berry', label: 'Berry', top: '#F28CB8', body: '#B0306E' },
  { value: 'slate', label: 'Slate', top: '#A9B8CA', body: '#3E4C5E' },
  { value: 'ocean', label: 'Ocean', top: '#6CC4E6', body: '#0A6A8C' },
  { value: 'moss', label: 'Moss', top: '#A6C96A', body: '#45601B' },
] as const;

export type Accent = (typeof ACCENTS)[number]['value'];

export const isAccent = (v: unknown): v is Accent => ACCENTS.some((a) => a.value === v);

/** Current accent, provided by AppShell (every mockup renders inside it). */
export const AccentContext = createContext<Accent>('blue');

export const useAccent = () => useContext(AccentContext);

const MARKS = Object.fromEntries(
  ACCENTS.map(({ value, top, body }) => {
    const svg =
      `<svg width="160" height="160" viewBox="0 -4 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">` +
      `<path d="M127.441 135.999L95.8134 152L80 144L64.1857 152L32.5579 136L80 112L127.441 135.999Z" fill="${body}"/>` +
      `<path d="M160 96V119.529L143.256 127.999L80 96L16.7436 128L0 119.529V96L80 55.5294L160 96Z" fill="${body}"/>` +
      `<path d="M160 40.4706V80L80 39.5294L0 80V40.4706L80 0L160 40.4706Z" fill="${top}"/>` +
      `</svg>`;
    return [value, `data:image/svg+xml,${encodeURIComponent(svg)}`];
  }),
) as Record<Accent, string>;

/** The eocrm chevron mark shaded for the current accent, as a data URI for `<Logo src>`. */
export const useAccentMark = () => MARKS[useAccent()];
