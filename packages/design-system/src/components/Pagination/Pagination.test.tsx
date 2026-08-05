import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('renders a <nav> with a default aria-label of "Pagination"', () => {
    const { container } = render(
      <Pagination currentPage={1} pageCount={5} onPageChange={() => {}} />,
    );
    const nav = container.querySelector('nav');
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute('aria-label', 'Pagination');
  });

  it('respects a custom aria-label', () => {
    const { container } = render(
      <Pagination
        currentPage={1}
        pageCount={5}
        onPageChange={() => {}}
        aria-label="Top pagination"
      />,
    );
    expect(container.querySelector('nav')).toHaveAttribute('aria-label', 'Top pagination');
  });

  it('renders prev + next + every page number (small pageCount)', () => {
    render(<Pagination currentPage={1} pageCount={5} onPageChange={() => {}} />);
    expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
    expect(screen.getByLabelText('Next page')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Page 1, current page/ })).toBeInTheDocument();
    for (const page of [2, 3, 4, 5]) {
      expect(screen.getByRole('button', { name: `Go to page ${page}` })).toBeInTheDocument();
    }
  });

  it('renders ellipses for long page counts (not as buttons)', () => {
    const { container } = render(
      <Pagination currentPage={5} pageCount={20} onPageChange={() => {}} />,
    );
    // Two ellipses appear when current is in the middle of a long list.
    const ellipses = container.querySelectorAll('[aria-hidden="true"]');
    // Filter to just the ellipsis characters (the chevron icons are also aria-hidden).
    const ellipsisTextNodes = Array.from(ellipses).filter((el) => el.textContent === '…');
    expect(ellipsisTextNodes).toHaveLength(2);
    // Ellipses are <span>, not <button>.
    for (const node of ellipsisTextNodes) {
      expect(node.tagName).toBe('SPAN');
    }
  });

  it('marks the current page with aria-current="page" and keeps it enabled', () => {
    render(<Pagination currentPage={3} pageCount={5} onPageChange={() => {}} />);
    const current = screen.getByRole('button', { name: /Page 3, current page/ });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current).not.toBeDisabled();
  });

  it('disables prev on page 1', () => {
    render(<Pagination currentPage={1} pageCount={5} onPageChange={() => {}} />);
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
    expect(screen.getByLabelText('Next page')).not.toBeDisabled();
  });

  it('disables next on the last page', () => {
    render(<Pagination currentPage={5} pageCount={5} onPageChange={() => {}} />);
    expect(screen.getByLabelText('Previous page')).not.toBeDisabled();
    expect(screen.getByLabelText('Next page')).toBeDisabled();
  });

  it('disables every button when disabled=true', () => {
    render(<Pagination currentPage={2} pageCount={5} onPageChange={() => {}} disabled />);
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
    expect(screen.getByLabelText('Next page')).toBeDisabled();
    for (const page of [1, 2, 3, 4, 5]) {
      const name = page === 2 ? /Page 2, current page/ : new RegExp(`Go to page ${page}`);
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
  });

  it('clicking a page number fires onPageChange with that page', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination currentPage={1} pageCount={5} onPageChange={onPageChange} />);
    await user.click(screen.getByRole('button', { name: 'Go to page 3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('preserves focus when a controlled update makes the activated page current', async () => {
    const user = userEvent.setup();

    function ControlledPagination() {
      const [page, setPage] = useState(1);
      return <Pagination currentPage={page} pageCount={5} onPageChange={setPage} />;
    }

    render(<ControlledPagination />);
    const pageTwo = screen.getByRole('button', { name: 'Go to page 2' });
    await user.click(pageTwo);

    expect(pageTwo).toHaveFocus();
    expect(pageTwo).not.toBeDisabled();
    expect(pageTwo).toHaveAttribute('aria-current', 'page');
  });

  it('clicking prev fires onPageChange(currentPage - 1)', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination currentPage={3} pageCount={5} onPageChange={onPageChange} />);
    await user.click(screen.getByLabelText('Previous page'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('clicking next fires onPageChange(currentPage + 1)', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination currentPage={3} pageCount={5} onPageChange={onPageChange} />);
    await user.click(screen.getByLabelText('Next page'));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('clicking the current page does not fire onPageChange', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination currentPage={3} pageCount={5} onPageChange={onPageChange} />);
    await user.click(screen.getByRole('button', { name: /Page 3, current page/ }));
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('clamps currentPage > pageCount without crashing', () => {
    render(<Pagination currentPage={99} pageCount={5} onPageChange={() => {}} />);
    // The last page should be rendered as current.
    expect(screen.getByRole('button', { name: /Page 5, current page/ })).toBeInTheDocument();
  });

  it('clamps currentPage < 1 to page 1', () => {
    render(<Pagination currentPage={0} pageCount={5} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: /Page 1, current page/ })).toBeInTheDocument();
  });

  it('clamps pageCount < 1 to 1 (single-page edge case)', () => {
    const { container } = render(
      <Pagination currentPage={1} pageCount={0} onPageChange={() => {}} />,
    );
    expect(screen.getByRole('button', { name: /Page 1, current page/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
    expect(screen.getByLabelText('Next page')).toBeDisabled();
    expect(container.querySelectorAll('nav button').length).toBe(3); // prev + page 1 + next
  });

  it('applies the size class', () => {
    const { container, rerender } = render(
      <Pagination currentPage={1} pageCount={3} onPageChange={() => {}} size="sm" />,
    );
    expect((container.querySelector('nav') as HTMLElement).className).toMatch(/size-sm/);
    rerender(<Pagination currentPage={1} pageCount={3} onPageChange={() => {}} size="lg" />);
    expect((container.querySelector('nav') as HTMLElement).className).toMatch(/size-lg/);
  });

  it('defaults to size="md"', () => {
    const { container } = render(
      <Pagination currentPage={1} pageCount={3} onPageChange={() => {}} />,
    );
    expect((container.querySelector('nav') as HTMLElement).className).toMatch(/size-md/);
  });

  it('forwards ref to the outer <nav>', () => {
    const ref = createRef<HTMLElement>();
    render(<Pagination ref={ref} currentPage={1} pageCount={3} onPageChange={() => {}} />);
    expect(ref.current?.tagName).toBe('NAV');
  });

  it('merges className without replacing', () => {
    const { container } = render(
      <Pagination currentPage={1} pageCount={3} onPageChange={() => {}} className="my-cls" />,
    );
    const nav = container.querySelector('nav') as HTMLElement;
    expect(nav.className).toMatch(/my-cls/);
    expect(nav.className).toMatch(/pagination/);
  });

  it('respects siblingCount=0 (tight display)', () => {
    render(<Pagination currentPage={5} pageCount={10} onPageChange={() => {}} siblingCount={0} />);
    // With siblings=0, current=5, count=10: [1, ellipsis-start, 5, ellipsis-end, 10]
    expect(screen.getByRole('button', { name: 'Go to page 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Page 5, current page/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to page 10' })).toBeInTheDocument();
    // Pages 2, 3, 4, 6, 7, 8, 9 should NOT be rendered as buttons.
    for (const page of [2, 3, 4, 6, 7, 8, 9]) {
      expect(screen.queryByRole('button', { name: `Go to page ${page}` })).not.toBeInTheDocument();
    }
  });
});
