import clsx from 'clsx';
import { Stack } from '../Stack';
import { Cluster } from '../Cluster';
import { useTranslation, type MessageKey } from '../../i18n';
import { COLOR_KEYS, textColorVar, bgColorVar, type ColorKey } from '../RichText/engine/colorMarks';
import { preventSelectionLoss } from './preventSelectionLoss';
import styles from './RichTextEditor.module.scss';

export interface RichTextColorMenuProps {
  /** Which mark this menu sets. */
  type: 'textColor' | 'bgColor';
  /** The active color key for this type (rings the current badge). */
  active?: string;
  /** Pick a color key, or null to clear. */
  onPick: (key: string | null) => void;
}

// Palette key → i18n key for the badge label. Exhaustive over every ColorKey
// (gray + the 30-color palette) — TypeScript enforces the Record is total.
const BADGE_LABEL: Record<ColorKey, MessageKey> = {
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
 * Internal, presentational color picker for ONE mark type (`textColor` OR
 * `bgColor`). Renders a leading Default/clear badge followed by one named badge
 * per palette key — each badge styled like the Palette demo chip (subtle bg fill
 * + strong fg text, both dynamic token `var()`s). Owns no state: the parent
 * passes the `active` key (to ring the current badge) and an `onPick` dispatcher.
 *
 * Every badge is `onMouseDown`-prevented so picking a color never steals the
 * editor's DOM selection. Not exported from the package index — it's wired into
 * the toolbar's Text-color / Highlight popovers and the block menu's submenus.
 *
 * @example
 * <RichTextColorMenu type="textColor" active="red" onPick={(key) => …} />
 */
export function RichTextColorMenu({ type, active, onPick }: RichTextColorMenuProps) {
  const t = useTranslation();
  // The group's accessible name doubles as the menu's heading: textColor → "Text
  // color", bgColor → "Highlight". Lets AT distinguish the two color menus.
  const label = t(type === 'textColor' ? 'richTextEditor.textColor' : 'richTextEditor.highlight');
  const clearLabel = t('richTextEditor.colorClear');

  return (
    // role=group + aria-label so AT can tell the Text-color menu apart from the
    // Highlight menu — both render the same "Red"/"Default" badge names.
    <Stack gap="xs" className={styles.colorMenu} role="group" aria-label={label}>
      <Cluster gap="xs" wrap>
        <button
          type="button"
          className={clsx(styles.colorBadge, styles.colorBadgeClear)}
          aria-label={clearLabel}
          title={clearLabel}
          // "Default" is the pressed state when no color of this type is active.
          aria-pressed={!active}
          onMouseDown={preventSelectionLoss}
          onClick={() => onPick(null)}
        >
          {clearLabel}
        </button>
        {COLOR_KEYS.map((key) => {
          const name = t(BADGE_LABEL[key]);
          return (
            <button
              key={key}
              type="button"
              className={clsx(styles.colorBadge, active === key && styles.colorBadgeActive)}
              // The Palette-demo chip look: subtle bg fill + strong fg text. Both
              // are dynamic token var()s (like renderDoc), never raw colors.
              style={{ background: bgColorVar(key), color: textColorVar(key) }}
              aria-label={name}
              title={name}
              aria-pressed={active === key}
              onMouseDown={preventSelectionLoss}
              onClick={() => onPick(key)}
            >
              {name}
            </button>
          );
        })}
      </Cluster>
    </Stack>
  );
}
