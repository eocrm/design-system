import { createRef, useState, type Ref } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TreeView, type TreeViewChildren, type TreeViewNode, type TreeViewProps } from '.';

const n = (id: string, hasChildren = false): TreeViewNode => ({ id, label: id, hasChildren });
const data: Record<string, TreeViewChildren> = {
  Company: [n('Sales', true), n('Support', true)],
  Sales: [n('Team A'), n('Team B')],
};

function Harness(
  props: Partial<TreeViewProps> & { initial?: string[]; ref?: Ref<HTMLDivElement> },
) {
  const { initial = [], ...rest } = props;
  const [expanded, setExpanded] = useState(() => new Set(initial));
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <TreeView
      aria-label="Structure"
      roots={[n('Company', true), n('Other')]}
      childrenOf={(id) => data[id]}
      expandedIds={expanded}
      onExpandedChange={(id, open) =>
        setExpanded((prev) => {
          const next = new Set(prev);
          if (open) next.add(id);
          else next.delete(id);
          return next;
        })
      }
      selectedId={selected}
      onSelect={setSelected}
      {...rest}
    />
  );
}
const item = (name: string) => screen.getByRole('treeitem', { name });

describe('TreeView', () => {
  it('is a named tree, forwards ref, merges className, keeps its role over a consumer role', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Harness ref={ref} className="mine" role="list" data-testid="t" />);
    const tree = screen.getByRole('tree', { name: 'Structure' });
    expect(tree).toBe(ref.current);
    expect(tree.className).toMatch(/mine/);
    expect(tree).toHaveAttribute('data-testid', 't');
    expect(tree).toHaveAttribute('data-view', 'list');
  });

  it('renders levels, set positions, expanded state and nested groups', () => {
    render(<Harness initial={['Company', 'Sales']} />);
    expect(item('Company')).toHaveAttribute('aria-level', '1');
    expect(item('Company')).toHaveAttribute('aria-expanded', 'true');
    expect(item('Support')).toHaveAttribute('aria-expanded', 'false');
    expect(item('Other')).not.toHaveAttribute('aria-expanded');
    expect(item('Team B')).toHaveAttribute('aria-level', '3');
    expect(item('Team B')).toHaveAttribute('aria-setsize', '2');
    expect(item('Team B')).toHaveAttribute('aria-posinset', '2');
    const group = within(item('Sales')).getByRole('group');
    expect(
      within(group)
        .getAllByRole('treeitem')
        .map((el) => el.getAttribute('aria-label')),
    ).toEqual(['Team A', 'Team B']);
  });

  it('names rows by label, not rich content', () => {
    render(
      <Harness
        roots={[{ id: 'x', label: 'Plain', hasChildren: false, content: <b>Rich 42</b> }]}
      />,
    );
    expect(item('Plain')).toHaveTextContent('Rich 42');
  });

  it('marks selection only when onSelect is passed', () => {
    const { rerender } = render(<Harness />);
    expect(item('Company')).toHaveAttribute('aria-selected', 'false');
    rerender(<Harness onSelect={undefined} />);
    expect(item('Company')).not.toHaveAttribute('aria-selected');
  });

  it('has exactly one tab stop: the selected item, else the first', async () => {
    render(<Harness initial={['Company']} />);
    const stops = () => screen.getAllByRole('treeitem').filter((el) => el.tabIndex === 0);
    expect(stops()).toEqual([item('Company')]);
    await userEvent.click(item('Support'));
    expect(stops()).toEqual([item('Support')]);
    expect(item('Support')).toHaveAttribute('aria-selected', 'true');
    expect(item('Support')).toHaveFocus();
  });

  it('tab stop falls back to the first item when the selected node is hidden', () => {
    render(<Harness selectedId="Team A" />);
    expect(screen.getAllByRole('treeitem').filter((el) => el.tabIndex === 0)).toEqual([
      item('Company'),
    ]);
  });

  it('list keys: arrows move, expand and collapse; Enter selects; selection never follows focus', async () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} selectedId={null} />);
    await userEvent.tab();
    expect(item('Company')).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(item('Company')).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{ArrowRight}');
    expect(item('Sales')).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{End}');
    expect(item('Other')).toHaveFocus();
    await userEvent.keyboard('{Home}{ArrowDown}{ArrowLeft}');
    expect(item('Company')).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(item('Company')).toHaveAttribute('aria-expanded', 'false');
    expect(onSelect).not.toHaveBeenCalled();
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('Company');
    await userEvent.keyboard(' ');
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('typeahead jumps to the next visible label', async () => {
    render(<Harness initial={['Company']} />);
    await userEvent.tab();
    await userEvent.keyboard('s');
    expect(item('Sales')).toHaveFocus();
    await userEvent.keyboard('u');
    expect(item('Support')).toHaveFocus();
  });

  it('clicking the chevron toggles without selecting', async () => {
    const onSelect = vi.fn();
    const { container } = render(<Harness onSelect={onSelect} />);
    await userEvent.click(container.querySelector('[data-toggle]')!);
    expect(item('Company')).toHaveAttribute('aria-expanded', 'true');
    expect(onSelect).not.toHaveBeenCalled();
    expect(container.querySelector('[data-toggle]')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows a disabled loading row while children are undefined', () => {
    render(<Harness initial={['Company', 'Support']} />);
    const row = item('Loading…');
    expect(row).toHaveAttribute('aria-disabled', 'true');
    expect(row).toHaveAttribute('aria-level', '3');
    expect(row).not.toHaveAttribute('aria-selected');
  });

  it('keys from nested elements are ignored', async () => {
    const onSelect = vi.fn();
    render(
      <Harness
        onSelect={onSelect}
        roots={[
          {
            id: 'x',
            label: 'X',
            hasChildren: false,
            content: (
              <span tabIndex={-1} data-testid="inner">
                x
              </span>
            ),
          },
        ]}
      />,
    );
    screen.getByTestId('inner').focus();
    await userEvent.keyboard('{Enter}');
    expect(onSelect).not.toHaveBeenCalled();
  });
});
