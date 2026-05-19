import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Cluster } from '@eocrm/design-system';
import {
  type ComponentName,
  type MockupSlug,
  getMockup,
  mockupsUsing,
} from '../mockups/registry';
import styles from './CrossLinks.module.scss';

type Props =
  | { kind: 'mockup'; slug: MockupSlug }
  | { kind: 'component'; name: ComponentName };

function componentPath(name: ComponentName): string {
  return `/components/${name.toLowerCase()}`;
}

export function CrossLinks(props: Props) {
  if (props.kind === 'mockup') {
    const mockup = getMockup(props.slug);
    if (!mockup || mockup.usesComponents.length === 0) return null;

    return (
      <div className={styles.wrap}>
        <Cluster gap="xs" align="center">
          <span className={styles.label}>Components used:</span>
          {mockup.usesComponents.map((name, i) => (
            <Fragment key={name}>
              {i > 0 && <span className={styles.sep}>·</span>}
              <Link to={componentPath(name)} className={styles.link}>
                {name}
              </Link>
            </Fragment>
          ))}
        </Cluster>
      </div>
    );
  }

  const seenIn = mockupsUsing(props.name);
  if (seenIn.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <Cluster gap="xs" align="center">
        <span className={styles.label}>Seen in:</span>
        {seenIn.map((m, i) => (
          <Fragment key={m.slug}>
            {i > 0 && <span className={styles.sep}>·</span>}
            <Link to={m.path.replace(':id', 'c-1001')} className={styles.link}>
              {m.title}
            </Link>
          </Fragment>
        ))}
      </Cluster>
    </div>
  );
}
