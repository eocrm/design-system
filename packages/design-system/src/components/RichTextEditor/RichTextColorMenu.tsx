import clsx from 'clsx';
import { Stack } from '../Stack';
import { Cluster } from '../Cluster';
import { Text } from '../Text';
import { useTranslation, type MessageKey } from '../../i18n';
import { COLOR_KEYS, textColorVar, bgColorVar, type ColorKey } from '../RichText/engine/colorMarks';
import styles from './RichTextEditor.module.scss';

export interface RichTextColorMenuProps {
  /** Active color key per type, to ring the current swatch. */
  active: { textColor?: string; bgColor?: string };
  /** Pick a color (key) or clear (null) for a type. */
  onPick: (type: 'textColor' | 'bgColor', key: string | null) => void;
}

// Palette key → i18n key for the swatch aria-label. Exhaustive over every
// ColorKey (gray + the 30-color palette) — TypeScript enforces the Record is total.
const SWATCH_LABEL: Record<ColorKey, MessageKey> = {
  gray: 'richTextEditor.colorGray',
  red: 'richTextEditor.colorRed',
  coral: 'richTextEditor.colorCoral',
  orange: 'richTextEditor.colorOrange',
  amber: 'richTextEditor.colorAmber',
  gold: 'richTextEditor.colorGold',
  yellow: 'richTextEditor.colorYellow',
  olive: 'richTextEditor.colorOlive',
  lime: 'richTextEditor.colorLime',
  green: 'richTextEditor.colorGreen',
  emerald: 'richTextEditor.colorEmerald',
  mint: 'richTextEditor.colorMint',
  teal: 'richTextEditor.colorTeal',
  cyan: 'richTextEditor.colorCyan',
  sky: 'richTextEditor.colorSky',
  blue: 'richTextEditor.colorBlue',
  navy: 'richTextEditor.colorNavy',
  indigo: 'richTextEditor.colorIndigo',
  violet: 'richTextEditor.colorViolet',
  lavender: 'richTextEditor.colorLavender',
  purple: 'richTextEditor.colorPurple',
  plum: 'richTextEditor.colorPlum',
  fuchsia: 'richTextEditor.colorFuchsia',
  magenta: 'richTextEditor.colorMagenta',
  pink: 'richTextEditor.colorPink',
  rose: 'richTextEditor.colorRose',
  brown: 'richTextEditor.colorBrown',
  taupe: 'richTextEditor.colorTaupe',
  slate: 'richTextEditor.colorSlate',
  stone: 'richTextEditor.colorStone',
  charcoal: 'richTextEditor.colorCharcoal',
};

/**
 * Internal, presentational swatch grid for the RichTextEditor color feature. Two
 * rows — "Text" (`textColor`) and "Highlight" (`bgColor`) — each a ⌀ clear swatch
 * followed by one swatch per palette key. Owns no state: the parent passes the
 * `active` key per type (to ring the current swatch) and an `onPick` dispatcher.
 *
 * Every swatch is `onMouseDown`-prevented so picking a color never steals the
 * editor's DOM selection. Not exported from the package index — it's wired into
 * the toolbar color Popover (and, later, the block menu).
 *
 * @example
 * <RichTextColorMenu active={{ textColor: 'red' }} onPick={(type, key) => …} />
 */
export function RichTextColorMenu({ active, onPick }: RichTextColorMenuProps) {
  const t = useTranslation();

  const renderRow = (
    type: 'textColor' | 'bgColor',
    label: string,
    swatchVar: (key: string) => string | undefined,
  ) => (
    // role=group + aria-label so AT can distinguish the two identical "Red"/"Default"
    // swatches across the Text and Highlight rows. The visible label is kept too.
    <Stack gap="xs" role="group" aria-label={label}>
      <Text size="sm" tone="muted">
        {label}
      </Text>
      <Cluster gap="xs" wrap>
        <button
          type="button"
          className={clsx(styles.swatch, styles.swatchClear)}
          aria-label={t('richTextEditor.colorClear')}
          title={t('richTextEditor.colorClear')}
          // "Default" is the pressed state when no color of this type is active.
          aria-pressed={!active[type]}
          // Preserve the editor's DOM selection: a mousedown that moves focus
          // out of the contentEditable would collapse it before the pick runs.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(type, null)}
        />
        {COLOR_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={clsx(styles.swatch, active[type] === key && styles.swatchActive)}
            // Dynamic token var() — like renderDoc, the value is theme-backed, not a raw color.
            style={{ background: swatchVar(key) }}
            aria-label={t(SWATCH_LABEL[key])}
            // Tooltip too: 30 near-shades (coral/rose, slate/stone/taupe) are hard to
            // tell apart by sight; the name on hover gives mouse users parity with AT.
            title={t(SWATCH_LABEL[key])}
            aria-pressed={active[type] === key}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(type, key)}
          />
        ))}
      </Cluster>
    </Stack>
  );

  return (
    <Stack gap="sm" className={styles.colorMenu} aria-label={t('richTextEditor.color')}>
      {renderRow('textColor', t('richTextEditor.textColor'), textColorVar)}
      {renderRow('bgColor', t('richTextEditor.highlight'), bgColorVar)}
    </Stack>
  );
}
