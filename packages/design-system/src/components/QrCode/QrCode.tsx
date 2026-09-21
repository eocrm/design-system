import {
  forwardRef,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
} from 'react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n';
import { cssUrl, encodeQr, type QrCodeLevel } from './qr';
import styles from './QrCode.module.scss';

export type { QrCodeLevel };

/** Share of the punch-out the mark fills, leaving paper around it. */
const LOGO_FILL = 0.72;

export interface QrCodeProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'value' | 'type'
> {
  /**
   * The string to encode — a URL, an ID, a vCard. Encoded as UTF-8, so any
   * script works.
   *
   * An empty string, or one past the largest symbol's capacity at the chosen
   * `level` (~1273 bytes at `'H'`, ~2953 at `'L'`), renders a **disabled**
   * button carrying a localized "unavailable" message instead of a code. It
   * never throws — a long CRM field cannot white-screen a page.
   */
  value: string;
  /**
   * URL of a **single-colour** SVG to place in the centre. It is used as a CSS
   * alpha mask and filled with the code's current ink, so it recolours itself
   * in both themes and in the inverted state — the file's own colours are
   * discarded. Full-colour artwork and photographs are not supported.
   *
   * Setting this also raises the default `level` to `'H'`, because the
   * punch-out destroys modules outright.
   */
  logo?: string;
  /**
   * Error-correction level — how much damage the symbol survives. `'L'` ~7%,
   * `'M'` ~15%, `'Q'` ~25%, `'H'` ~30%. Higher levels need a larger symbol for
   * the same data. Defaults to `'H'` when `logo` is set, `'M'` otherwise.
   */
  level?: QrCodeLevel;
}

/**
 * A scannable QR code. Encodes `value`, optionally masks a single-colour mark
 * into its centre, and swaps ink for paper when clicked.
 *
 * The code follows the theme — dark modules on light paper in light mode, the
 * reverse in dark mode. Inverted codes scan on modern phone cameras but not on
 * every hardware scanner, which is why clicking the code swaps the pair back.
 * That is the component's only interaction.
 *
 * It has no `size` prop: the code fills its container's width and the parent
 * owns the box, like every other component here.
 *
 * Pass `aria-label` — the default is a bare localized "QR code", which tells a
 * screen-reader user nothing about what the code points at.
 *
 * @example
 * // The common case — let the parent size it.
 * <Constrain maxWidth="xs">
 *   <QrCode value="https://example.com/i/42" aria-label="QR code for invoice 42" />
 * </Constrain>
 *
 * @example
 * // With the brand mark. `level` rises to 'H' automatically.
 * <QrCode value={inviteUrl} logo={brandMark} aria-label="Invite link" />
 *
 * @example
 * // Inside a Stack, with the caption the code needs for sighted users.
 * <Stack gap="xs" align="center">
 *   <QrCode value={ticket.url} aria-label={`Ticket ${ticket.id}`} />
 *   <Text size="sm" tone="muted">Scan at the door</Text>
 * </Stack>
 *
 * @remarks
 * **When NOT to use / anti-patterns**
 *
 * - ❌ **Nesting it inside another clickable element.** Every `<QrCode>` is a
 *   `<button>`, so putting one inside a clickable `Card` or a link produces
 *   invalid HTML and the code swallows the outer click. Put it beside the
 *   clickable surface, not inside it.
 * - ❌ **A full-colour logo.** `logo` is a mask: it keeps the silhouette and
 *   throws the colours away. A multi-colour mark comes out as one flat shape.
 * - ❌ **Relying on it as the only route.** A QR code is unusable to a
 *   screen-reader user and to anyone reading on the device that displays it.
 *   Always render the underlying URL or code as selectable text too.
 * - ❌ **Encoding a secret.** Anyone who can see the screen can scan it, and a
 *   screenshot keeps working. Treat the value as public.
 * - ❌ **Sizing it below ~100px.** Below that a dense symbol's modules fall
 *   under a camera's resolving power. Size the container generously, and
 *   remember that `logo` raises the level to `'H'`, which packs MORE modules
 *   into the same box — each one comes out smaller, so size up when you use it.
 * - ❌ **Assuming a code always renders.** An empty `value`, or one over
 *   capacity for the chosen `level` (~1273 bytes at `'H'`), renders a disabled
 *   button with a localized "unavailable" message in place of the symbol. If
 *   the value comes from a free-text field, budget for that state.
 */
export const QrCode = forwardRef<HTMLButtonElement, QrCodeProps>(function QrCode(
  { value, logo, level, className, style, onClick, title, 'aria-label': ariaLabel, ...props },
  ref,
) {
  const t = useTranslation();
  const [inverted, setInverted] = useState(false);

  // One truthiness rule for the whole component: an empty string is not a logo,
  // not a name and not a tooltip. Splitting this across `logo ?` and
  // `logo !== undefined` punches a hole into a level-M symbol with nothing to
  // fill it; the same slip on the name is below, at the `||` fallbacks.
  const hasLogo = Boolean(logo);

  const resolvedLevel: QrCodeLevel = level ?? (hasLogo ? 'H' : 'M');
  const matrix = useMemo(() => encodeQr(value, resolvedLevel), [value, resolvedLevel]);

  // {...props} first so the ARIA contract below cannot be clobbered — the
  // component owns `type`, `aria-pressed` and the toggle. `aria-label` and
  // `title` are destructured out instead, so the consumer's value is a
  // FALLBACK rather than something the spread order silently eats.
  if (matrix === null) {
    return (
      <button
        {...props}
        ref={ref}
        type="button"
        disabled
        className={clsx(styles.root, styles.error, className)}
        style={style}
        title={title}
      >
        {/* The consumer's name goes in as CONTENT, not as a competing
            aria-label: name-from-content then reads "<name> — <message>", so a
            browse-mode user can tell WHICH code failed without hearing the
            message twice. */}
        {ariaLabel ? `${ariaLabel} — ${t('qrCode.error')}` : t('qrCode.error')}
      </button>
    );
  }

  const { side, path, punch } = matrix;
  const offset = (side - punch) / 2;

  const logoVars = logo
    ? ({
        '--qr-logo-src': cssUrl(logo),
        '--qr-logo-size': `${((punch * LOGO_FILL) / side) * 100}%`,
      } as CSSProperties)
    : undefined;

  return (
    <button
      {...props}
      ref={ref}
      type="button"
      aria-pressed={inverted}
      // `||`, not `??`, on both: `aria-label={row.name ?? ''}` is ordinary
      // consumer code, and an empty aria-label does not remove the name — it
      // drops the computation through to `title`, making the invert hint the
      // name. `title=""` likewise means "no tooltip", not "empty tooltip".
      aria-label={ariaLabel || t('qrCode.label')}
      // `title` with an aria-label present is exposed as the DESCRIPTION, not
      // the name — so it explains what pressing does without touching the
      // name-exact contract. Doubles as a tooltip for sighted mouse users.
      title={title || t('qrCode.invertHint')}
      className={clsx(styles.root, inverted && styles.inverted, className)}
      style={{ ...logoVars, ...style }}
      onClick={(event) => {
        setInverted((current) => !current);
        onClick?.(event);
      }}
    >
      <svg
        className={styles.svg}
        viewBox={`0 0 ${side} ${side}`}
        shapeRendering="crispEdges"
        aria-hidden="true"
        focusable="false"
      >
        <rect className={styles.paper} width={side} height={side} />
        <path className={styles.ink} d={path} />
        {hasLogo && (
          <rect className={styles.paper} x={offset} y={offset} width={punch} height={punch} />
        )}
      </svg>
      {hasLogo && <span className={styles.logo} aria-hidden="true" />}
    </button>
  );
});
