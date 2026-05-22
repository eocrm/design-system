import { renderHook } from '@testing-library/react';
import { useRef, type RefObject } from 'react';
import { useFocusTrap } from './useFocusTrap';

function makeContainer(html: string): HTMLDivElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div);
  return div;
}

function trapHook(container: HTMLElement | null, options?: { active?: boolean }) {
  return renderHook(() => {
    const ref = useRef<HTMLElement | null>(container);
    useFocusTrap(ref as RefObject<HTMLElement | null>, options?.active ?? true);
    return ref;
  });
}

describe('useFocusTrap', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('Tab from the last focusable wraps to the first', () => {
    const container = makeContainer(`
      <button id="a">A</button>
      <button id="b">B</button>
      <button id="c">C</button>
    `);
    trapHook(container);
    const c = container.querySelector<HTMLButtonElement>('#c')!;
    c.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    c.dispatchEvent(event);
    expect(document.activeElement?.id).toBe('a');
    expect(event.defaultPrevented).toBe(true);
  });

  it('Shift+Tab from the first focusable wraps to the last', () => {
    const container = makeContainer(`
      <button id="a">A</button>
      <button id="b">B</button>
      <button id="c">C</button>
    `);
    trapHook(container);
    const a = container.querySelector<HTMLButtonElement>('#a')!;
    a.focus();
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    a.dispatchEvent(event);
    expect(document.activeElement?.id).toBe('c');
    expect(event.defaultPrevented).toBe(true);
  });

  it('Tab in the middle of the focusables is left to the browser', () => {
    const container = makeContainer(`
      <button id="a">A</button>
      <button id="b">B</button>
      <button id="c">C</button>
    `);
    trapHook(container);
    const b = container.querySelector<HTMLButtonElement>('#b')!;
    b.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    b.dispatchEvent(event);
    // Hook does not intercept the middle of the cycle.
    expect(event.defaultPrevented).toBe(false);
  });

  it('redirects focus back to the container when focus escapes', () => {
    const container = makeContainer(`<button id="a">A</button>`);
    container.tabIndex = -1;
    const outside = document.createElement('button');
    outside.id = 'outside';
    document.body.appendChild(outside);
    trapHook(container);

    outside.focus();
    // focusin is async via the listener; trigger a dispatch.
    outside.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(document.activeElement).toBe(container);
  });

  it('does nothing when container ref is null', () => {
    expect(() => trapHook(null)).not.toThrow();
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    outside.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(document.activeElement).toBe(outside);
  });

  it('does nothing when active is false', () => {
    const container = makeContainer(`<button id="a">A</button>`);
    container.tabIndex = -1;
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    trapHook(container, { active: false });
    outside.focus();
    outside.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(document.activeElement).toBe(outside);
  });

  it('zero focusables: focus stays on container, Tab is preventDefault-ed without movement', () => {
    const container = makeContainer(`<p>read-only</p>`);
    container.tabIndex = -1;
    trapHook(container);
    container.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    container.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(container);
  });
});
