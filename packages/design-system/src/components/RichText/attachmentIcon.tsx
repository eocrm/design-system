// Split out of RichTextEditor/icons.tsx (#509). RichTextAttachment renders in
// the read-only viewer as well as the editor, so the icon it needs cannot live
// in the editor without RichText importing upward — which is the cycle this
// change removes. RichTextEditor/icons.tsx re-exports it, so the toolbar is
// unaffected.
const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

export function AttachFileIcon() {
  return (
    <svg {...base}>
      <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.49-8.49" />
    </svg>
  );
}
