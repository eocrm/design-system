import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ElementType,
  type ForwardedRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n/useTranslation';
import { paletteTokens, type PaletteColor } from '../../palette';
import { resolveStatusColor, type StatusCategory } from '../_internal/statusColor';
import styles from './EntityChip.module.scss';

/** Elements EntityChip can render as. All inline-safe phrasing content. */
export type EntityChipAs = ElementType;

export interface EntityChipStatus {
  /** Status label, rendered inside the chip in the status's own color. */
  label: string;
  /** Semantic category → default color: to_do slate / in_progress blue / open violet / done green / won green / lost red. */
  category?: StatusCategory;
  /** Explicit palette color — wins over `category` (per-state custom colors). */
  color?: PaletteColor;
}

interface EntityChipOwnProps {
  /** Leading icon — consumer passes the element (e.g. a lucide icon). Rendered aria-hidden. */
  icon?: ReactNode;
  /**
   * Entity name. Optional at the type level only to satisfy the polymorphic
   * `forwardRef` generic (same workaround `<Rail.Item>` documents on its
   * `children`); in practice every chip needs a label.
   */
  label?: ReactNode;
  /** Muted leading run before the name (e.g. task key `ENG-5`). */
  prefix?: ReactNode;
  /** Inline workflow status, separated by a small dot and rendered in the status's own color. */
  status?: EntityChipStatus;
  /**
   * Optional categorical palette color for the chip fill. When set, takes
   * precedence over the default accent chip tokens: the chip fills with the
   * matching `--color-palette-<name>-bg/-fg` pair (same contract as `Badge
   * color` — picking a readable pair is the consumer's call). Omit for the
   * default fill, which matches RichText's `@mention` styling
   * (`--color-accent-bg-subtle` / `--color-accent`) so a chip and a rendered
   * mention read as the same visual object. The `status` run keeps its own
   * resolved color independent of this prop, and `unavailable` still mutes
   * the label/status text over any `color`.
   */
  color?: PaletteColor;
  /** Renders `as="a"` with this href when `as` is omitted. */
  href?: string;
  /**
   * Loading placeholder: icon slot + `…` body, aria-busy; the label stays in
   * the DOM visually hidden so the chip keeps its accessible name. Purely
   * visual — with a link target (`href`/`as`) the chip stays a live,
   * keyboard-reachable link while loading.
   */
  loading?: boolean;
  /**
   * Entity missing/no access: muted styling. With a link target (`href`/`as`)
   * the chip remains a real link — unavailable is a visual state, not a
   * disabling one. Only a target-less chip (bare span) becomes non-interactive
   * with aria-disabled.
   *
   * The state is also announced: a localized word is rendered visually hidden
   * inside the chip. A linked chip's accessible name becomes
   * "Appointment (unavailable)"; a target-less chip is `role=generic`, which
   * has no accessible name at all, so the word is announced as part of the
   * chip's text in reading order. Either way it reaches the user.
   *
   * That matters because the canonical use is to withhold the entity's name and
   * show a TYPE word instead — without the state, a masked reference is
   * indistinguishable from a real entity that happens to be called
   * "Appointment". Colour alone cannot carry it, and `aria-disabled` does not
   * either: browsers do expose it, but it carries no meaning on a role-less
   * element, so no assistive tech conveys it to the user.
   *
   * `aria-busy` on `loading` has the same limitation and is deliberately left
   * alone: a loading chip shows the entity's REAL label, so nothing is
   * misrepresented, and the state is transient — folding it into the name would
   * make the name mutate when it resolves.
   *
   * Do NOT put an `aria-label` on the chip. It replaces the whole name and
   * takes the state word with it; the state lives in the chip's contents.
   *
   * Override the word via the i18n provider (`entityChip.unavailable`); it
   * carries its own punctuation so a locale can choose different marks.
   */
  unavailable?: boolean;
}

/**
 * Polymorphic props helper. Intersects the component's own props with the
 * underlying element's props (minus what we own), plus the `as` selector.
 * Mirrors `<Link>`'s `PolymorphicProps`.
 */
type PolymorphicProps<C extends ElementType, P> = P & { as?: C } & Omit<
    ComponentPropsWithoutRef<C>,
    keyof P | 'as'
  >;

/**
 * Public EntityChip prop type. Generic `C` defaults to `'a'`. When the
 * consumer passes `as={SomeComponent}`, all of SomeComponent's props become
 * available with full TypeScript inference (including `to`, `replace`,
 * `state`, etc. for `react-router-dom`'s `<Link>`).
 */
export type EntityChipProps<C extends ElementType = 'a'> = PolymorphicProps<C, EntityChipOwnProps>;

/**
 * Internal ref type for the polymorphic generic. React's `forwardRef` strips
 * the generic from the returned component, so we re-attach it via the
 * `EntityChipComponent` cast on the export below.
 */
type EntityChipComponent = <C extends ElementType = 'a'>(
  props: EntityChipProps<C> & { ref?: ComponentPropsWithRef<C>['ref'] },
) => ReactElement | null;

/** Injectable custom-property for a status's resolved color. */
function statusColorStyle(status: EntityChipStatus): CSSProperties {
  const { fg } = paletteTokens(resolveStatusColor(status));
  return { '--entity-chip-status-fg': fg } as CSSProperties;
}

/** Injectable custom-properties for a consumer `color` override — same
 * inline-injection contract as `Badge color`. Points bg-hover at the same
 * bg so the hover brightness filter works on any palette color. */
function colorStyle(color: PaletteColor): CSSProperties {
  return {
    '--entity-chip-bg': `var(--color-palette-${color}-bg)`,
    '--entity-chip-fg': `var(--color-palette-${color}-fg)`,
    '--entity-chip-bg-hover': `var(--color-palette-${color}-bg)`,
  } as CSSProperties;
}

/**
 * Merged inline style for the chip root: the `color` prop's palette
 * injection, the `status`'s resolved color (read by both `.status` and
 * `.dot` — set on the root, not the `.status` span, so the dot — a sibling,
 * not a descendant of `.status` — can see it too), then the consumer's own
 * `style` last so it wins on a collision.
 */
function rootStyle(
  color: PaletteColor | undefined,
  status: EntityChipStatus | undefined,
  consumerStyle: CSSProperties | undefined,
): CSSProperties | undefined {
  const colorVars = color ? colorStyle(color) : undefined;
  const statusVars = status ? statusColorStyle(status) : undefined;
  return colorVars || statusVars || consumerStyle
    ? { ...colorVars, ...statusVars, ...consumerStyle }
    : undefined;
}

/**
 * Inline entity-link chip: an optional icon, an optional muted prefix (e.g.
 * a task key), the entity's name, and an optional workflow status shown in
 * its own color — all spans inside a single inline root, safe to drop
 * directly inside a `<p>`. An EntityChip is canonically a link to its entity:
 * pass `href` (renders `<a>`) or `as` (router-aware navigation). The bare
 * `<span>` form is for rare non-navigable contexts only.
 *
 * @example
 * // Inline usage inside a sentence
 * <p>Reassigned <EntityChip icon={<UserIcon />} label="Priya Shah" /> to this deal.</p>
 *
 * @example
 * // RouterLink via `as`
 * import { Link as RouterLink } from 'react-router-dom';
 * <EntityChip as={RouterLink} to="/tasks/5" prefix="ENG-5" label="Fix login bug" />
 *
 * @example
 * // Status + custom color override
 * <EntityChip
 *   href="/deals/9"
 *   label="Acme Corp"
 *   status={{ label: 'At risk', color: 'amber' }}
 * />
 *
 * @example
 * // Loading / unavailable states — still live links with a target
 * <EntityChip href="/contacts/7" label="Contact" loading />
 * <EntityChip href="/contacts/9" label="Deleted contact" unavailable />
 *
 * @example
 * // Categorical `color` override — the chip fill itself, independent of `status`
 * <EntityChip href="/deals/9" label="Acme Corp" color="violet" />
 *
 * @remarks When NOT to use
 * - Plain status display with no linked entity → use `<Badge>` or `<StatusMenu>`.
 * - Standalone navigation with no entity chrome (icon/prefix/status) → use `<Link>`.
 * - Removable filter pills → use `<FilterChip>`.
 *
 * @remarks Anti-patterns
 * - ❌ Composing a `<Badge>` inside another `<Badge>` to fake an entity-with-status
 *   chip — that composition is exactly what `EntityChip` replaces.
 * - ❌ Putting block-level children (e.g. a `<div>`) inside `label`/`prefix` —
 *   the inline-safety contract requires span-only content.
 * - ❌ Raw hex strings in `status.color` or the chip's own `color`. Both are
 *   `PaletteColor` names (`'amber'`, `'violet'`, …), not CSS color values.
 * - ❌ Omitting a link target — an EntityChip should always link to its
 *   entity (`href` or `as`); the span-only form is for rare non-navigable
 *   contexts.
 */
export const EntityChip = forwardRef(function EntityChip<C extends ElementType = 'a'>(
  {
    as,
    icon,
    label,
    prefix,
    status,
    color,
    href,
    loading = false,
    unavailable = false,
    className,
    style,
    ...rest
  }: EntityChipProps<C>,
  ref: ForwardedRef<Element>,
) {
  // A link target (`as` or `href`) always wins: loading/unavailable are then
  // purely visual states on a live, keyboard-reachable link. Only a bare span
  // (no target) becomes genuinely non-interactive when unavailable.
  const t = useTranslation();
  const Component = (as ?? (href ? 'a' : 'span')) as ElementType;
  const bareSpan = !as && !href;
  const inert = unavailable && bareSpan;
  // The state as real text, not just muted colour. Browsers do expose
  // `aria-disabled`, but it carries no meaning on a role-less element, so no AT
  // conveys it — without this the state reached nobody using a screen reader,
  // and an `unavailable` chip labelled with a type word ("Appointment") was
  // indistinguishable from a real entity of that name. Rendered for linked
  // chips too: muted styling is the sole signal there as well.
  //
  // The leading space lives INSIDE the span — never as a sibling text node,
  // which would become an anonymous flex item and take the chip's `gap` — so
  // the separation is deterministic rather than left to each engine's
  // accessible-name whitespace rule. Same shape as Field's "(optional)".
  //
  // Defined once, rendered in both branches so it can sit immediately after the
  // entity name. Trailing the status instead gave "Appointment In progress
  // (unavailable)", where the parenthetical can be heard as qualifying the
  // STATUS rather than the entity. Out of flow, so placing it costs no layout.
  const stateWord = unavailable ? (
    <span className={styles.hiddenLabel}> {t('entityChip.unavailable')}</span>
  ) : null;
  const elementProps: { href?: string; type?: string } = {};
  if (Component === 'a') elementProps.href = href;
  if (Component === 'button') elementProps.type = 'button';

  return (
    <Component
      ref={ref}
      style={rootStyle(color, status, style)}
      className={clsx(styles.chip, unavailable && styles.unavailable, className)}
      {...elementProps}
      {...rest}
      // A target-less unavailable chip is non-interactive — cancel any
      // consumer onClick that {...rest} just spread on above, so it can't
      // fire through a chip keyboard users have no way to reach (Pattern B).
      {...(inert ? { onClick: undefined } : null)}
      // Component-owned ARIA state must survive whatever the consumer passes
      // via {...rest} — aria-busy/aria-disabled are the component's contract.
      aria-busy={loading || undefined}
      aria-disabled={inert || undefined}
    >
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      {loading ? (
        <>
          <span className={styles.ellipsis} aria-hidden="true">
            …
          </span>
          {/* Label stays in the DOM visually hidden so a linked loading chip
              keeps its accessible name instead of being announced as "…". */}
          <span className={styles.hiddenLabel}>{label}</span>
          {stateWord}
        </>
      ) : (
        <>
          {prefix && <span className={styles.prefix}>{prefix}</span>}
          {/* Wrapper keeps the name a single flex item (matters when `label`
              is itself multiple nodes — e.g. a fragment) so the chip's `gap`
              doesn't insert extra space inside the name. No longer scopes
              hover styling (the fake-bold rule was dropped, see #345). */}
          <span className={styles.label}>{label}</span>
          {stateWord}
          {status && (
            <>
              {/* Separator dot is its own flex item so the chip's `gap` spaces
                  it symmetrically between name and status. A solid circle, not
                  a font glyph — exact size, no line-box inflation. Colored via
                  --entity-chip-status-fg, set on the chip root above (rootStyle). */}
              <span className={styles.dot} aria-hidden="true" />
              <span className={styles.status}>{status.label}</span>
            </>
          )}
        </>
      )}
    </Component>
  );
}) as EntityChipComponent;
