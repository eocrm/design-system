import { useState, type ReactNode } from 'react';
import { ChevronDown, Code2 } from 'lucide-react';
import { Card, Tabs } from '@eocrm/design-system';
import { CodeBlock } from './CodeBlock';
import { CrossLinks } from '../shared/CrossLinks';
import type { ComponentName } from '../mockups/registry';
import styles from './DemoLayout.module.scss';

export interface DemoBodyProps {
  tsxSource: string;
  scssSource: string;
  tsxFilename: string;
  scssFilename: string;
  componentName?: ComponentName;
  children: ReactNode;
}

/**
 * Source-view + examples + cross-link. The header-less core of
 * `<DemoLayout>` — reusable inside multi-variant pages where the page
 * header is rendered once and tabs swap the body.
 */
export function DemoBody({
  tsxSource,
  scssSource,
  tsxFilename,
  scssFilename,
  componentName,
  children,
}: DemoBodyProps) {
  const [sourceTab, setSourceTab] = useState<'tsx' | 'scss'>('tsx');

  return (
    <>
      <Card padding="none">
        <details className={styles.sourceDetails}>
          <summary className={styles.sourceSummary}>
            <span className={styles.summaryLabel}>
              <Code2 size={14} />
              View source code
            </span>
            <ChevronDown size={14} className={styles.chevron} />
          </summary>
          <div className={styles.sourceBody}>
            <Tabs
              items={[
                { id: 'tsx', label: 'Component' },
                { id: 'scss', label: 'Styles' },
              ]}
              activeId={sourceTab}
              onChange={(id) => setSourceTab(id as 'tsx' | 'scss')}
            />
            <div className={styles.sourceCode}>
              {sourceTab === 'tsx' ? (
                <CodeBlock code={tsxSource} language="tsx" filename={tsxFilename} />
              ) : (
                <CodeBlock code={scssSource} language="scss" filename={scssFilename} />
              )}
            </div>
          </div>
        </details>
      </Card>

      <h2 className={styles.sectionTitle}>Examples</h2>
      <div className={styles.examplesGrid}>{children}</div>

      {componentName && <CrossLinks kind="component" name={componentName} />}
    </>
  );
}
