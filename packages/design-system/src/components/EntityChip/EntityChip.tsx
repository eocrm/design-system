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
  /** Inline workflow status, shown as `· <label>` in the status's own color. */
  status?: EntityChipStatus;
  /** Renders `as="a"` with this href when `as` is omitted. */
  href?: string;
  /** Loading placeholder: icon slot + `…` body, aria-busy, non-interactive. */
  loading?: boolean;
  /** Entity missing/no access: muted, non-interactive (renders `as` forced to 'span'), aria-disabled. */
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

/**
 * Inline entity-link chip: an optional icon, an optional muted prefix (e.g.
 * a task key), the entity's name, and an optional workflow status shown in
 * its own color — all spans inside a single inline root, safe to drop
 * directly inside a `<p>`. Renders `<a>` when `href` is set, `<span>` for a
 * static (non-navigating) chip, or whatever `as` is passed for router-aware
 * navigation.
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
 * // Loading / unavailable states
 * <EntityChip label="Contact" loading />
 * <EntityChip label="Deleted contact" unavailable />
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
 * - ❌ Raw hex strings in `status.color`. It's a `PaletteColor` name
 *   (`'amber'`, `'violet'`, …), not a CSS color value.
 */
export const EntityChip = forwardRef(function EntityChip<C extends ElementType = 'a'>(
  {
    as,
    icon,
    label,
    prefix,
    status,
    href,
    loading = false,
    unavailable = false,
    className,
    style,
    ...rest
  }: EntityChipProps<C>,
  ref: ForwardedRef<Element>,
) {
  // unavailable/loading force a non-interactive span — never a link/button.
  const blocked = unavailable || loading;
  const Component = (blocked ? 'span' : (as ?? (href ? 'a' : 'span'))) as ElementType;
  const elementProps: { href?: string; type?: string } = {};
  if (!blocked && Component === 'a') elementProps.href = href;
  if (Component === 'button') elementProps.type = 'button';

  return (
    <Component
      ref={ref}
      style={style}
      className={clsx(styles.chip, unavailable && styles.unavailable, className)}
      {...elementProps}
      {...rest}
      // Component-owned ARIA state must survive whatever the consumer passes
      // via {...rest} — aria-busy/aria-disabled are the component's contract.
      aria-busy={loading || undefined}
      aria-disabled={unavailable || undefined}
    >
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      {loading ? (
        <span className={styles.ellipsis}>…</span>
      ) : (
        <>
          {prefix && <span className={styles.prefix}>{prefix}</span>}
          {label}
          {status && (
            <span className={styles.status} style={statusColorStyle(status)}>
              <span className={styles.dot} aria-hidden="true">
                ·
              </span>
              {status.label}
            </span>
          )}
        </>
      )}
    </Component>
  );
}) as EntityChipComponent;
