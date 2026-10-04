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
   * (~14px lucide icon), at most 16px: menu rows place it in DropdownMenu's
   * fixed 16px icon slot.
   */
  icon?: ReactNode;
  /** Semantic category → default color: to_do slate / in_progress blue / open violet / done green / won green / lost red. */
  category?: PillMenuCategory;
  /** Explicit palette color — wins over `category` (per-state custom colors). */
  color?: PaletteColor;
}

// `aria-labelledby` is omitted: the trigger's name is component-owned (see
// `label`), and aria-labelledby would override it. TS doesn't excess-check
// hyphenated JSX attributes, so this is documentation — it's also stripped
// at runtime.
export interface PillMenuProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'onSelect' | 'aria-labelledby'
> {
  /** The value currently shown on the trigger (or the read-only chip). */
  current: PillMenuOption;
  /**
   * What the value IS, for the trigger's accessible name: `label="type"` →
   * "Change type: Bug". Default: the localized "status" ("Change status: …").
   * Pass it as it reads right after "Change" / "Изменить", lower-case, in the
   * UI's language — it is data, not a translatable string. In ru that is the
   * accusative: `label="категорию"`, not "категория".
   *
   * Inside a `<Field>`, pass the field's label here (`label="priority"` under
   * "Priority"): the trigger keeps its own name, so the visible field label
   * reaches AT only through this (WCAG 2.5.3). A dev warning fires if it's
   * missing there.
   */
  label?: string;
  /**
   * Visible caption rendered inside the pill before the value, separated by a
   * middle dot: `caption="Pipeline"` → "Pipeline · Faeton". For a trigger
   * that must say both what it picks and the current value.
   *
   * Visual only — it does NOT name the trigger: `label` remains the
   * accessible name ("Change pipeline: Faeton"). For WCAG 2.5.3
   * (label-in-name) the caption's words should appear in `label`, so a
   * voice user can say what they see. In the read-only chip (no accessible
   * name override) the caption text is read along with the value; the dot is
   * `aria-hidden` in both. Muted by weight (regular vs the value's medium),
   * not colour: the palette fills leave no contrast headroom for a dimmer
   * foreground. Omitted → no caption, no dot.
   */
  caption?: ReactNode;
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
  /**
   * Stretch the trigger (or read-only chip) to its container's width, for a
   * form column of full-width controls (`Input`, `Select`, `DatePicker` in
   * vertical `Field`s). Icon + name stay at the start, the chevron moves to
   * the end edge like a `Select` trigger, and the menu is at least as wide as
   * the trigger. Keeps the full-colour fill. Defaults to `false`
   * (content-width pill).
   */
  fullWidth?: boolean;
  /**
   * Error state — sets `aria-invalid` on the trigger. `<Field error>` injects
   * it for you. No visual change: the fill IS the value's colour, and the
   * Field's error text carries the error. The read-only chip ignores it (a
   * non-focusable chip isn't a control AT can report invalid).
   */
  invalid?: boolean;
}

/** Injectable custom-property pair for a value's resolved color. */
function statusColorStyle(status: PillMenuOption): CSSProperties {
  const { bg, fg } = paletteTokens(resolveStatusColor(status));
  return { '--pill-menu-bg': bg, '--pill-menu-fg': fg } as CSSProperties;
}

/** Renders the optional caption + icon + name, shared by the pill and the read-only chip (rows use Item's icon slot). */
function OptionContent({ option, caption }: { option: PillMenuOption; caption?: ReactNode }) {
  return (
    <>
      {caption != null && (
        <>
          <span className={styles.caption}>{caption}</span>
          <span className={styles.caption} aria-hidden="true">
            ·
          </span>
        </>
      )}
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
 * Coloured value menu: a coloured pill trigger opening a menu of values (status, type, priority); read-only chip when `options` is omitted.
 * @see docs/components/PillMenu.md
 */
export const PillMenu = forwardRef<HTMLElement, PillMenuProps>(function PillMenu(
  {
    current,
    options,
    onSelect,
    label,
    caption,
    disabled = false,
    busy = false,
    fullWidth = false,
    invalid = false,
    className,
    style,
    ...props
  },
  ref,
) {
  // Inside a <Field>, auto-wiring also injects `required` (not valid on a
  // button — there's no aria-required for it) and `aria-labelledby`, which
  // would OVERRIDE the component-owned name: "Change type: Bug" would read
  // as the bare field label "Type", dropping the current value. Neither
  // reaches the DOM; `label` names the value instead. `id` and
  // `aria-describedby` (the error/help text) do pass through.
  const {
    required: _required,
    'aria-labelledby': fieldLabelledBy,
    ...rest
  } = props as typeof props & { required?: boolean; 'aria-labelledby'?: string };
  const t = useTranslation();
  // Trigger mode only: the read-only chip has no name for `label` to fix.
  // A boolean dep, not `options` — callers pass a fresh array every render.
  const hasTrigger = options != null && options.length > 0;
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && hasTrigger && fieldLabelledBy && !label) {
      // eslint-disable-next-line no-console
      console.warn(
        '<PillMenu> received `aria-labelledby` (e.g. inside a <Field>) but no `label`. `aria-labelledby` is ignored — the trigger keeps its own name ("Change status: …") — so unless the field label is "status", it doesn\'t reach assistive tech. Pass `label` (e.g. label="priority").',
      );
    }
  }, [fieldLabelledBy, label, hasTrigger]);
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

  if (!hasTrigger) {
    return (
      // {...rest} first so a consumer prop can't collide with the chip's
      // own className/style resolution below.
      <span
        {...rest}
        ref={ref as Ref<HTMLSpanElement>}
        className={clsx(styles.chip, fullWidth && styles.fullWidth, className)}
        style={mergedStyle}
      >
        <OptionContent option={current} caption={caption} />
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
          className={clsx(styles.trigger, fullWidth && styles.fullWidth, className)}
          style={mergedStyle}
          disabled={isBlocked}
          aria-busy={busy || undefined}
          aria-invalid={invalid || undefined}
          aria-label={t('pillMenu.change', {
            label: label || t('pillMenu.defaultLabel'),
            name: current.name,
          })}
        >
          <OptionContent option={current} caption={caption} />
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
