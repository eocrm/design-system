import type { ReactNode } from 'react';

/** A variable the editor knows about — drives the insert menu, autocomplete, and unknown flagging. */
export interface LiquidVariable {
  /** Token inserted and matched, e.g. `"first_name"` → referenced as `{{ first_name }}`. */
  code: string;
  /** Human label shown in the picker + autocomplete. Defaults to `code`. */
  label?: string;
  /** Optional type hint rendered as a muted tag in suggestions, e.g. `"text"` | `"date"`. */
  type?: string;
  /** Optional group header that sections the picker + autocomplete. */
  group?: string;
  /**
   * Optional human description. Surfaces as a second muted line in the insert
   * menu and autocomplete suggestions, and in the footer when the caret sits
   * on this variable's reference.
   */
  description?: string;
  /**
   * Marks an array/collection variable meant to be iterated, not interpolated.
   * The insert menu drops a `{% for item in code %}{{ item }}{% endfor %}`
   * snippet instead of `{{ code }}`, and menus show a muted "list" tag.
   * Default `false`.
   */
  collection?: boolean;
}

/** Drives the preview pane chrome. */
export type LiquidPreviewStatus = 'idle' | 'loading' | 'error';

/** Where the preview pane sits relative to the editor. */
export type LiquidPreviewPlacement = 'bottom' | 'right';

export interface LiquidEditorProps {
  /** Controlled template source. */
  value: string;
  /** Fires on every edit (typing, paste, variable insert, autocomplete accept). */
  onChange: (value: string) => void;
  /** Available variables → insert menu, autocomplete, unknown flagging. */
  variables?: LiquidVariable[];
  /** Underline `{{ vars }}` not present in `variables`. Default `true` (no-op when `variables` empty). */
  flagUnknownVariables?: boolean;
  /** External error visual (red border) — set from a backend Liquid syntax error. Default `false`. */
  invalid?: boolean;
  /** External error message shown in the footer. Pairs with `invalid`. */
  error?: ReactNode;
  /** Consumer-rendered preview output. When set (or `previewStatus` ≠ 'idle'), the pane shows. */
  preview?: ReactNode;
  /** Preview pane chrome. Default `'idle'`. */
  previewStatus?: LiquidPreviewStatus;
  /** Preview pane position. Default `'bottom'`. */
  previewPlacement?: LiquidPreviewPlacement;
  /** Show the line-number gutter. Default `true`. */
  showLineNumbers?: boolean;
  /** Show the toolbar (variable-insert menu). Default `true`. */
  showToolbar?: boolean;
  /**
   * Custom action buttons rendered in the toolbar, right-aligned just before the
   * "Insert variable" button (e.g. a Docs / Help link). Pass `<Button size="sm">`
   * elements (or a fragment of them); a `ghost` variant pairs well next to the
   * bordered "Insert variable" button. Only renders when `showToolbar` is true.
   */
  toolbarActions?: ReactNode;
  /** Filter names offered in autocomplete after `|`. Defaults to a common Liquid set. */
  filters?: string[];
  /** Minimum visible rows. Default `4`. */
  minRows?: number;
  /** Maximum visible rows before the editor scrolls internally. Default unbounded. */
  maxRows?: number;
  /** Read-only: caret + selection allowed, no edits. Default `false`. */
  readOnly?: boolean;
  /** Disabled: non-interactive + dimmed. Default `false`. */
  disabled?: boolean;
  /** Optional id forwarded to the textarea (for `<Field>` / label association). */
  id?: string;
  /** Optional name forwarded to the textarea. */
  name?: string;
  /** Placeholder shown when empty. */
  placeholder?: string;
  /** Accessible label (defaults to the i18n `liquidEditor.editorLabel`). */
  'aria-label'?: string;
  /** Id of an external label element. */
  'aria-labelledby'?: string;
  /**
   * Id(s) of external description element(s). Merged with the component's own
   * footer description (the `error` / unknown-variable message), so a screen
   * reader announces both. You usually don't need this — the footer is wired
   * automatically; pass it only to add an extra external description.
   */
  'aria-describedby'?: string;
  /** Extra class on the root wrapper. */
  className?: string;
}
