import './prismLangs'; // must run first — registers SCSS grammar on prism-react-renderer
import { useState, useSyncExternalStore } from 'react';
import { Check, Copy } from 'lucide-react';
import clsx from 'clsx';
import { Highlight, themes } from 'prism-react-renderer';
import styles from './CodeBlock.module.scss';

export interface CodeBlockProps {
  code: string;
  language?: 'tsx' | 'ts' | 'scss' | 'css' | 'json';
  filename?: string;
  className?: string;
}

/**
 * Resolve whether the playground is currently rendering dark, reactively.
 * Tracks BOTH the forced `<html data-theme>` (set by the AppShell toggle) and
 * the OS `prefers-color-scheme` (for the System state) so the Prism theme flips
 * the instant either changes. Mirrors the library's theme resolution order:
 * forced attribute wins, else fall back to the media query.
 */
function useIsDark(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const observer = new MutationObserver(onChange);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', onChange);
      return () => {
        observer.disconnect();
        mq.removeEventListener('change', onChange);
      };
    },
    () => {
      const forced = document.documentElement.dataset.theme;
      if (forced === 'dark') return true;
      if (forced === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    },
    () => false, // SSR / no-window: assume light
  );
}

export function CodeBlock({ code, language = 'tsx', filename, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const isDark = useIsDark();

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be unavailable (http, sandboxed) — ignore silently
    }
  };

  const trimmed = code.trimEnd();

  return (
    <div className={clsx(styles.block, className)}>
      <div className={styles.bar}>
        <span className={styles.filename}>{filename ?? language.toUpperCase()}</span>
        <button type="button" className={styles.copyBtn} onClick={onCopy} aria-label="Copy code">
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <Highlight code={trimmed} language={language} theme={isDark ? themes.vsDark : themes.github}>
        {({ tokens, getLineProps, getTokenProps }) => (
          <pre className={styles.pre}>
            <code className={styles.code}>
              {tokens.map((line, i) => (
                <span key={i} {...getLineProps({ line })} className={styles.line}>
                  {line.map((token, k) => (
                    <span key={k} {...getTokenProps({ token })} />
                  ))}
                  {'\n'}
                </span>
              ))}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  );
}
