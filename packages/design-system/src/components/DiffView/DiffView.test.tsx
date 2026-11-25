import { createRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DiffView } from './DiffView';

const DIFF = ['@@ -1,2 +1,2 @@', ' same', '-old', '+new', '\\ No newline at end of file'].join(
  '\n',
);

describe('DiffView', () => {
  it('renders a table with a labelled row group per hunk', () => {
    const two = `${DIFF}\n@@ -10 +10,2 @@\n x\n+y`;
    render(<DiffView diff={two} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('rowgroup')).toHaveLength(3); // thead + 2 hunks
    expect(screen.getByRole('rowheader', { name: 'Lines 1–2 → 1–2' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Lines 10 → 10–11' })).toBeInTheDocument();
  });

  it('names the table by the header label, else "Changes"', () => {
    const { unmount } = render(<DiffView diff={DIFF} fromLabel="v1" toLabel="v2" />);
    expect(screen.getByRole('table', { name: 'v1 → v2' })).toBeInTheDocument();
    unmount();
    render(<DiffView diff={DIFF} />);
    expect(screen.getByRole('table', { name: 'Changes' })).toBeInTheDocument();
  });

  it('marks added and removed rows with a sign and hidden text', () => {
    render(<DiffView diff={DIFF} />);
    const added = screen.getByText('new').closest('tr')!;
    const removed = screen.getByText('old').closest('tr')!;
    expect(added).toHaveTextContent('+Added');
    expect(removed).toHaveTextContent('−Removed');
    expect(screen.getByText('same').closest('tr')).not.toHaveTextContent(/Added|Removed|[+−]/);
  });

  it('shows line numbers by default and drops them with lineNumbers={false}', () => {
    const { rerender } = render(<DiffView diff={DIFF} />);
    expect(screen.getByRole('columnheader', { name: 'Old line' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'New line' })).toBeInTheDocument();
    expect(within(screen.getByText('old').closest('tr')!).getAllByRole('cell')).toHaveLength(4);
    rerender(<DiffView diff={DIFF} lineNumbers={false} />);
    expect(screen.queryByRole('columnheader', { name: 'Old line' })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'New line' })).toBeNull();
    expect(within(screen.getByText('old').closest('tr')!).getAllByRole('cell')).toHaveLength(2);
  });

  it('renders the from/to labels, either alone', () => {
    const { rerender } = render(<DiffView diff={DIFF} fromLabel="v3" toLabel="v4" />);
    expect(screen.getByText('v3 → v4')).toBeInTheDocument();
    rerender(<DiffView diff={DIFF} fromLabel="v3" />);
    expect(screen.getByText('v3')).toBeInTheDocument();
    rerender(<DiffView diff={DIFF} toLabel="v4" />);
    expect(screen.getByText('v4')).toBeInTheDocument();
    expect(screen.queryByText('v3 → v4')).toBeNull();
  });

  it('shows "No changes" and no table for an empty diff', () => {
    render(<DiffView diff="" />);
    expect(screen.getByText('No changes')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('renders the note line muted with no sign', () => {
    render(<DiffView diff={DIFF} />);
    const row = screen.getByText('No newline at end of file').closest('tr')!;
    expect(row.className).toMatch(/note/);
    expect(row).not.toHaveTextContent(/Added|Removed|[+−]/);
  });

  it('wrap={false} sets the no-wrap class; default wraps', () => {
    const { container, rerender } = render(<DiffView diff={DIFF} />);
    expect(container.firstElementChild!.className).not.toMatch(/noWrap/);
    rerender(<DiffView diff={DIFF} wrap={false} />);
    expect(container.firstElementChild!.className).toMatch(/noWrap/);
  });

  it('maxHeight sets the class', () => {
    const { container } = render(<DiffView diff={DIFF} fromLabel="a" maxHeight="md" />);
    expect(container.querySelector('table')!.parentElement!.className).toMatch(/maxMd/);
    expect(container.firstElementChild!.className).not.toMatch(/maxMd/);
    expect(screen.getByText('a').className).not.toMatch(/maxMd/);
  });

  it('formats 0-count and 1-line hunk ranges', () => {
    render(<DiffView diff={'@@ -0,0 +1,3 @@\n+a\n+b\n+c'} />);
    expect(screen.getByRole('rowheader', { name: 'Lines 0 → 1–3' })).toBeInTheDocument();
  });

  it('forwards ref, merges className, spreads rest props', () => {
    const ref = createRef<HTMLDivElement>();
    render(<DiffView ref={ref} diff={DIFF} className="x" data-testid="dv" />);
    expect(ref.current).toBe(screen.getByTestId('dv'));
    expect(ref.current!.className).toMatch(/x/);
  });
});
