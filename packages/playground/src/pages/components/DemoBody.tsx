import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, Code2 } from 'lucide-react';
import { Card, Tabs } from '@eocrm/design-system';
import { CodeBlock } from './CodeBlock';
import { ComponentApi } from './ComponentApi';
import { CrossLinks } from '../shared/CrossLinks';
import type { ComponentName } from '../mockups/registry';
import type { ComponentFile } from '../../lib/componentFiles';
import styles from './DemoLayout.module.scss';

export interface DemoBodyProps {
  files: ComponentFile[];
  componentName?: ComponentName;
  /** Override for the API-table lookup key; defaults to `componentName`. */
  apiName?: string;
  children: ReactNode;
}

/**
 * Source-view + examples + cross-link. The header-less core of
 * `<DemoLayout>` — reusable inside multi-variant pages where the page
 * header is rendered once and tabs swap the body.
 */
export function DemoBody({ files, componentName, apiName, children }: DemoBodyProps) {
  const [activeId, setActiveId] = useState(files[0]?.filename ?? '');
  // `files` is usually rebuilt each render; key the tab items on the names so
  // Tabs doesn't re-measure its indicator on every parent re-render.
  const fileNames = files.map((f) => f.filename).join('\n');
  const tabItems = useMemo(
    () => fileNames.split('\n').map((name) => ({ id: name, label: name })),
    [fileNames],
  );
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
            <Tabs items={tabItems} activeId={activeId} onChange={setActiveId} />
            {active && (
              <div className={styles.sourceCode}>
                <CodeBlock
                  code={active.code}
                  language={active.language}
                  filename={active.filename}
                />
              </div>
            )}
          </div>
        </details>
      </Card>

      <h2 className={styles.sectionTitle}>Examples</h2>
      <div className={styles.examplesGrid}>{children}</div>

      {(apiName ?? componentName) && <ComponentApi name={apiName ?? componentName!} />}
      {componentName && <CrossLinks kind="component" name={componentName} />}
    </>
  );
}
