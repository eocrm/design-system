// RichTextCodeLanguagePicker.tsx — the compact language menu shown on the code
// block holding the caret. Its trigger renders right after the editable (not
// portaled) so Escape → Tab out of the code block lands on it; Floating UI pins it
// inside the block's top-end corner. DropdownMenu (already in the editor bundle via
// the toolbar) rather than Select keeps the bundle lean; radio items give
// menuitemradio/aria-checked. Presentational; internal, not exported from the package.
import { useLayoutEffect, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '../Button';
import { DropdownMenu } from '../DropdownMenu';
import { useTranslation } from '../../i18n';
import { CODE_LANGUAGES } from '../RichText/engine/codeLanguage';
import { CODE_LANGUAGE_LABELS } from '../CodeBlock/languages';
import type { Rect } from './selection';
import { useAnchoredFloating } from './useAnchoredFloating';
import styles from './RichTextEditor.module.scss';

export interface RichTextCodeLanguagePickerProps {
  /** The code block's stored language (`undefined` = plain text). */
  language: string | undefined;
  /** Live rect of the code block (viewport coords). */
  getBlockRect: () => Rect | null;
  /** Changes whenever the layout may have shifted (e.g. the doc), to reposition. */
  layoutKey: unknown;
  /** Pick a language (`undefined` = plain text). */
  onChange: (language: string | undefined) => void;
  /** Focus left the picker for `to` (the editor hides it unless focus went back). */
  onFocusLeave: (to: Element | null) => void;
}

const NO_RECT: Rect = { top: 0, left: 0, width: 0, height: 0 };

/** Internal language picker for the caret's code block in `<RichTextEditor>`. */
export function RichTextCodeLanguagePicker({
  language,
  getBlockRect,
  layoutKey,
  onChange,
  onFocusLeave,
}: RichTextCodeLanguagePickerProps) {
  const t = useTranslation();
  // Anchor to the block's TOP edge only and drop below it (never flipped): the
  // picker sits in the strip the editor reserves at the top of every editable
  // code block (`.root:not(.readOnly) pre`, sized to this offset + Button sm), so
  // it never covers text and never moves while the block grows.
  const getAnchorRect = useMemo(
    () => () => {
      const r = getBlockRect();
      return r && { ...r, height: 0 };
    },
    [getBlockRect],
  );
  const { refs, floatingStyles, update } = useAnchoredFloating(NO_RECT, getAnchorRect, {
    offset: 4, // = --space-1, the strip's top gap
    placement: 'bottom-end',
    flip: false,
  });
  useLayoutEffect(() => update(), [update, layoutKey]);
  const options = useMemo(
    () => [
      { value: '', label: t('richTextEditor.plainText') },
      ...CODE_LANGUAGES.map((l) => ({ value: l, label: CODE_LANGUAGE_LABELS[l] })),
    ],
    [t],
  );
  // An unknown stored language stays selectable as itself, so it isn't shown as plain.
  const all =
    language && !options.some((o) => o.value === language)
      ? [...options, { value: language, label: language }]
      : options;
  const current = all.find((o) => o.value === (language ?? ''))!;
  return (
    <div
      ref={refs.setFloating}
      // The editor reads this to tell "focus moved into the picker" from "left".
      data-rte-code-language=""
      className={styles.codeLanguagePicker}
      style={floatingStyles}
      onBlur={(e) => {
        const to = e.relatedTarget as Element | null;
        if (!to || !e.currentTarget.contains(to)) onFocusLeave(to);
      }}
    >
      <DropdownMenu>
        <DropdownMenu.Trigger>
          {/* Name keeps the visible value (WCAG 2.5.3 Label in Name): "Code language: Python". */}
          <Button
            size="sm"
            variant="secondary"
            aria-label={`${t('richTextEditor.codeLanguage')}: ${current.label}`}
          >
            {current.label}
            <ChevronDown size={14} aria-hidden="true" />
          </Button>
        </DropdownMenu.Trigger>
        {/* Portaled: the marker keeps focus inside the open menu "in the picker"
            (the editor would otherwise unmount it on focus leave). */}
        <DropdownMenu.Content data-rte-code-language="" align="end">
          <DropdownMenu.RadioGroup
            value={language ?? ''}
            onValueChange={(v) => onChange(v || undefined)}
          >
            {all.map((o) => (
              <DropdownMenu.RadioItem key={o.value} value={o.value}>
                {o.label}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu>
    </div>
  );
}
