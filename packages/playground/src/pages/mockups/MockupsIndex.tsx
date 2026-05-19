import { Link } from 'react-router-dom';
import { Badge, Cluster, Stack } from '@eocrm/design-system';
import { MOCKUPS } from './registry';
import styles from './MockupsIndex.module.scss';

export function MockupsIndex() {
  // Skip the parameterised contact-detail entry from the index — it isn't a top-level page.
  const indexMockups = MOCKUPS.filter((m) => !m.path.includes(':'));

  return (
    <Stack gap="lg">
      <header>
        <span className={styles.eyebrow}>Mockups</span>
        <h1 className={styles.title}>CRM mockups</h1>
        <p className={styles.description}>
          Full-page mockups built only from <code>@eocrm/design-system</code> primitives. Each page
          links the components it uses, and each component links back to the mockups it appears in.
        </p>
      </header>

      <div className={styles.grid}>
        {indexMockups.map((m) => (
          <Link key={m.slug} to={m.path} className={styles.card}>
            <div className={styles.cardName}>{m.title}</div>
            <p className={styles.cardBlurb}>{m.blurb}</p>
            <div className={styles.chips}>
              <Cluster gap="xs">
                {m.usesComponents.map((name) => (
                  <Badge key={name} tone="info">
                    {name}
                  </Badge>
                ))}
              </Cluster>
            </div>
          </Link>
        ))}
      </div>
    </Stack>
  );
}
