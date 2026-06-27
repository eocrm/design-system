// RichTextImageResizer.test.tsx
import { render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { I18nProvider } from '../../i18n';
import { RichTextImageResizer } from './RichTextImageResizer';

function Harness({ withImg = true }: { withImg?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  return (
    <I18nProvider locale="en">
      <div ref={rootRef} style={{ position: 'relative' }}>
        <figure data-block-id="v" contentEditable={false}>
          {withImg ? <img alt="x" src="http://u/p.png" /> : null}
        </figure>
        <RichTextImageResizer rootRef={rootRef} blockId="v" maxWidth={600} onResize={() => {}} />
      </div>
    </I18nProvider>
  );
}

it('renders a resize handle when the target image is present', () => {
  render(<Harness />);
  expect(screen.getByTitle('Drag to resize')).toBeInTheDocument();
});

it('renders nothing when the target image is absent (e.g. a file chip)', () => {
  render(<Harness withImg={false} />);
  expect(screen.queryByTitle('Drag to resize')).toBeNull();
});

// The live pointer drag (capture + getBoundingClientRect deltas) needs real layout
// and pointer-capture, which jsdom lacks — the same constraint as the gutter drag.
// The clamp math is trivial and the resize round-trip is covered by the editor's
// width tests; the live behaviour is verified in the playground.
