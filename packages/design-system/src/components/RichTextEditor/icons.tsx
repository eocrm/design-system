// icons.tsx — minimal inline SVG icons for the toolbar (the library ships no
// icon dependency). Sized 1em / currentColor so they inherit the Button.
import type { SVGProps } from 'react';

const base: SVGProps<SVGSVGElement> = {
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};

export function BoldIcon() {
  return (
    <svg {...base}>
      <path d="M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z" />
    </svg>
  );
}
export function ItalicIcon() {
  return (
    <svg {...base}>
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
  );
}
export function UnderlineIcon() {
  return (
    <svg {...base}>
      <path d="M6 3v7a6 6 0 0 0 12 0V3" />
      <line x1="4" y1="21" x2="20" y2="21" />
    </svg>
  );
}
export function StrikeIcon() {
  return (
    <svg {...base}>
      <line x1="4" y1="12" x2="20" y2="12" />
      <path d="M7.5 7a4 4 0 0 1 6.5-1.5M16.5 17a4 4 0 0 1-6.5 1.5" />
    </svg>
  );
}
export function BulletListIcon() {
  return (
    <svg {...base}>
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
      <circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function OrderedListIcon() {
  return (
    <svg {...base}>
      <line x1="10" y1="6" x2="20" y2="6" />
      <line x1="10" y1="12" x2="20" y2="12" />
      <line x1="10" y1="18" x2="20" y2="18" />
      <path d="M4 6h1v3M4 9h2" strokeWidth="1.5" />
      <path d="M4 15h2v1l-2 2h2" strokeWidth="1.5" />
    </svg>
  );
}
export function LinkIcon() {
  return (
    <svg {...base}>
      <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07l-1.41 1.41" />
      <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.41-1.41" />
    </svg>
  );
}
