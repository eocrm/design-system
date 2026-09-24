import { createRef } from 'react';
import { act, render, screen } from '@testing-library/react';
import { LiveRegion } from './LiveRegion';

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

  it('consumer props cannot override role / aria-live', () => {
    // @ts-expect-error role is omitted from the props type
    render(<LiveRegion role="note" aria-live="off">x</LiveRegion>);
    expect(region()).toHaveAttribute('aria-live', 'polite');
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

  it('null / empty clears and stays empty', () => {
    const { rerender } = render(<LiveRegion>Saved</LiveRegion>);
    flush();
    rerender(<LiveRegion>{null}</LiveRegion>);
    flush();
    expect(region().textContent).toBe('');
  });

  it('rapid changes write only the latest', () => {
    const { rerender } = render(<LiveRegion>A</LiveRegion>);
    rerender(<LiveRegion>B</LiveRegion>);
    rerender(<LiveRegion>C</LiveRegion>);
    flush();
    expect(region()).toHaveTextContent('C');
  });

  it('unmounting with a pending write does not throw or warn', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(<LiveRegion>Saved</LiveRegion>);
    unmount();
    flush();
    expect(err).not.toHaveBeenCalled();
    err.mockRestore();
  });

  it('forwards ref to the region and merges className', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<LiveRegion ref={ref} className="extra">x</LiveRegion>);
    expect(ref.current).toBe(region());
    expect(region()).toHaveClass('extra');
  });
});
