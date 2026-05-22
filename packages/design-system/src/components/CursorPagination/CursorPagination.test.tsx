import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { CursorPagination } from './CursorPagination';

describe('CursorPagination', () => {
  const noop = () => {};

  it('renders a <nav> with the default aria-label', () => {
    const { container } = render(
      <CursorPagination hasPrevious hasNext onPrevious={noop} onNext={noop} />,
    );
    const nav = container.querySelector('nav');
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute('aria-label', 'Pagination');
  });

  it('renders default "Previous" and "Next" labels', () => {
    render(<CursorPagination hasPrevious hasNext onPrevious={noop} onNext={noop} />);
    expect(screen.getByRole('button', { name: /Previous/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next/ })).toBeInTheDocument();
  });

  it('renders custom labels when provided', () => {
    render(
      <CursorPagination
        hasPrevious
        hasNext
        onPrevious={noop}
        onNext={noop}
        previousLabel="Newer"
        nextLabel="Older"
      />,
    );
    expect(screen.getByRole('button', { name: /Newer/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Older/ })).toBeInTheDocument();
  });

  it('disables previous when hasPrevious=false', () => {
    render(<CursorPagination hasPrevious={false} hasNext onPrevious={noop} onNext={noop} />);
    expect(screen.getByRole('button', { name: /Previous/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Next/ })).not.toBeDisabled();
  });

  it('disables next when hasNext=false', () => {
    render(<CursorPagination hasPrevious hasNext={false} onPrevious={noop} onNext={noop} />);
    expect(screen.getByRole('button', { name: /Previous/ })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /Next/ })).toBeDisabled();
  });

  it('disables both when disabled=true (even if has-prev / has-next are true)', () => {
    render(<CursorPagination hasPrevious hasNext onPrevious={noop} onNext={noop} disabled />);
    expect(screen.getByRole('button', { name: /Previous/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Next/ })).toBeDisabled();
  });

  it('clicking previous fires onPrevious', async () => {
    const user = userEvent.setup();
    const onPrevious = vi.fn();
    render(<CursorPagination hasPrevious hasNext onPrevious={onPrevious} onNext={noop} />);
    await user.click(screen.getByRole('button', { name: /Previous/ }));
    expect(onPrevious).toHaveBeenCalledOnce();
  });

  it('clicking next fires onNext', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<CursorPagination hasPrevious hasNext onPrevious={noop} onNext={onNext} />);
    await user.click(screen.getByRole('button', { name: /Next/ }));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('does not fire onPrevious when the button is disabled', async () => {
    const user = userEvent.setup();
    const onPrevious = vi.fn();
    render(
      <CursorPagination hasPrevious={false} hasNext onPrevious={onPrevious} onNext={noop} />,
    );
    await user.click(screen.getByRole('button', { name: /Previous/ }));
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it('applies the size class', () => {
    const { container, rerender } = render(
      <CursorPagination hasPrevious hasNext onPrevious={noop} onNext={noop} size="sm" />,
    );
    expect((container.querySelector('nav') as HTMLElement).className).toMatch(/size-sm/);
    rerender(
      <CursorPagination hasPrevious hasNext onPrevious={noop} onNext={noop} size="lg" />,
    );
    expect((container.querySelector('nav') as HTMLElement).className).toMatch(/size-lg/);
  });

  it('forwards ref to the outer <nav>', () => {
    const ref = createRef<HTMLElement>();
    render(
      <CursorPagination ref={ref} hasPrevious hasNext onPrevious={noop} onNext={noop} />,
    );
    expect(ref.current?.tagName).toBe('NAV');
  });

  it('merges className', () => {
    const { container } = render(
      <CursorPagination
        hasPrevious
        hasNext
        onPrevious={noop}
        onNext={noop}
        className="my-cls"
      />,
    );
    const nav = container.querySelector('nav') as HTMLElement;
    expect(nav.className).toMatch(/my-cls/);
    expect(nav.className).toMatch(/cursorPagination/);
  });

  it('flows custom aria-label through to the <nav>', () => {
    const { container } = render(
      <CursorPagination
        hasPrevious
        hasNext
        onPrevious={noop}
        onNext={noop}
        aria-label="Feed pagination"
      />,
    );
    expect(container.querySelector('nav')).toHaveAttribute('aria-label', 'Feed pagination');
  });
});
