import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Screen.module.scss';

/** How tall the screen is. */
export type ScreenFill = 'viewport' | 'block';

/** Backdrop treatment behind the centered content. */
export type ScreenBackdrop = 'none' | 'plain' | 'accent' | 'danger';

/** Vertical placement of the main content. */
export type ScreenAlign = 'center' | 'start';

export interface ScreenProps extends HTMLAttributes<HTMLDivElement> {
  /** The centered main content. */
  children: ReactNode;

  /** Pinned-top slot — a back link, wordmark, etc. Omit for none. */
  header?: ReactNode;

  /** Pinned-bottom slot — legal / footer links. Omit for none. */
  footer?: ReactNode;

  /**
   * Screen height. Defaults to `'viewport'`.
   * - `'viewport'` — `min-height: 100vh`; a true standalone page (login,
   *   standalone 404 / error).
   * - `'block'` — fills its container instead of the viewport; use when the
   *   Screen is embedded inside the app shell's content area (the in-app
   *   404 / error variants).
   */
  fill?: ScreenFill;

  /**
   * Backdrop behind the content. Defaults to `'none'` (transparent — inherits
   * the surface; use with `fill="block"` inside the shell).
   * - `'plain'` — solid subtle surface.
   * - `'accent'` — accent-tinted radial (the login backdrop).
   * - `'danger'` — danger-tinted radial (standalone error screen).
   */
  backdrop?: ScreenBackdrop;

  /** Vertical placement of the main content. Defaults to `'center'`. */
  align?: ScreenAlign;
}

const fillClass: Record<ScreenFill, string> = {
  viewport: styles.fillViewport,
  block: styles.fillBlock,
};

const backdropClass: Record<ScreenBackdrop, string | undefined> = {
  none: undefined,
  plain: styles.backdropPlain,
  accent: styles.backdropAccent,
  danger: styles.backdropDanger,
};

const alignClass: Record<ScreenAlign, string> = {
  center: styles.alignCenter,
  start: styles.alignStart,
};

/**
 * Full-bleed / centered screen layout — a page-root primitive for chromeless
 * screens that render OUTSIDE the app shell: sign-in, 404, error-boundary
 * fallback, onboarding. Lays out an optional pinned `header`, a vertically +
 * horizontally centered main slot (`children`), and an optional pinned
 * `footer`, over an optional tinted backdrop.
 *
 * Screen is a layout-owning primitive — like `<Page>` / `<Rail>` it is the
 * documented exception to "no layout properties on components": taking over the
 * viewport and centering its main slot is its entire job.
 *
 * @example
 * // Standalone 404 — full viewport, accent backdrop, brand + legal chrome
 * <Screen
 *   backdrop="accent"
 *   header={<Link to="/">← Home</Link>}
 *   footer={<Cluster gap="lg"><Link>Privacy</Link><Link>Terms</Link></Cluster>}
 * >
 *   <ErrorState title="Page not found" actions={<Button>Go home</Button>} />
 * </Screen>
 *
 * @example
 * // In-app variant — fills the shell content area, no backdrop
 * <Screen fill="block">
 *   <ErrorState title="Page not found" />
 * </Screen>
 *
 * @remarks When NOT to use
 * - A normal page inside the app shell → `<Page>` (it provides section rhythm,
 *   not full-bleed chrome).
 * - Centering a small element inside an existing layout → `<Cluster
 *   justify="center">` / `<Stack align="center">`. Screen is a page root.
 *
 * @remarks Anti-patterns
 * - Nesting `<Screen>` inside `<Page>` or another `<Screen>` (compounds
 *   layout). The in-app variants use `fill="block"` + `backdrop="none"` so they
 *   don't fight the shell.
 */
export const Screen = forwardRef<HTMLDivElement, ScreenProps>(function Screen(
  {
    children,
    header,
    footer,
    fill = 'viewport',
    backdrop = 'none',
    align = 'center',
    className,
    ...rest
  },
  ref,
) {
  // {...rest} last so consumer overrides win (Pattern A).
  return (
    <div
      ref={ref}
      className={clsx(styles.root, fillClass[fill], backdropClass[backdrop], className)}
      {...rest}
    >
      {/* `styles.header` / `styles.footer` are intentionally NOT declared in the
          SCSS — the flex column pins them top/bottom. Accessing an absent CSS-module
          key returns undefined at runtime → no class attribute (and avoids an empty
          ruleset that would trip stylelint's block-no-empty). */}
      {header != null && <div className={styles.header}>{header}</div>}
      <div className={clsx(styles.main, alignClass[align])}>{children}</div>
      {footer != null && <div className={styles.footer}>{footer}</div>}
    </div>
  );
});
