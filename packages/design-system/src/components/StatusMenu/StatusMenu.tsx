import { forwardRef, useState, type CSSProperties, type HTMLAttributes, type Ref } from 'react';
import clsx from 'clsx';
import { DropdownMenu } from '../DropdownMenu';
import { paletteTokens, type PaletteColor } from '../../palette';
import { useTranslation } from '../../i18n/useTranslation';
import { resolveStatusColor, type StatusCategory } from '../_internal/statusColor';
import styles from './StatusMenu.module.scss';

/** Workflow status category — maps to a default palette color. */
export type StatusMenuCategory = StatusCategory;

/** One status: current value or a transition target. */
export interface StatusMenuStatus {
  /** Stable id — passed to `onSelect` when this option is chosen. */
  id: string | number;
  /** Visible status name. */
  name: string;
  /** Semantic category → default color: to_do slate / in_progress blue / open violet / done green / won green / lost red. */
  category?: StatusMenuCategory;
  /** Explicit palette color — wins over `category` (per-state custom colors). */
  color?: PaletteColor;
}

export interface StatusMenuProps extends Omit<HTMLAttributes<HTMLElement>, 'onSelect'> {
  /** The status currently shown on the trigger (or the read-only chip). */
  current: StatusMenuStatus;
  /**
   * Transition targets, offered in the dropdown. Omitted or empty renders
   * read-only mode: a static colored chip with no button, no menu, no
   * aria-haspopup.
   */
  options?: StatusMenuStatus[];
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
   */
  busy?: boolean;
}

/** Injectable custom-property pair for a status's resolved color. */
function statusColorStyle(status: StatusMenuStatus): CSSProperties {
  const { bg, fg } = paletteTokens(resolveStatusColor(status));
  return { '--status-menu-bg': bg, '--status-menu-fg': fg } as CSSProperties;
}

/**
 * Status-transition dropdown: a colored pill trigger that opens a menu of
 * transition targets, each row fully colored to its own status. Composes
 * `<DropdownMenu>` internally. Renders read-only (a static colored chip, no
 * button) when `options` is omitted or empty.
 *
 * @example
 * // Task status with categories — colors resolve automatically
 * <StatusMenu
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
 * <StatusMenu
 *   current={{ id: 'triage', name: 'Triage', color: 'amber' }}
 *   options={[{ id: 'won', name: 'Won', category: 'won', color: 'emerald' }]}
 *   onSelect={(id) => setStage(id)}
 * />
 *
 * @example
 * // Read-only — omit `options` for a static colored chip (no menu)
 * <StatusMenu current={{ id: 'done', name: 'Done', category: 'done' }} />
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
 *   colored status trigger — that's exactly what `StatusMenu` replaces.
 * - ❌ Raw hex strings in `color`. It's a `PaletteColor` name (`'amber'`,
 *   `'violet'`, …), not a CSS color value.
 * - ❌ Omitting `options` to "disable" the menu. Omitting `options` is
 *   read-only mode (no interactivity at all); for a transition that's
 *   temporarily blocked, keep `options` and pass `disabled` instead.
 */
export const StatusMenu = forwardRef<HTMLElement, StatusMenuProps>(function StatusMenu(
  { current, options, onSelect, disabled = false, busy = false, className, style, ...rest },
  ref,
) {
  const t = useTranslation();
  // Component color wins over any consumer `style` — merged AFTER so its
  // `--status-menu-*` custom properties can't be shadowed by a consumer's
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
        {current.name}
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
          aria-label={`${t('statusMenu.changeStatus')}: ${current.name}`}
        >
          {current.name}
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
        {busy ? t('statusMenu.busy') : ''}
      </span>
      <DropdownMenu.Content>
        {options.map((option) => (
          <DropdownMenu.Item
            key={option.id}
            onSelect={() => onSelect?.(option.id)}
            className={styles.option}
            style={statusColorStyle(option)}
          >
            {option.name}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
});
