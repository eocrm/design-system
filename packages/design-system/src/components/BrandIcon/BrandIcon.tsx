import { forwardRef, type ReactNode, type SVGAttributes } from 'react';
import clsx from 'clsx';
import styles from './BrandIcon.module.scss';

/** Brands shipped today. Extend the union + the `ICONS` registry to add more. */
export type BrandName = 'google' | 'yandex';

export interface BrandIconProps extends Omit<SVGAttributes<SVGSVGElement>, 'children'> {
  /** Which brand mark to render. */
  name: BrandName;
  /** Square pixel size (width = height). Defaults to `20`. */
  size?: number;
  /**
   * Accessible name. Omit (default) for a decorative icon beside a text label —
   * the icon renders `aria-hidden`. Set it for a standalone icon (e.g. an
   * icon-only button) → `role="img"` + `aria-label`.
   */
  title?: string;
}

type BrandSvg = { viewBox: string; body: ReactNode };

// `Record<BrandName, …>` makes the registry complete at COMPILE time — adding a
// brand to `BrandName` without art fails typecheck. Brand hex is inline (the
// documented exception to token-only color; the colors are brand-mandated).
const ICONS: Record<BrandName, BrandSvg> = {
  google: {
    viewBox: '0 0 48 48',
    body: (
      <>
        <path
          fill="#EA4335"
          d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.1 0 24 0 14.6 0 6.4 5.4 2.6 13.2l7.8 6.1C12.2 13.3 17.6 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.6-9.6 6.6-16.5z"
        />
        <path
          fill="#FBBC05"
          d="M10.4 28.3c-.5-1.4-.8-3-.8-4.3s.3-2.9.8-4.3l-7.8-6.1C1 16.8 0 20.3 0 24s1 7.2 2.6 10.4l7.8-6.1z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.3-4.5 2.1-8.8 2.1-6.4 0-11.8-3.8-13.6-9.1l-7.8 6.1C6.4 42.6 14.6 48 24 48z"
        />
      </>
    ),
  },
  yandex: {
    viewBox: '0 0 24 24',
    body: (
      <>
        <rect width="24" height="24" rx="5" fill="#FC3F1D" />
        {/* v1 representation of the Yandex "Я" logomark; swap for official path art when sourced. */}
        <text
          x="12"
          y="17.5"
          textAnchor="middle"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif"
          fontWeight="700"
          fontSize="16"
          fill="#fff"
        >
          Я
        </text>
      </>
    ),
  },
};

/**
 * Renders a third-party brand's official multi-color mark — for SSO buttons and
 * brand chrome. Colors are brand-mandated (not themeable). Decorative by
 * default; pass `title` for standalone, labeled use.
 *
 * @example
 * // In an SSO button (decorative — the text carries the name):
 * <Button variant="secondary">
 *   <BrandIcon name="google" size={16} /> Continue with Google
 * </Button>
 *
 * @example
 * // Standalone, labeled:
 * <BrandIcon name="yandex" title="Yandex" size={24} />
 *
 * @remarks When NOT to use
 * - Generic UI glyphs (chevron, search, close) → use `lucide-react`. This is
 *   only for third-party brand marks.
 * - Recoloring to match your theme — unsupported; brand marks keep their
 *   official colors.
 *
 * @remarks Anti-patterns
 * - ❌ A decorative `BrandIcon` next to visible brand text AND a `title` —
 *   double-announces ("Google Continue with Google"). Keep it `aria-hidden`
 *   (the default) beside a label.
 */
export const BrandIcon = forwardRef<SVGSVGElement, BrandIconProps>(function BrandIcon(
  { name, size = 20, title, className, ...rest },
  ref,
) {
  const icon = ICONS[name];
  const labeled = title != null && title !== '';
  return (
    // {...rest} last (Pattern A) so a consumer can override the a11y defaults.
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox={icon.viewBox}
      className={clsx(styles.icon, className)}
      role={labeled ? 'img' : undefined}
      aria-label={labeled ? title : undefined}
      aria-hidden={labeled ? undefined : true}
      {...rest}
    >
      {labeled && <title>{title}</title>}
      {icon.body}
    </svg>
  );
});
