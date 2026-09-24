import { createRef, StrictMode } from 'react';
import { act, render, screen } from '@testing-library/react';
import { LiveRegion, type LiveRegionProps } from './LiveRegion';

describe('<LiveRegion>', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const region = () => screen.getByRole('status');
  const flush = () => act(() => vi.advanceTimersByTime(100));

  it('mounts empty, then writes the message (so a mount-with-message still announces)', () => {
    render(<LiveRegion>Saved</LiveRegion>);
    expect(region().textContent).toBe('');
    flush();
    expect(region()).toHaveTextContent('Saved');
  });

  it('polite → role=status aria-live=polite; assertive → role=alert aria-live=assertive; both atomic', () => {
    const { rerender } = render(<LiveRegion>x</LiveRegion>);
    expect(region()).toHaveAttribute('aria-live', 'polite');
    expect(region()).toHaveAttribute('aria-atomic', 'true');
    rerender(<LiveRegion politeness="assertive">x</LiveRegion>);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });

  it('a politeness change flips role / aria-live only while the region is empty', () => {
    const { rerender } = render(<LiveRegion>Saving…</LiveRegion>);
    flush();
    const el = region();
    // React writes attributes via setAttribute: snapshot the region's text at
    // the moment each live-region attribute changes.
    const seen: string[] = [];
    const orig = el.setAttribute.bind(el);
    el.setAttribute = (name: string, value: string) => {
      if (name === 'role' || name === 'aria-live')
        seen.push(`${name}=${value}:"${el.textContent}"`);
      orig(name, value);
    };
    rerender(<LiveRegion politeness="assertive">Save failed</LiveRegion>);
    expect(seen).toEqual(['role=alert:""', 'aria-live=assertive:""']);
    flush();
    expect(screen.getByRole('alert')).toHaveTextContent('Save failed');
  });

  it('consumer props cannot override role / aria-live / aria-atomic', () => {
    // Built as a separate object (rather than inline JSX attributes) so the
    // `@ts-expect-error` directive stays pinned to this one-line statement —
    // immune to prettier reflowing the JSX call across lines, which
    // previously separated the directive from the line it was suppressing.
    // @ts-expect-error role / aria-live / aria-atomic are omitted from the props type
    const badProps: LiveRegionProps = { role: 'note', 'aria-live': 'off', 'aria-atomic': 'false' };
    render(<LiveRegion {...badProps}>x</LiveRegion>);
    expect(region()).toHaveAttribute('aria-live', 'polite');
    expect(region()).toHaveAttribute('aria-atomic', 'true');
  });

  it('hidden is omitted from the props type — it would silence the region', () => {
    // @ts-expect-error hidden is omitted from the props type
    render(<LiveRegion hidden>x</LiveRegion>);
  });

  it('aria-hidden is omitted from the props type — it would silence the region', () => {
    // JSX does not run excess-property checks against hyphenated attribute
    // names (so `<LiveRegion aria-hidden="true">` type-checks regardless of
    // the Omit below) — assert against the props type directly instead.
    // @ts-expect-error aria-hidden is omitted from the props type
    const props: LiveRegionProps = { 'aria-hidden': 'true' };
    void props;
  });

  it('hidden / aria-hidden smuggled in through an untyped spread do not reach the DOM', () => {
    // The type-level Omit above only stops a caller writing these props
    // directly. An untyped `...rest` forwarded from a parent can still put
    // them on the wire — the component must neutralize them at runtime too.
    const extra: any = { hidden: true, 'aria-hidden': 'true' };
    render(<LiveRegion {...extra}>x</LiveRegion>);
    expect(region()).not.toHaveAttribute('hidden');
    expect(region()).not.toHaveAttribute('aria-hidden');
  });

  it('a new message clears, then writes', () => {
    const { rerender } = render(<LiveRegion>One</LiveRegion>);
    flush();
    rerender(<LiveRegion>Two</LiveRegion>);
    expect(region().textContent).toBe('');
    flush();
    expect(region()).toHaveTextContent('Two');
  });

  it('same text + changed announceKey re-announces (clears, then writes)', () => {
    const { rerender } = render(<LiveRegion announceKey={1}>Saved</LiveRegion>);
    flush();
    rerender(<LiveRegion announceKey={2}>Saved</LiveRegion>);
    expect(region().textContent).toBe('');
    flush();
    expect(region()).toHaveTextContent('Saved');
  });

  it('a parent re-render with the same string does NOT re-announce', () => {
    const { rerender } = render(<LiveRegion>Saved</LiveRegion>);
    flush();
    rerender(<LiveRegion>Saved</LiveRegion>);
    expect(region()).toHaveTextContent('Saved');
  });

  it('a number child compares by value — an identical number does not re-announce', () => {
    const { rerender } = render(<LiveRegion>{3}</LiveRegion>);
    flush();
    rerender(<LiveRegion>{3}</LiveRegion>);
    expect(region()).toHaveTextContent('3');
  });

  it('an array of strings/numbers compares by joined value — an identical array does not re-announce', () => {
    const { rerender } = render(<LiveRegion>{[5, ' files uploaded']}</LiveRegion>);
    flush();
    rerender(<LiveRegion>{[5, ' files uploaded']}</LiveRegion>);
    expect(region()).toHaveTextContent('5 files uploaded');
  });

  it('a changed array element re-announces (clears, then writes)', () => {
    const { rerender } = render(<LiveRegion>{[5, ' files uploaded']}</LiveRegion>);
    flush();
    rerender(<LiveRegion>{[6, ' files uploaded']}</LiveRegion>);
    expect(region().textContent).toBe('');
    flush();
    expect(region()).toHaveTextContent('6 files uploaded');
  });

  it('null clears and stays empty', () => {
    const { rerender } = render(<LiveRegion>Saved</LiveRegion>);
    flush();
    rerender(<LiveRegion>{null}</LiveRegion>);
    flush();
    expect(region().textContent).toBe('');
  });

  it('empty string and false behave like null', () => {
    const { rerender } = render(<LiveRegion>Saved</LiveRegion>);
    flush();
    rerender(<LiveRegion>{''}</LiveRegion>);
    flush();
    expect(region().textContent).toBe('');
    rerender(<LiveRegion>{false}</LiveRegion>);
    flush();
    expect(region().textContent).toBe('');
  });

  it('rapid changes write only the latest', () => {
    const { rerender } = render(<LiveRegion>A</LiveRegion>);
    act(() => vi.advanceTimersByTime(30));
    rerender(<LiveRegion>B</LiveRegion>);
    act(() => vi.advanceTimersByTime(30));
    // A's pending write (scheduled for t=50) must have been cancelled by the
    // rerender to B (whose own write is scheduled for t=80) — at t=60
    // neither has fired, so the region is still empty.
    expect(region().textContent).toBe('');
    flush();
    expect(region()).toHaveTextContent('B');
  });

  it('unmounting clears the pending timer', () => {
    const { unmount } = render(<LiveRegion>Saved</LiveRegion>);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('shows the message after the delay under StrictMode', () => {
    render(
      <StrictMode>
        <LiveRegion>Saved</LiveRegion>
      </StrictMode>,
    );
    flush();
    expect(region()).toHaveTextContent('Saved');
  });

  it('forwards ref to the region and merges className', () => {
    const ref = createRef<HTMLSpanElement>();
    render(
      <LiveRegion ref={ref} className="extra">
        x
      </LiveRegion>,
    );
    expect(ref.current).toBe(region());
    expect(region()).toHaveClass('extra');
  });
});
