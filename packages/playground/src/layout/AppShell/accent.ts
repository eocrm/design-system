import { createContext, useContext, useEffect, useState } from 'react';

export const ACCENT_KEY = 'eocrm-playground-accent';

/** Every accent, in menu order. `blue` is the default (no `data-accent`). */
export const ACCENTS = [
  { value: 'blue', label: 'Blue' },
  { value: 'tealpine', label: 'Teal pine' },
  { value: 'indigo', label: 'Indigo' },
  { value: 'grape', label: 'Grape' },
  { value: 'berry', label: 'Berry' },
  { value: 'slate', label: 'Slate' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'moss', label: 'Moss' },
] as const;

export type Accent = (typeof ACCENTS)[number]['value'];

export const isAccent = (v: unknown): v is Accent => ACCENTS.some((a) => a.value === v);

/** Current accent, provided by AppShell (every mockup renders inside it). */
export const AccentContext = createContext<Accent>('blue');

export const useAccent = () => useContext(AccentContext);

const MARK = (light: string, mid: string, outline: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">` +
  `<rect x="4" y="4" width="56" height="56" rx="16" fill="#111827"/>` +
  `<rect x="15" y="15" width="15" height="15" rx="4" fill="${light}"/>` +
  `<rect x="34" y="15" width="15" height="15" rx="4" fill="${mid}"/>` +
  `<rect x="15" y="34" width="15" height="15" rx="4" fill="${mid}"/>` +
  `<path d="M37 34h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3Z" stroke="${outline}" stroke-width="3"/>` +
  `</svg>`;

/** Resolves `color-mix(var(--color-accent) pct%, white)` to a literal colour. */
function accentTint(probe: HTMLElement, pct: number) {
  probe.style.color = `color-mix(in oklab, var(--color-accent) ${pct}%, white)`;
  return getComputedStyle(probe).color;
}

function buildMark() {
  const probe = document.createElement('span');
  probe.hidden = true;
  document.body.append(probe);
  try {
    const svg = MARK(accentTint(probe, 60), accentTint(probe, 80), accentTint(probe, 40));
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  } finally {
    probe.remove();
  }
}

/**
 * The design-system mark as a data URI whose squares are tints of the live
 * `--color-accent`; the dark tile stays fixed. `<Logo>` renders an `<img>`, which
 * can't read page CSS variables, so the tints are resolved here and re-resolved
 * whenever the accent or theme (attribute or OS preference) changes.
 */
export function useAccentMark() {
  const [src, setSrc] = useState(() => (typeof document === 'undefined' ? '' : buildMark()));
  useEffect(() => {
    const update = () => setSrc(buildMark());
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-accent', 'data-theme'],
    });
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', update);
    update();
    return () => {
      observer.disconnect();
      media.removeEventListener('change', update);
    };
  }, []);
  return src;
}
