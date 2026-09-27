import {
  Fragment,
  forwardRef,
  useRef,
  useState,
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
import { Tooltip } from '../Tooltip';
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

/**
 * A coloured part of a segmented chip (#582), rendered before or after the
 * chip's core (icon · prefix · label · status · trailing).
 * - `icon` — a glyph on a palette colour. `label` is its accessible name (the
 *   segment is `role="img"`) and its tooltip; the glyph is sized to the text.
 * - `text` — a short value (e.g. a status) on a palette colour, same weight as
 *   the label, with an optional `tooltip`.
 * `color` defaults to `'slate'`. `size` (in em of the chip text) overrides
 * the glyph size (icon, default 0.85em) or the font size (text, default
 * 0.9em). Non-interactive: the chip is the link.
 */
export type EntityChipSegment =
  | { kind: 'icon'; icon: ReactNode; label: string; color?: PaletteColor; size?: number }
  | { kind: 'text'; text: ReactNode; color?: PaletteColor; tooltip?: ReactNode; size?: number };

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
   *
   * The state is announced: a localized word is rendered visually hidden, so a
   * linked chip's name becomes "Appointment (loading)". `aria-busy` alone did
   * not do this. It is a GLOBAL ARIA state, so unlike `aria-disabled` it is
   * perfectly valid on the chip's role-less span and browsers do expose it —
   * but no mainstream screen reader conveys `busy` as a state on a non-live
   * element, and the ellipsis is `aria-hidden`. The label reached the user
   * fine; no signal of the LOADING STATE did.
   *
   * Know the trade: the accessible name CHANGES when loading resolves — and by
   * more than this word. The loading branch renders neither `prefix` nor
   * `status`, so a chip with both goes from "Fix login bug (loading)" to
   * "ENG-5 Fix login bug In progress". That is unavoidable when announcing a
   * transient state through the name, and it is why this was initially left
   * alone. Note it also means a consumer query like
   * `getByRole('link', { name: 'Appointment' })` no longer matches a LOADING
   * chip.
   *
   * Measured, the mutation itself is benign: Chromium keeps the SAME
   * accessibility node across the transition (same backendNodeId) and focus
   * survives, so nothing is torn down and rebuilt — the name and `busy` simply
   * change on the existing object.
   *
   * The alternative — an `aria-live` region — has to be owned by the consumer,
   * because only the consumer knows whether a given chip resolving is worth
   * interrupting someone for. To take that route, override this word to `''`
   * at your TOP-LEVEL provider: the override is global to a provider subtree
   * (there is no per-chip opt-out), `I18nProvider` requires a `locale`, and a
   * nested provider replaces rather than extends its parent — so wrapping a
   * single chip would silently discard every other override you have set.
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
   * either: browsers do expose it, but it carries no meaning on a
   * non-widget role such as `generic`, so no assistive tech conveys it.
   *
   * `loading` is announced the same way — see that prop for why `aria-busy`
   * alone was not enough, and for the name-mutation trade it carries.
   *
   * Do NOT put an `aria-label` on the chip. It replaces the whole name and
   * takes the state word with it; the state lives in the chip's contents.
   *
   * Override the word via the i18n provider (`entityChip.unavailable`); it
   * carries its own punctuation so a locale can choose different marks.
   */
  unavailable?: boolean;
  /**
   * Single-line mode for list rows. The chip is capped at its container's
   * width (`max-width: 100%`, `min-width: 0`, so it also shrinks as a flex
   * item) and only the `label` ellipsizes — `icon`, `prefix`, `status` and
   * `trailing` keep their full size. Default `false`: the label wraps, which
   * is right for a chip inside running text.
   *
   * The full label stays in the DOM, so the accessible name is unchanged; a
   * sighted user sees the rest on the entity's own page (or add a `title`).
   */
  truncate?: boolean;
  /**
   * Extra adornments inside the chip, after `status` (e.g. a priority icon or
   * a status `<Badge>`), kept at full size under `truncate`. Not rendered
   * while `loading` (same as `prefix`/`status`).
   *
   * Non-interactive content only: the chip is itself a link, so a button or
   * link here is invalid nested interactive content. Its text JOINS the chip's
   * accessible name ("ENG-5 Fix login bug High") — give a decorative icon
   * `aria-hidden`, and a meaningful one a short text alternative.
   */
  trailing?: ReactNode;
  /**
   * Coloured segments before the chip's core, in order (e.g. the task type).
   * Any segment turns the chip segmented: one line, only the outer corners
   * rounded, only the label shrinks (as with `truncate`). Every segment's text
   * joins the accessible name ("Bug ENG-15 Fix login bug Normal Reported").
   * Not rendered while `loading` or `unavailable`.
   */
  before?: EntityChipSegment[];
  /** Coloured segments after the core, in order (e.g. priority, status). See `before`. */
  after?: EntityChipSegment[];
  /**
   * Caps the label's width, in `ch`; past it the label ellipsizes on one line
   * (also on a chip without `truncate`). For chips in running text, where the
   * container edge is a whole paragraph away. The full label stays in the DOM
   * and the accessible name; hovering a clipped label shows it in a tooltip.
   */
  labelMaxWidth?: number;
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

/** Palette fill/fg for one segment, read by `.segment`, plus its `size` override. */
function segmentStyle(segment: EntityChipSegment): CSSProperties {
  const { bg, fg } = paletteTokens(segment.color ?? 'slate');
  const style: Record<string, string> = {
    '--entity-chip-segment-bg': bg,
    '--entity-chip-segment-fg': fg,
  };
  if (segment.size != null) {
    if (segment.kind === 'icon') style['--entity-chip-segment-glyph-size'] = `${segment.size}em`;
    else style.fontSize = `${segment.size}em`;
  }
  return style as CSSProperties;
}

function Segment({ segment }: { segment: EntityChipSegment }): ReactElement {
  if (segment.kind === 'icon') {
    return (
      <Tooltip content={segment.label}>
        <span
          className={clsx(styles.segment, styles.segmentIcon)}
          style={segmentStyle(segment)}
          role="img"
          aria-label={segment.label}
        >
          <span className={styles.segmentGlyph} aria-hidden="true">
            {segment.icon}
          </span>
        </span>
      </Tooltip>
    );
  }
  const node = (
    <span className={clsx(styles.segment, styles.segmentText)} style={segmentStyle(segment)}>
      {segment.text}
    </span>
  );
  return segment.tooltip != null ? <Tooltip content={segment.tooltip}>{node}</Tooltip> : node;
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
 * @example
 * // One-line list row: label ellipsizes, key/status/adornments stay whole
 * <EntityChip
 *   truncate
 *   href="/tasks/5"
 *   icon={<CheckSquareIcon />}
 *   prefix="ENG-5"
 *   label="Fix the login bug that only happens on Safari"
 *   status={{ label: 'In progress', category: 'in_progress' }}
 *   trailing={<ArrowUpIcon aria-label="High priority" />}
 * />
 *
 * @remarks When NOT to use
 * - Plain status display with no linked entity → use `<Badge>` or `<PillMenu>`.
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
 * - ❌ Interactive content (a `<Button>`, a `<Link>`, a menu) in `trailing` —
 *   the chip is a link, so it would be nested interactive content. Put
 *   row actions beside the chip, not inside it.
 * - ❌ `truncate` on a chip inside running text — it exists for list rows;
 *   in a sentence the label should wrap.
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
    truncate = false,
    trailing,
    before,
    after,
    labelMaxWidth,
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
  // Segments only in the normal state — like prefix/status under `loading`, a
  // not-yet-loaded or unavailable entity has no known type/status (#582).
  const segmented =
    !loading && !unavailable && ((before?.length ?? 0) > 0 || (after?.length ?? 0) > 0);
  // Full label on hover, but only when it is actually clipped: a controlled
  // Tooltip that refuses to open otherwise, so a fully visible label gets no
  // tooltip and no aria-describedby (it would be announced twice).
  const labelRef = useRef<HTMLSpanElement>(null);
  const [labelTipOpen, setLabelTipOpen] = useState(false);
  const clippable = segmented || truncate || labelMaxWidth != null;
  const onLabelTip = (next: boolean) => {
    const el = labelRef.current;
    setLabelTipOpen(next && el != null && el.scrollWidth > el.clientWidth);
  };
  // The state as real text, not just muted colour. Browsers do expose
  // `aria-disabled`, but it carries no meaning on a non-widget role such as
  // `generic`, so no AT conveys it — without this the state reached nobody using a screen reader,
  // and an `unavailable` chip labelled with a type word ("Appointment") was
  // indistinguishable from a real entity of that name. Rendered for linked
  // chips too: muted styling is the sole signal there as well.
  //
  // The leading space is for `textContent` only — it is what selection/copy
  // yields, and what the tests assert. It reaches no accessible name in either
  // engine: measured, the space never renders (line-leading in this block box,
  // so it collapses — 0.000px delta), Chromium supplies its own separator
  // between the block-level children, and `dom-accessibility-api` drops it too.
  // A sibling text node would be equivalent and would NOT take the chip's `gap`
  // (a whitespace-only flex item is not rendered at all); keeping it inside
  // just leaves the chip's children all elements. Same shape as Field's
  // "(optional)".
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

  const content = (
    <>
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
          {/* The busy state as real text. `aria-busy` is set on the chip root
              above and is valid there — unlike `aria-disabled` it is a GLOBAL
              ARIA state, so the role-less span is not the problem. But no
              mainstream screen reader conveys `busy` on a non-live element, so
              the aria-hidden ellipsis was the only signal. Placed after the
              label and before the unavailable word so a chip carrying both
              reads "Appointment (loading) (unavailable)". */}
          <span className={styles.hiddenLabel}> {t('entityChip.loading')}</span>
          {stateWord}
        </>
      ) : (
        <>
          {prefix && <span className={styles.prefix}>{prefix}</span>}
          {/* Wrapper keeps the name a single flex item (matters when `label`
              is itself multiple nodes — e.g. a fragment) so the chip's `gap`
              doesn't insert extra space inside the name. No longer scopes
              hover styling (the fake-bold rule was dropped, see #345). */}
          {clippable ? (
            <Tooltip content={label} open={labelTipOpen} onOpenChange={onLabelTip}>
              <span
                ref={labelRef}
                className={clsx(styles.label, labelMaxWidth != null && styles.capped)}
                style={labelMaxWidth != null ? { maxWidth: `${labelMaxWidth}ch` } : undefined}
              >
                {label}
              </span>
            </Tooltip>
          ) : (
            <span className={styles.label}>{label}</span>
          )}
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
          {trailing != null && <span className={styles.trailing}>{trailing}</span>}
        </>
      )}
    </>
  );

  return (
    <Component
      ref={ref}
      style={rootStyle(color, status, style)}
      className={clsx(
        styles.chip,
        unavailable && styles.unavailable,
        truncate && styles.truncate,
        segmented && styles.segmented,
        className,
      )}
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
      {segmented ? (
        <>
          {/* A space after/before each part keeps the accessible name
              "Bug ENG-15 … Normal Reported" separated in every engine, not
              only where blockified flex items get a separator. Whitespace-only
              text between flex items isn't rendered, so layout is unchanged. */}
          {before?.map((segment, i) => (
            <Fragment key={`b${i}`}>
              <Segment segment={segment} />{' '}
            </Fragment>
          ))}
          <span className={styles.core}>{content}</span>
          {after?.map((segment, i) => (
            <Fragment key={`a${i}`}>
              {' '}
              <Segment segment={segment} />
            </Fragment>
          ))}
        </>
      ) : (
        content
      )}
    </Component>
  );
}) as EntityChipComponent;
