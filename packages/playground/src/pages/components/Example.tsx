import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { CodeBlock } from './CodeBlock';
import styles from './Example.module.scss';

export interface ExampleProps {
  title: string;
  description?: string;
  code: string;
  children: ReactNode;
}

export function Example({ title, description, code, children }: ExampleProps) {
  return (
    <section className={styles.example}>
      <header className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        {description && <p className={styles.description}>{description}</p>}
      </header>
      <div className={styles.preview}>{children}</div>
      <details className={styles.codeDetails}>
        <summary className={styles.codeSummary}>
          <ChevronDown size={12} className={styles.chevron} />
          <span className={styles.summaryLabel}>Show code</span>
        </summary>
        <div className={styles.codeBody}>
          <CodeBlock code={code} language="tsx" filename="usage.tsx" />
        </div>
      </details>
    </section>
  );
}
