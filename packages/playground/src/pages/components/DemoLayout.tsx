import { type ReactNode } from 'react';
import { Stack } from '@eocrm/design-system';
import { DemoBody } from './DemoBody';
import type { ComponentName } from '../mockups/registry';
import type { ComponentFile } from '../../lib/componentFiles';
import styles from './DemoLayout.module.scss';

export interface DemoLayoutProps {
  name: string;
  description: string;
  files: ComponentFile[];
  componentName?: ComponentName;
  /**
   * Component key for the auto-generated API table when it differs from
   * `componentName` or the component isn't in the cross-link registry (e.g.
   * `AppLayout`). Defaults to `componentName`.
   */
  apiName?: string;
  children: ReactNode;
}

export function DemoLayout({
  name,
  description,
  files,
  componentName,
  apiName,
  children,
}: DemoLayoutProps) {
  return (
    <Stack gap="lg">
      <header className={styles.header}>
        <span className={styles.eyebrow}>Component</span>
        <h1 className={styles.title}>{name}</h1>
        <p className={styles.description}>{description}</p>
      </header>

      <DemoBody files={files} componentName={componentName} apiName={apiName}>
        {children}
      </DemoBody>
    </Stack>
  );
}
