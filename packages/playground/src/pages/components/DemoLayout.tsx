import { type ReactNode } from 'react';
import { Stack } from '@eocrm/design-system';
import { DemoBody } from './DemoBody';
import type { ComponentName } from '../mockups/registry';
import styles from './DemoLayout.module.scss';

export interface DemoLayoutProps {
  name: string;
  description: string;
  tsxSource: string;
  scssSource: string;
  tsxFilename: string;
  scssFilename: string;
  componentName?: ComponentName;
  children: ReactNode;
}

export function DemoLayout({
  name,
  description,
  tsxSource,
  scssSource,
  tsxFilename,
  scssFilename,
  componentName,
  children,
}: DemoLayoutProps) {
  return (
    <Stack gap="lg">
      <header className={styles.header}>
        <span className={styles.eyebrow}>Component</span>
        <h1 className={styles.title}>{name}</h1>
        <p className={styles.description}>{description}</p>
      </header>

      <DemoBody
        tsxSource={tsxSource}
        scssSource={scssSource}
        tsxFilename={tsxFilename}
        scssFilename={scssFilename}
        componentName={componentName}
      >
        {children}
      </DemoBody>
    </Stack>
  );
}
