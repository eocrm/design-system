// Regression test for #321: after a parent-driven controlled reset
// (setDoc(emptyDoc()) — no remount), the next typed URL + space must still
// autolink into a chip and flow through onChange. Uses the REAL selection
// layer (no readSelection mock): the DOM selection collapses to the editable
// root when the old block element is removed, exactly like a browser.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { RichTextEditor } from './RichTextEditor';
import { I18nProvider } from '../../i18n';
import type { RichDoc } from '../RichText/engine/model';

const chip: React.ComponentProps<typeof RichTextEditor>['renderLink'] = ({ href }, fallback) =>
  href.startsWith('https://chip') ? <span data-chip>{href}</span> : fallback;

function typeText(editor: HTMLElement, data: string): Event {
  const evt = new Event('beforeinput', { bubbles: true, cancelable: true });
  Object.defineProperty(evt, 'inputType', { value: 'insertText' });
  Object.defineProperty(evt, 'data', { value: data });
  act(() => {
    editor.dispatchEvent(evt);
  });
  return evt;
}

function emptyBlockDoc(id: string): RichDoc {
  return { blocks: [{ id, type: 'paragraph', inlines: [{ text: '', marks: [] }] }] };
}

describe('RichTextEditor controlled external reset (#321)', () => {
  it('autolinks and commits a URL typed after an external value reset', () => {
    const docs: RichDoc[] = [];
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>(() => emptyBlockDoc('a1'));
      return (
        <>
          <button onClick={() => setDoc(emptyBlockDoc('a2'))}>reset</button>
          <RichTextEditor
            value={doc}
            onChange={(d) => {
              docs.push(d);
              setDoc(d);
            }}
            renderLink={chip}
          />
        </>
      );
    }
    render(
      <I18nProvider locale="en">
        <Harness />
      </I18nProvider>,
    );
    const box = screen.getByRole('textbox', { name: 'Rich text editor' });
    // Put the caret where a click would: inside the first (empty) paragraph.
    const p1 = box.querySelector('[data-block-id="a1"]')!;
    act(() => {
      document.getSelection()!.collapse(p1, 0);
    });
    // First URL + space → chip (sanity: the pre-reset path works).
    typeText(box, 'https://chip/1');
    typeText(box, ' ');
    expect(box.querySelector('[data-rich-link]')).not.toBeNull();

    // Parent submits and resets the doc — controlled replacement, NO remount.
    fireEvent.click(screen.getByRole('button', { name: 'reset' }));
    expect(box.querySelector('[data-rich-link]')).toBeNull();
    const commitsBefore = docs.length;

    // The removed block took the DOM selection with it — the boundary collapsed
    // to the editable root. Type without re-clicking (focus never left the editor).
    const evt1 = typeText(box, 'https://chip/2');
    const evt2 = typeText(box, ' ');
    // The editor must keep control of the input (un-prevented default = the
    // browser mutates the contentEditable DOM raw → duplicate text in real browsers).
    expect(evt1.defaultPrevented).toBe(true);
    expect(evt2.defaultPrevented).toBe(true);
    // onChange kept flowing and the URL got linked…
    expect(docs.length).toBeGreaterThan(commitsBefore);
    const last = docs[docs.length - 1];
    expect(
      last.blocks.some((b) =>
        b.inlines.some((r) =>
          r.marks.some((m) => m.type === 'link' && m.href === 'https://chip/2'),
        ),
      ),
    ).toBe(true);
    // …and the DOM shows exactly ONE rendering of the URL (the chip), no raw copy.
    expect(box.querySelector('[data-rich-link]')).not.toBeNull();
    expect(box.textContent).toBe('https://chip/2 ');
  });
});
