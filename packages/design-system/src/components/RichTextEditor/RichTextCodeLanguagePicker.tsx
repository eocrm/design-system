// RichTextCodeLanguagePicker.tsx — the compact language Select shown on the code
// block holding the caret. Rendered right after the editable (not portaled) so
// Escape → Tab out of the code block lands on it; Floating UI pins it inside the
// block's top-end corner. Presentational; internal, not exported from the package.
import { useLayoutEffect, useMemo } from 'react';
import { Select } from '../Select';
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
  // Anchor to the block's TOP edge only and drop below it: the picker sits inside
  // the block's top-end corner and never moves while the block grows.
  const getAnchorRect = useMemo(
    () => () => {
      const r = getBlockRect();
      return r && { ...r, height: 0 };
    },
    [getBlockRect],
  );
  const { refs, floatingStyles, update } = useAnchoredFloating(NO_RECT, getAnchorRect, {
    offset: 4,
    placement: 'bottom-end',
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
      <Select
        size="sm"
        options={all}
        value={language ?? ''}
        aria-label={t('richTextEditor.codeLanguage')}
        onChange={(v) => onChange((v as string) || undefined)}
      />
    </div>
  );
}
