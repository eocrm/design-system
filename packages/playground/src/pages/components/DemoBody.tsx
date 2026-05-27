import { useState, type ReactNode } from 'react';
import { ChevronDown, Code2 } from 'lucide-react';
import { Card, Tabs } from '@eocrm/design-system';
import { CodeBlock } from './CodeBlock';
import { CrossLinks } from '../shared/CrossLinks';
import type { ComponentName } from '../mockups/registry';
import type { ComponentFile } from '../../lib/componentFiles';
import styles from './DemoLayout.module.scss';

export interface DemoBodyProps {
  files: ComponentFile[];
  componentName?: ComponentName;
  children: ReactNode;
}

/**
 * Source-view + examples + cross-link. The header-less core of
 * `<DemoLayout>` — reusable inside multi-variant pages where the page
 * header is rendered once and tabs swap the body.
 */
export function DemoBody({ files, componentName, children }: DemoBodyProps) {
  const [activeId, setActiveId] = useState(files[0]?.filename ?? '');
  const active = files.find((f) => f.filename === activeId) ?? files[0];

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
              items={files.map((f) => ({ id: f.filename, label: f.filename }))}
              activeId={activeId}
              onChange={setActiveId}
            />
            {active && (
              <div className={styles.sourceCode}>
                <CodeBlock code={active.code} language={active.language} filename={active.filename} />
              </div>
            )}
          </div>
        </details>
      </Card>

      <h2 className={styles.sectionTitle}>Examples</h2>
      <div className={styles.examplesGrid}>{children}</div>

      {componentName && <CrossLinks kind="component" name={componentName} />}
    </>
  );
}
