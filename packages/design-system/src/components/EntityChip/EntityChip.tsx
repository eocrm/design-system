import {
  Fragment,
  forwardRef,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ElementType,
  type FocusEvent as ReactFocusEvent,
  type ForwardedRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n/useTranslation';
import { paletteTokens, type PaletteColor } from '../../palette';
import { resolveStatusColor, type StatusCategory } from '../_internal/statusColor';
import { chain } from '../_internal/refs';
import { Tooltip } from '../Tooltip';
import styles from './EntityChip.module.scss';

/** Elements EntityChip can render as. All inline-safe phrasing content. */
export type EntityChipAs = ElementType;

/**
 * Font weight for `label` (#590). `'medium'` (default) matches a plain chip
 * and the RichText `@mention`, and applies to `label` only — `prefix` has no
 * weight rule of its own and stays inherited (normal). `'semibold'` is the
 * one value that also sets `prefix`, for designs that want a heavier title —
 * e.g. the segmented task chip, whose key and title are both semibold. See
 * `labelWeight` on `EntityChipOwnProps`.
 */
export type EntityChipLabelWeight = 'medium' | 'semibold';

/**
 * Which end of a clipped `label` is cut (#593). See `labelEllipsis` on
 * `EntityChipOwnProps`.
 */
export type EntityChipLabelEllipsis = 'end' | 'start';

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
 * chip's core (icon · prefix · label · status · trailing). Non-interactive:
 * the chip itself is the link.
 */
export type EntityChipSegment =
  | {
      /** Discriminant: an icon segment — a glyph on a palette colour. */
      kind: 'icon';
      /**
       * The glyph, e.g. a lucide icon. `size` below sizes a direct `<svg>`
       * child only — a wrapped icon (an `<IconTile>`, a styled span) isn't
       * sized by it. Rendered `aria-hidden`; `label` carries the meaning.
       */
      icon: ReactNode;
      /**
       * This segment's accessible name (the segment is `role="img"`) AND its
       * hover tooltip — it IS the segment's meaning, not decoration. An icon
       * segment with no meaningful label is an anti-pattern; a purely
       * decorative glyph belongs in the chip's own `icon` prop instead.
       */
      label: string;
      /** Palette color for the segment's fill/fg pair. Default `'slate'`. */
      color?: PaletteColor;
      /**
       * Overrides the glyph size, a positive number in em of the chip text,
       * at most `1` (larger values are clamped to 1 — a segment never makes
       * the chip taller than a plain chip). Default `0.85em`.
       */
      size?: number;
    }
  | {
      /** Discriminant: a text segment — a short value on a palette colour. */
      kind: 'text';
      /**
       * The segment's text AND its accessible name — this is what a screen
       * reader hears, so the full meaning must live here, not in `tooltip`.
       */
      text: ReactNode;
      /** Palette color for the segment's fill/fg pair. Default `'slate'`. */
      color?: PaletteColor;
      /**
       * Supplementary detail shown on hover only — the segment isn't
       * focusable (focus lands on the chip), and it's never part of the
       * accessible name. Don't put meaning here that isn't also in `text`;
       * keyboard and screen-reader users never see it.
       */
      tooltip?: ReactNode;
      /**
       * Overrides the segment's font size, a positive number in em of the
       * chip text, at most `1` (larger values are clamped to 1). Default
       * `0.9em`. The segment text always sits on the label's baseline and the
       * chip keeps a plain chip's height; a segment larger than the chip's
       * own text would break both, so it isn't supported.
       */
      size?: number;
    };

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
  /**
   * Inline workflow status `{ label, category?, color? }`, separated by a small dot and rendered in the
   * status's own color. `category` (`to_do`/`in_progress`/`open`/`done`/`won`/`lost`) resolves a default
   * palette color (same mapping as `<PillMenu>`); `color` overrides it. The dot takes the resolved color too.
   */
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
   * `status` (nor `before`/`after` segments), so a chip with both goes from
   * "Fix login bug (loading)" to "ENG-5 Fix login bug In progress". That is
   * unavoidable when announcing a transient state through the name, and it is
   * why this was initially left alone. Note it also means a consumer query like
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
   * The full label stays in the DOM, so the accessible name is unchanged. A
   * clipped label shows its full text in a tooltip on hover or keyboard
   * focus — don't add a `title`, which would give a double tooltip.
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
  before?: readonly EntityChipSegment[];
  /** Coloured segments after the core, in order (e.g. priority, status). See `before`. */
  after?: readonly EntityChipSegment[];
  /**
   * Caps the label's width, a positive number of `ch`; past it the label
   * ellipsizes on one line (also on a chip without `truncate`). For chips in
   * running text, where the container edge is a whole paragraph away. The
   * full label stays in the DOM and the accessible name; a clipped label
   * shows it in a tooltip on hover or keyboard focus.
   */
  labelMaxWidth?: number;
  /**
   * Which end of a clipped label is cut. Applies only where the label can
   * clip at all (`truncate`, segments, or `labelMaxWidth`); ignored on a
   * wrapping chip.
   * - `'end'` (default) — `Fix the login bu…`. Right for titles, whose
   *   distinctive part is the start.
   * - `'start'` — `…/pull/1116`. For labels whose distinctive part is the
   *   tail, e.g. a URL path under a host `prefix`. The text keeps its order;
   *   `prefix` and segments stay whole, and the tooltip still shows it all.
   */
  labelEllipsis?: EntityChipLabelEllipsis;
  /**
   * Font weight for `label`. `'medium'` (default) matches a plain chip's
   * fixed weight and the RichText `@mention` — most chips should leave this
   * unset. `'medium'` does NOT apply to `prefix`: `.prefix` carries no
   * font-weight rule of its own and simply inherits (normal), so a default
   * chip's key is lighter than its title. `'semibold'` is the one value that
   * touches BOTH — it sets `prefix` AND `label` to the same heavier weight
   * (a task-chip design that wants its key heavier along with its title,
   * #590). Use `'semibold'` for a design that explicitly wants that.
   *
   * Don't reach for a styled `<Text weight="semibold">` around `label` to get
   * a heavier title instead (see the clipped-label tooltip bullet in `docs/components/EntityChip.md`) —
   * it buys nothing: the clipped-label tooltip reads the label's own
   * `textContent` and always renders it plain, in the tooltip's own color,
   * regardless of what the label node carries. Only this prop changes the
   * rendered weight.
   */
  labelWeight?: EntityChipLabelWeight;
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
 * A segment is at most the chip's own text size (1em). Measured in Chromium:
 * above 1, only the segment grows (the core doesn't stretch), leaving a
 * ragged bottom edge and the segment text below the label's baseline.
 */
function clampSegmentSize(size: number): number {
  return Math.min(size, 1);
}

/**
 * Palette fill/fg for one segment, read by `.segment`, plus an icon segment's
 * `size` override (its glyph size custom property). A text segment's `size`
 * is NOT set here (#591) — it goes on the inner `.segmentTextValue` span
 * instead, so the outer box keeps the chip's own font-size/line-height and
 * its text sits on the label's baseline.
 */
function segmentStyle(segment: EntityChipSegment): CSSProperties {
  const { bg, fg } = paletteTokens(segment.color ?? 'slate');
  const style: Record<string, string> = {
    '--entity-chip-segment-bg': bg,
    '--entity-chip-segment-fg': fg,
  };
  if (segment.kind === 'icon' && segment.size != null) {
    style['--entity-chip-segment-glyph-size'] = `${clampSegmentSize(segment.size)}em`;
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
      {/* Inner span carries the smaller size (#591) — the outer box keeps the
          chip's own font-size/line-height so the strut sets the baseline;
          this span then sits on it via normal inline layout. */}
      <span
        className={styles.segmentTextValue}
        style={
          segment.size != null ? { fontSize: `${clampSegmentSize(segment.size)}em` } : undefined
        }
      >
        {segment.text}
      </span>
    </span>
  );
  return segment.tooltip != null ? <Tooltip content={segment.tooltip}>{node}</Tooltip> : node;
}

/**
 * Inline entity-link chip: icon, muted prefix, name and workflow status in one inline root.
 * @see docs/components/EntityChip.md
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
    labelWeight = 'medium',
    labelEllipsis = 'end',
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
  const hasSegments = (before?.length ?? 0) > 0 || (after?.length ?? 0) > 0;
  const segmented = !loading && !unavailable && hasSegments;
  // Full label on hover, but only when it is actually clipped: a controlled
  // Tooltip that refuses to open otherwise, so a fully visible label gets no
  // tooltip and no aria-describedby (it would be announced twice).
  const labelRef = useRef<HTMLSpanElement>(null);
  const [labelTipOpen, setLabelTipOpen] = useState(false);
  // The clipped-label tooltip's own content (#590, #592): for a STRING
  // `label`, use it directly — always fresh off the prop, so a label that
  // changes while the tooltip is open shows the new text immediately, with
  // no capture step at all. For any other `label` (styled node, icon, …),
  // fall back to plain text captured from the label element's `textContent`
  // when the tooltip opens — this is what keeps a styled label's color/
  // weight from leaking into the tooltip, which reads badly on the dark
  // tooltip background.
  //
  // The captured text falls back to the raw `label` node with `||`, not `??`:
  // Tooltip treats `null`/`undefined`/`''` content as "disabled" (no listeners
  // at all, see Tooltip.tsx), so a captured EMPTY string (a non-string label
  // that renders no text, e.g. an icon) must not stick around as `''` — `??`
  // only falls back on null/undefined and would leave the tooltip
  // permanently disabled from that point on, even after `label` later becomes
  // a long, genuinely clipped string (#592). Storing `null` instead of `''`
  // for an empty capture, and falling back with `||`, means an empty capture
  // always resolves back to the current `label`.
  const [labelTipText, setLabelTipText] = useState<string | null>(null);
  // `hasSegments`, not `segmented`: a loading/unavailable chip with `before`/
  // `after` configured still gets the `truncate` class (below) even though
  // `segmented` itself stays gated off — its label can still be clipped, and
  // should still get a tooltip. Safe for `loading` regardless, since that
  // branch never renders the label Tooltip at all (#582 review).
  const clippable = truncate || hasSegments || labelMaxWidth != null;
  // Whether the label Tooltip is mounted: the loading branch never renders it.
  const labelTip = clippable && !loading;
  // Whenever the label Tooltip unmounts while open (the chip stops being
  // clippable, or starts loading — a refetch under the pointer), nothing is
  // left to close it; reset during render so it can't remount already open.
  if (!labelTip && labelTipOpen) setLabelTipOpen(false);
  const onLabelTip = (next: boolean) => {
    const el = labelRef.current;
    if (next && el != null) setLabelTipText(el.textContent || null);
    setLabelTipOpen(next && el != null && el.scrollWidth > el.clientWidth);
  };
  const labelTipContent = typeof label === 'string' ? label : labelTipText || label;
  // Keyboard reachability for the clipped-label tooltip: its Tooltip trigger
  // is the label `<span>`, which is not itself focusable — focus lands on the
  // chip root. Chain onto the root's own onFocus/onBlur (preserving whatever
  // the consumer passed via `...rest`) so tabbing onto the chip opens the same
  // controlled tooltip `onLabelTip` already opens on hover — only when it is
  // actually clipped, and only when the chip has a clippable label at all.
  // `:focus-visible` gate mirrors Tooltip.tsx's `handleFocus` exactly,
  // including its jsdom fallback (matches() unsupported/throwing → open).
  const restOnFocus = (rest as { onFocus?: (e: ReactFocusEvent<Element>) => void }).onFocus;
  const restOnBlur = (rest as { onBlur?: (e: ReactFocusEvent<Element>) => void }).onBlur;
  // Attached only when `clippable` (below), so no guard here.
  const handleRootFocus = (e: ReactFocusEvent<Element>) => {
    const node = e.currentTarget;
    let focusVisible = true;
    try {
      if (typeof node.matches === 'function') {
        focusVisible = node.matches(':focus-visible');
      }
    } catch {
      focusVisible = true;
    }
    if (!focusVisible) return;
    onLabelTip(true);
  };
  const handleRootBlur = () => onLabelTip(false);
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
          {prefix && (
            <span className={clsx(styles.prefix, labelWeight === 'semibold' && styles.semibold)}>
              {prefix}
            </span>
          )}
          {/* Wrapper keeps the name a single flex item (matters when `label`
              is itself multiple nodes — e.g. a fragment) so the chip's `gap`
              doesn't insert extra space inside the name. No longer scopes
              hover styling (the fake-bold rule was dropped, see #345). */}
          {labelTip ? (
            <Tooltip content={labelTipContent} open={labelTipOpen} onOpenChange={onLabelTip}>
              <span
                ref={labelRef}
                className={clsx(
                  styles.label,
                  labelWeight === 'semibold' && styles.semibold,
                  labelMaxWidth != null && styles.capped,
                  labelEllipsis === 'start' && styles.ellipsisStart,
                )}
                style={labelMaxWidth != null ? { maxWidth: `${labelMaxWidth}ch` } : undefined}
              >
                {/* `ellipsisStart` flips the span to RTL so the overflow (and
                    its ellipsis) falls at the start; this isolated LTR run
                    keeps the text itself in order — without it, trailing
                    neutrals like `/` or `?` would hop to the other end. */}
                {labelEllipsis === 'start' ? <span dir="ltr">{label}</span> : label}
              </span>
            </Tooltip>
          ) : (
            <span className={clsx(styles.label, labelWeight === 'semibold' && styles.semibold)}>
              {label}
            </span>
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
        // Only the one-line (truncate) layout is kept while loading/unavailable
        // drops the segments themselves — nothing about the segments is
        // reserved, but a list row must still not reflow from one line to
        // wrapping, so the single-line class applies whenever segments are
        // configured, even though `segmented` itself stays gated to the
        // normal state (#582 review).
        (truncate || hasSegments) && styles.truncate,
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
      // The clipped-label tooltip's focus/blur handlers only when the label can
      // clip; otherwise {...rest} above already passed the consumer's own
      // onFocus/onBlur through untouched. (Behaviourally equivalent to always
      // attaching — onLabelTip can't open without a clipped label — but it
      // keeps a non-clipping chip's handlers exactly the consumer's.)
      {...(clippable
        ? {
            onFocus: chain(restOnFocus, handleRootFocus),
            onBlur: chain(restOnBlur, handleRootBlur),
          }
        : null)}
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
