import {
  forwardRef,
  useEffect,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';
import clsx from 'clsx';
import { DropdownMenu } from '../DropdownMenu';
import { paletteTokens, type PaletteColor } from '../../palette';
import { useTranslation } from '../../i18n/useTranslation';
import { resolveStatusColor, type StatusCategory } from '../_internal/statusColor';
import styles from './PillMenu.module.scss';

/** Workflow category — maps to a default palette color. */
export type PillMenuCategory = StatusCategory;

/** One value (a status, a task type, a priority…): the current one or a menu option. */
export interface PillMenuOption {
  /** Stable id — passed to `onSelect` when this option is chosen. */
  id: string | number;
  /** Visible name. */
  name: string;
  /**
   * Optional glyph rendered before the name — in the pill and in its menu
   * row (e.g. a task-type or priority icon). Decorative: wrapped
   * `aria-hidden`, so the name alone is announced. Size it to the text
   * (~14px lucide icon).
   */
  icon?: ReactNode;
  /** Semantic category → default color: to_do slate / in_progress blue / open violet / done green / won green / lost red. */
  category?: PillMenuCategory;
  /** Explicit palette color — wins over `category` (per-state custom colors). */
  color?: PaletteColor;
}

export interface PillMenuProps extends Omit<HTMLAttributes<HTMLElement>, 'onSelect'> {
  /** The value currently shown on the trigger (or the read-only chip). */
  current: PillMenuOption;
  /**
   * What the value IS, for the trigger's accessible name: `label="type"` →
   * "Change type: Bug". Default: the localized "status" ("Change status: …").
   * Pass it as it reads right after "Change" / "Изменить", lower-case, in the
   * UI's language — it is data, not a translatable string. In ru that is the
   * accusative: `label="категорию"`, not "категория".
   */
  label?: string;
  /**
   * Transition targets, offered in the dropdown. Omitted or empty renders
   * read-only mode: a static colored chip with no button, no menu, no
   * aria-haspopup.
   */
  options?: PillMenuOption[];
  /** Fired with the chosen option's `id` when a transition target is picked. */
  onSelect?: (id: string | number) => void;
  /** Disables the trigger. Stays colored, dims via opacity. */
  disabled?: boolean;
  /**
   * Transition in flight: the trigger is non-interactive and keeps its color.
   * Announced from a polite live region the component owns — `aria-busy` is
   * also set but reaches no screen reader on its own. The trigger's accessible
   * name does not change (contrast `EntityChip`): you activated this control,
   * so the change is announced rather than folded into the name.
   *
   * No effect in read-only mode (no `options`), which renders no trigger and
   * so has nothing to mark busy.
   */
  busy?: boolean;
}

/** Injectable custom-property pair for a value's resolved color. */
function statusColorStyle(status: PillMenuOption): CSSProperties {
  const { bg, fg } = paletteTokens(resolveStatusColor(status));
  return { '--pill-menu-bg': bg, '--pill-menu-fg': fg } as CSSProperties;
}

/** Renders the optional icon + name, shared by the pill, chip and rows. */
function OptionContent({ option }: { option: PillMenuOption }) {
  return (
    <>
      {option.icon != null && (
        <span className={styles.icon} aria-hidden="true">
          {option.icon}
        </span>
      )}
      {option.name}
    </>
  );
}

/**
 * Coloured value menu: a coloured pill trigger that opens a menu of values,
 * each row fully coloured to its own value — for a workflow status, a task
 * type, a priority, any small categorical value.
 * Composes `<DropdownMenu>` internally. Renders read-only (a static coloured
 * chip, no button) when `options` is omitted or empty.
 *
 * @example
 * // Task status with categories — colors resolve automatically
 * <PillMenu
 *   current={{ id: 'todo', name: 'To do', category: 'to_do' }}
 *   options={[
 *     { id: 'in_progress', name: 'In progress', category: 'in_progress' },
 *     { id: 'done', name: 'Done', category: 'done' },
 *   ]}
 *   onSelect={(id) => updateStatus(task.id, id)}
 * />
 *
 * @example
 * // Per-state custom color override — `color` wins over `category`
 * <PillMenu
 *   current={{ id: 'triage', name: 'Triage', color: 'amber' }}
 *   options={[{ id: 'won', name: 'Won', category: 'won', color: 'emerald' }]}
 *   onSelect={(id) => setStage(id)}
 * />
 *
 * @example
 * // A non-status value with icons and its own accessible label
 * <PillMenu
 *   label="type"
 *   current={{ id: 'bug', name: 'Bug', color: 'red', icon: <Bug size={14} /> }}
 *   options={[{ id: 'story', name: 'Story', color: 'green', icon: <BookOpen size={14} /> }]}
 *   onSelect={(id) => setType(id)}
 * />
 * // trigger is announced "Change type: Bug"
 *
 * @example
 * // Read-only — omit `options` for a static colored chip (no menu)
 * <PillMenu current={{ id: 'done', name: 'Done', category: 'done' }} />
 *
 * @remarks When NOT to use
 * - A single non-status action menu ("Actions", "⋯") — use `<DropdownMenu>`
 *   directly.
 * - Plain non-interactive status display with no transition affordance at
 *   all — use `<Badge>`.
 * - Picking from a long, searchable list of values — use `<Select>`.
 *
 * @remarks Anti-patterns
 * - ❌ A small `<Badge>` wrapped inside a neutral `<Button>` to fake a
 *   colored status trigger — that's exactly what `PillMenu` replaces.
 * - ❌ Raw hex strings in `color`. It's a `PaletteColor` name (`'amber'`,
 *   `'violet'`, …), not a CSS color value.
 * - ❌ Omitting `options` to "disable" the menu. Omitting `options` is
 *   read-only mode (no interactivity at all); for a transition that's
 *   temporarily blocked, keep `options` and pass `disabled` instead.
 */
export const PillMenu = forwardRef<HTMLElement, PillMenuProps>(function PillMenu(
  { current, options, onSelect, label, disabled = false, busy = false, className, style, ...rest },
  ref,
) {
  const t = useTranslation();
  // Deferred for the same reason as Switch: a PillMenu that mounts already
  // busy would otherwise mount its region and text together and announce
  // nothing. See CLAUDE.md Hard rule 10.
  const [busyText, setBusyText] = useState('');
  useEffect(() => {
    setBusyText(busy ? t('pillMenu.busy') : '');
  }, [busy, t]);
  // Component color wins over any consumer `style` — merged AFTER so its
  // `--pill-menu-*` custom properties can't be shadowed by a consumer's
  // own inline style object.
  const mergedStyle: CSSProperties = { ...style, ...statusColorStyle(current) };
  const isBlocked = disabled || busy;

  // DropdownMenu.Trigger clones an unconditional pointerdown/keydown toggle
  // onto the button — a native `disabled` attribute doesn't stop those
  // handlers from running (jsdom, and some browsers, still deliver
  // pointerdown to disabled buttons). Drive `open` explicitly so it's
  // pinned closed while blocked, regardless of what the trigger's own
  // handlers try to do.
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  // If the menu is open and a parent re-render flips busy/disabled true,
  // DropdownMenu never fires onOpenChange for that externally-forced close
  // (the `open` prop just renders false) — so uncontrolledOpen would stay
  // stale-true, and the menu would pop back open with no user action once
  // busy/disabled flips off again. React-sanctioned adjust-state-during-
  // render: reset synchronously, before paint.
  if (isBlocked && uncontrolledOpen) setUncontrolledOpen(false);

  if (!options || options.length === 0) {
    return (
      // {...rest} first so a consumer prop can't collide with the chip's
      // own className/style resolution below.
      <span
        {...rest}
        ref={ref as Ref<HTMLSpanElement>}
        className={clsx(styles.chip, className)}
        style={mergedStyle}
      >
        <OptionContent option={current} />
      </span>
    );
  }

  return (
    <DropdownMenu
      open={isBlocked ? false : uncontrolledOpen}
      onOpenChange={(next) => {
        if (!isBlocked) setUncontrolledOpen(next);
      }}
    >
      <DropdownMenu.Trigger>
        {/* {...rest} first so consumer-supplied props can't override the
            trigger's aria-label / disabled / aria-busy contract. */}
        <button
          {...rest}
          ref={ref as Ref<HTMLButtonElement>}
          type="button"
          className={clsx(styles.trigger, className)}
          style={mergedStyle}
          disabled={isBlocked}
          aria-busy={busy || undefined}
          aria-label={t('pillMenu.change', {
            label: label || t('pillMenu.defaultLabel'),
            name: current.name,
          })}
        >
          <OptionContent option={current} />
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            aria-hidden="true"
            className={styles.chevron}
          >
            <path d="M1 1 L5 5 L9 1" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </button>
      </DropdownMenu.Trigger>
      {/* OUTSIDE the <button> on purpose. `button` is Children Presentational
          in ARIA, so a live region nested inside it is spec'd to be pruned —
          the same argument #496 makes about the Retry button inside
          role="img". Chrome happens to expose it, but relying on that is
          exactly the reasoning that left `aria-busy` shipping for years. The
          trigger also goes `disabled` while busy, which is when this needs to
          speak. */}
      <span role="status" aria-live="polite" className={styles.srOnly}>
        {busyText}
      </span>
      <DropdownMenu.Content>
        {options.map((option) => (
          <DropdownMenu.Item
            key={option.id}
            onSelect={() => onSelect?.(option.id)}
            className={styles.option}
            style={statusColorStyle(option)}
            // The name stays a plain string child: DropdownMenu's typeahead
            // only reads string children, so wrapping it broke type-to-select.
            // The glyph goes in Item's own fixed-size icon slot (aligned rows,
            // item gap) instead.
            icon={option.icon != null ? <span aria-hidden="true">{option.icon}</span> : undefined}
          >
            {option.name}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
});
