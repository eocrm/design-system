// Internal (not exported from the package): CodeBlock's copy button, shared with
// the read-only RichText code block. Prism-free so RichText can import it eagerly.
import { useEffect, useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { Button } from '../Button';
import { LiveRegion } from '../LiveRegion';
import { Tooltip } from '../Tooltip';

const COPIED_MS = 1500;

/** Icon-only "Copy code" button plus its always-mounted outcome live region. */
export function CopyCodeButton({ text }: { text: string }) {
  const t = useTranslation();
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [copyCount, setCopyCount] = useState(0);

  // Keyed on copyCount so a re-click restarts the window; cleanup also clears on unmount.
  useEffect(() => {
    if (copyStatus === 'idle') return;
    const id = setTimeout(() => setCopyStatus('idle'), COPIED_MS);
    return () => clearTimeout(id);
  }, [copyStatus, copyCount]);

  const copy = async () => {
    let ok = true;
    try {
      // Called synchronously inside the click so the user-activation gate holds;
      // a missing `navigator.clipboard` throws here and lands in the catch.
      await navigator.clipboard.writeText(text);
    } catch {
      ok = false;
    }
    setCopyStatus(ok ? 'copied' : 'failed');
    setCopyCount((n) => n + 1);
  };

  return (
    <>
      <Tooltip content={copyStatus === 'failed' ? t('codeBlock.copyFailed') : t('codeBlock.copy')}>
        <Button variant="ghost" size="sm" iconOnly aria-label={t('codeBlock.copy')} onClick={copy}>
          {copyStatus === 'copied' ? (
            <Check aria-hidden="true" />
          ) : copyStatus === 'failed' ? (
            <X aria-hidden="true" />
          ) : (
            <Copy aria-hidden="true" />
          )}
        </Button>
      </Tooltip>
      {/* Always mounted (Rule 10): the copy outcome is announced, the button keeps its name. */}
      <LiveRegion announceKey={copyCount}>
        {copyStatus === 'copied'
          ? t('codeBlock.copied')
          : copyStatus === 'failed'
            ? t('codeBlock.copyFailed')
            : null}
      </LiveRegion>
    </>
  );
}
