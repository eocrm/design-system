import styles from './TokensPage.module.scss';

interface TokenPreviewProps {
  category: string;
  name: string;
}

/**
 * Per-category visual preview of a token's effect. Falls back to a small
 * dash for categories that don't have a meaningful visual representation
 * (e.g., z-index, transition duration).
 */
export function TokenPreview({ category, name }: TokenPreviewProps) {
  // All previews use `var(--token-name)` so they reflect the live computed
  // value — that way theme overrides and consumer-set CSS variables show up
  // visually instead of being hard-coded to the literal value in tokens.scss.
  const cssVar = `var(--${name})`;

  switch (category) {
    case 'color':
      return (
        <div
          className={styles.colorSwatch}
          style={{ backgroundColor: cssVar }}
          aria-label={`Color swatch for ${name}`}
        />
      );

    case 'space':
      return (
        <div className={styles.spaceTrack}>
          <div className={styles.spaceFill} style={{ width: cssVar }} />
        </div>
      );

    case 'radius':
      return <div className={styles.radiusSwatch} style={{ borderRadius: cssVar }} />;

    case 'shadow':
      return <div className={styles.shadowSwatch} style={{ boxShadow: cssVar }} />;

    case 'font':
      // The `font-*` group includes sizes, weights, families, and line-heights.
      if (name.startsWith('font-size-')) {
        return (
          <span className={styles.fontSizeSample} style={{ fontSize: cssVar }}>
            Aa
          </span>
        );
      }
      if (name.startsWith('font-weight-')) {
        return (
          <span className={styles.fontWeightSample} style={{ fontWeight: cssVar }}>
            Aa
          </span>
        );
      }
      if (name.startsWith('font-family-')) {
        return (
          <span className={styles.fontFamilySample} style={{ fontFamily: cssVar }}>
            Aa
          </span>
        );
      }
      return <span className={styles.dash}>—</span>;

    case 'size':
      // Component sizing — render a small bar at the token's width up to 64px.
      return (
        <div className={styles.sizeTrack}>
          <div className={styles.sizeFill} style={{ width: cssVar }} />
        </div>
      );

    case 'opacity':
      return (
        <div className={styles.opacityRow}>
          <div className={styles.opacitySwatch} style={{ opacity: cssVar }} />
        </div>
      );

    case 'ring':
      if (name === 'ring-width') {
        return (
          <div className={styles.ringWidthSample}>
            <div className={styles.ringWidthBox} style={{ borderWidth: cssVar }} />
          </div>
        );
      }
      // ring-accent / ring-danger / ring-success — render a focus-ring overlay.
      return (
        <div
          className={styles.ringSwatch}
          style={{ boxShadow: `0 0 0 var(--ring-width) ${cssVar}` }}
        />
      );

    case 'border':
      return <div className={styles.borderSwatch} style={{ borderWidth: cssVar }} aria-hidden />;

    case 'line':
      return (
        <div className={styles.lineHeightSample} style={{ lineHeight: cssVar }}>
          One
          <br />
          Two
        </div>
      );

    case 'letter':
      return (
        <span className={styles.letterSample} style={{ letterSpacing: cssVar }}>
          TRACKING
        </span>
      );

    case 'transition':
    case 'z':
    default:
      return <span className={styles.dash}>—</span>;
  }
}
