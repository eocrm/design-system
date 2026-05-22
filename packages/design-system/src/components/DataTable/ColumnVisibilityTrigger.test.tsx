import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColumnVisibilityTrigger } from './ColumnVisibilityTrigger';
import { useDataTable } from './useDataTable';
import type { ColumnDef } from './types';

type Row = { id: string };

const cols: ColumnDef<Row>[] = [
  { id: 'a', header: 'A', cell: (r) => r.id },
  { id: 'b', header: 'B', cell: (r) => r.id },
  { id: 'c', header: 'C', cell: (r) => r.id, enableHide: false }, // always visible — not in menu
];

function Harness(props: {
  onChange?: (v: Record<string, boolean>) => void;
  visibility?: Record<string, boolean>;
}) {
  const instance = useDataTable<Row>({
    data: [],
    columns: cols,
    getRowId: (r) => r.id,
    columnVisibility: props.visibility ?? {},
    onColumnVisibilityChange: props.onChange,
  });
  return <ColumnVisibilityTrigger instance={instance} />;
}

describe('<ColumnVisibilityTrigger>', () => {
  it('renders one menu item per hidable column', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /columns/i }));
    expect(screen.getByRole('menuitemcheckbox', { name: 'A' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemcheckbox', { name: 'B' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitemcheckbox', { name: 'C' })).toBeNull();
  });

  it('toggle fires onColumnVisibilityChange', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /columns/i }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'A' }));
    expect(onChange).toHaveBeenCalledWith({ a: false });
  });

  it('disables the toggle for the last visible hidable column', async () => {
    const user = userEvent.setup();
    // a is the only visible hidable column (b is hidden, c is non-hidable).
    render(<Harness visibility={{ b: false }} />);
    await user.click(screen.getByRole('button', { name: /columns/i }));
    const aItem = screen.getByRole('menuitemcheckbox', { name: 'A' });
    expect(aItem).toHaveAttribute('aria-disabled', 'true');
    // b is hidden but still toggleable to show.
    const bItem = screen.getByRole('menuitemcheckbox', { name: 'B' });
    expect(bItem).not.toHaveAttribute('aria-disabled', 'true');
  });
});
