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

  // The `col.id` tail exists so a column with a non-string header still gets
  // something readable here. An empty string at either step defeated it and
  // rendered a blank, unidentifiable checkbox row — worse than the identifier
  // the chain already treats as a last resort (#536). Each assertion names the
  // EXACT expected label: a blank row's name is empty, but the surrounding
  // rows' names are not, so a loose check would not separate them.
  it('treats an empty visibilityLabel or header as unset, never as a blank row', async () => {
    const emptyCols: ColumnDef<Row>[] = [
      // Empty label, string header → the header names the row.
      { id: 'a', header: 'A header', visibilityLabel: '', cell: (r) => r.id },
      // Empty label, ReactNode header → falls all the way to the id.
      { id: 'b-id', header: <span>B</span>, visibilityLabel: '', cell: (r) => r.id },
      // Empty header, no label → also the id. `header: ''` is a string, so
      // `typeof === 'string'` alone would have accepted it and blanked the row.
      { id: 'c-id', header: '', cell: (r) => r.id },
    ];
    function EmptyLabelHarness() {
      const instance = useDataTable<Row>({
        data: [],
        columns: emptyCols,
        getRowId: (r) => r.id,
        columnVisibility: {},
      });
      return <ColumnVisibilityTrigger instance={instance} />;
    }
    const user = userEvent.setup();
    render(<EmptyLabelHarness />);
    await user.click(screen.getByRole('button', { name: /columns/i }));
    expect(screen.getByRole('menuitemcheckbox', { name: 'A header' })).toHaveAccessibleName(
      'A header',
    );
    expect(screen.getByRole('menuitemcheckbox', { name: 'b-id' })).toHaveAccessibleName('b-id');
    expect(screen.getByRole('menuitemcheckbox', { name: 'c-id' })).toHaveAccessibleName('c-id');
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
