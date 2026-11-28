// RichTextCodeBlock.tsx — a `code_block` for both surfaces. Highlight tokens arrive
// lazily (useHighlight) as spans with the SAME text, styled by `[data-token]` in
// _prose.scss from CodeBlock's syntax tokens. Read-only adds CodeBlock's Copy button.
import { Fragment } from 'react';
import { CopyCodeButton } from '../CodeBlock/CopyCodeButton';
import type { Block } from './engine/model';
import { runsText } from './engine/inlines';
import { useHighlight } from './useHighlight';

/** Renders one code block; `editable` adds the `data-block-id` anchor and drops Copy. */
export function RichTextCodeBlock({ block, editable }: { block: Block; editable: boolean }) {
  const code = runsText(block.inlines);
  const lines = useHighlight(code, block.language);
  const pre = (
    <pre {...(editable ? { 'data-block-id': block.id } : {})}>
      <code className={block.language ? `language-${block.language}` : undefined}>
        {editable && code === '' ? (
          <br />
        ) : lines ? (
          lines.map((tokens, i) => (
            // Index keys: lines are derived wholesale from `code` and hold no state.
            <Fragment key={i}>
              {i > 0 && '\n'}
              {tokens.map((tk, j) =>
                tk.key === 'plain' ? (
                  <Fragment key={j}>{tk.content}</Fragment>
                ) : (
                  <span key={j} data-token={tk.key}>
                    {tk.content}
                  </span>
                ),
              )}
            </Fragment>
          ))
        ) : (
          code
        )}
      </code>
    </pre>
  );
  if (editable) return pre;
  return (
    <div data-code-block="">
      {pre}
      <CopyCodeButton text={code} />
    </div>
  );
}
