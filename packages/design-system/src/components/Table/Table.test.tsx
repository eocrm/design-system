import { resolve } from 'node:path';
import { parse, type Declaration, type Rule } from 'postcss';
import { compile } from 'sass';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, forwardRef, type ReactNode } from 'react';
import { Table } from './Table';

// jsdom computes no styles, so CSS-only behaviour is asserted against the
// compiled stylesheet (the Avatar / DataTable pattern). Sass drops the quotes
// from attribute selectors, so write them unquoted.
const stylesheet = parse(compile(resolve(__dirname, './Table.module.scss')).css);
/** Declarations of the ONE rule whose selector list contains `selector` exactly. */
function declarations(selector: string): Record<string, string> {
  const rules: Rule[] = [];
  stylesheet.walkRules((r) => {
    if (r.selectors.includes(selector)) rules.push(r);
  });
  if (rules.length !== 1) {
    throw new Error(`"${selector}" matched ${rules.length} rules, expected exactly 1`);
  }
  return Object.fromEntries(
    rules[0]!.nodes
      .filter((n): n is Declaration => n.type === 'decl')
      .map((d) => [d.prop, d.value]),
  );
}

describe('Table', () => {
  it('renders a native <table> with the default structure', () => {
    const { container } = render(
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Name</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Alex</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    expect(container.querySelector('table')).toBeInTheDocument();
    expect(container.querySelector('thead')).toBeInTheDocument();
    expect(container.querySelector('tbody')).toBeInTheDocument();
    expect(container.querySelector('th')).toHaveAttribute('scope', 'col');
  });

  it('wraps the table in a scroll <div> by default; scroll={false} renders bare', () => {
    const { container, rerender } = render(
      <Table>
        <Table.Body>
          <Table.Row>
            <Table.Cell>X</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    // Bydefault, the <table> sits inside an outer <div>.
    expect(container.querySelector('div > table')).not.toBeNull();

    rerender(
      <Table scroll={false}>
        <Table.Body>
          <Table.Row>
            <Table.Cell>X</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    // The first child is now the <table> itself.
    expect(container.firstChild?.nodeName).toBe('TABLE');
  });

  it('applies density / hover / striped / bordered / stickyHeader class names', () => {
    const { container, rerender } = render(
      <Table density="dense" striped bordered hover stickyHeader />,
    );
    const table = container.querySelector('table')!;
    expect(table.className).toMatch(/density-dense/);
    expect(table.className).toMatch(/striped/);
    expect(table.className).toMatch(/bordered/);
    expect(table.className).toMatch(/hover/);
    expect(table.className).toMatch(/stickyHeader/);

    rerender(<Table />);
    const table2 = container.querySelector('table')!;
    expect(table2.className).toMatch(/density-comfortable/);
    expect(table2.className).not.toMatch(/hover/);
    expect(table2.className).not.toMatch(/striped/);
    expect(table2.className).not.toMatch(/bordered/);
    expect(table2.className).not.toMatch(/stickyHeader/);
  });

  it('Table.Row selected adds aria-selected and the selected class', () => {
    const { container } = render(
      <Table>
        <Table.Body>
          <Table.Row selected>
            <Table.Cell>X</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    const tr = container.querySelector('tr');
    expect(tr).toHaveAttribute('aria-selected', 'true');
    expect(tr?.className).toMatch(/selected/);
  });

  it('Table.HeaderCell sortDirection renders chevron + aria-sort', () => {
    const { container, rerender } = render(
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell sortDirection="asc">Amount</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
      </Table>,
    );
    expect(container.querySelector('th')).toHaveAttribute('aria-sort', 'ascending');
    expect(container.querySelector('th svg')).toBeInTheDocument();

    rerender(
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell sortDirection="desc">Amount</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
      </Table>,
    );
    expect(container.querySelector('th')).toHaveAttribute('aria-sort', 'descending');

    rerender(
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell sortDirection="none">Amount</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
      </Table>,
    );
    expect(container.querySelector('th')).toHaveAttribute('aria-sort', 'none');
  });

  it('Table.HeaderCell without sortDirection has no chevron and no aria-sort', () => {
    const { container } = render(
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Amount</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
      </Table>,
    );
    expect(container.querySelector('th')).not.toHaveAttribute('aria-sort');
    expect(container.querySelector('th svg')).toBeNull();
  });

  it('Table.Cell align applies the right class', () => {
    const { container } = render(
      <Table>
        <Table.Body>
          <Table.Row>
            <Table.Cell align="end">42</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    expect(container.querySelector('td')?.className).toMatch(/align-end/);
  });

  it('Table.Cell truncate applies the truncate class', () => {
    const { container } = render(
      <Table>
        <Table.Body>
          <Table.Row>
            <Table.Cell truncate>Long long long</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    expect(container.querySelector('td')?.className).toMatch(/truncate/);
  });

  it('forwards ref on Table to the <table> element', () => {
    const ref = createRef<HTMLTableElement>();
    render(
      <Table ref={ref}>
        <Table.Body>
          <Table.Row>
            <Table.Cell>X</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    expect(ref.current).toBeInstanceOf(HTMLTableElement);
  });

  it('merges className on every subcomponent', () => {
    const { container } = render(
      <Table className="root-cls">
        <Table.Caption className="cap-cls">Cap</Table.Caption>
        <Table.Header className="thead-cls">
          <Table.Row className="tr-cls">
            <Table.HeaderCell className="th-cls">H</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body className="tbody-cls">
          <Table.Row>
            <Table.Cell className="td-cls">X</Table.Cell>
          </Table.Row>
        </Table.Body>
        <Table.Footer className="tfoot-cls">
          <Table.Row>
            <Table.Cell>F</Table.Cell>
          </Table.Row>
        </Table.Footer>
      </Table>,
    );
    expect(container.querySelector('table.root-cls')).not.toBeNull();
    expect(container.querySelector('caption.cap-cls')).not.toBeNull();
    expect(container.querySelector('thead.thead-cls')).not.toBeNull();
    expect(container.querySelector('tr.tr-cls')).not.toBeNull();
    expect(container.querySelector('th.th-cls')).not.toBeNull();
    expect(container.querySelector('tbody.tbody-cls')).not.toBeNull();
    expect(container.querySelector('td.td-cls')).not.toBeNull();
    expect(container.querySelector('tfoot.tfoot-cls')).not.toBeNull();
  });

  it('renders <caption> as the first child of <table>', () => {
    const { container } = render(
      <Table>
        <Table.Caption>Recent activity</Table.Caption>
        <Table.Body>
          <Table.Row>
            <Table.Cell>X</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    const table = container.querySelector('table')!;
    expect(table.firstChild?.nodeName).toBe('CAPTION');
    expect(table.querySelector('caption')).toHaveTextContent('Recent activity');
  });

  it('Table.HeaderCell scope defaults to "col" but is overridable', () => {
    const { container, rerender } = render(
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>H</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
      </Table>,
    );
    expect(container.querySelector('th')).toHaveAttribute('scope', 'col');

    rerender(
      <Table>
        <Table.Body>
          <Table.Row>
            <Table.HeaderCell scope="row">RowHeader</Table.HeaderCell>
            <Table.Cell>X</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    expect(container.querySelector('th')).toHaveAttribute('scope', 'row');
  });

  it('sortable Table.HeaderCell is keyboard-reachable (tabIndex=0, Enter/Space fires onClick)', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell sortDirection="none" onClick={onClick}>
              Amount
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>
      </Table>,
    );
    const th = screen.getByText('Amount').closest('th')!;
    expect(th).toHaveAttribute('tabIndex', '0');
    th.focus();
    expect(document.activeElement).toBe(th);
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('non-sortable Table.HeaderCell is NOT focusable by default (no tabIndex injected)', () => {
    const { container } = render(
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Plain header</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
      </Table>,
    );
    expect(container.querySelector('th')).not.toHaveAttribute('tabIndex');
  });

  it('selected row wins over striped (even row in striped table stays selected)', () => {
    const { container } = render(
      <Table striped scroll={false}>
        <Table.Body>
          <Table.Row>
            <Table.Cell>row 1 (odd)</Table.Cell>
          </Table.Row>
          <Table.Row selected>
            <Table.Cell>row 2 (even, selected)</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    // Specificity cascade test — selected styles must beat striped's
    // :nth-of-type(even). Assert via class application; the visual
    // assertion is the SCSS rule's job.
    const rows = container.querySelectorAll('tbody tr');
    expect(rows[1].className).toMatch(/selected/);
  });

  it('sortable header with no children renders only the chevron, no empty span', () => {
    const { container } = render(
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell sortDirection="asc" aria-label="Sort by amount" />
          </Table.Row>
        </Table.Header>
      </Table>,
    );
    // Only one inner span (.thInner) — the children-wrap span should be omitted.
    const innerSpans = container.querySelectorAll('th > span');
    expect(innerSpans.length).toBe(1);
    expect(container.querySelector('th svg')).toBeInTheDocument();
  });

  it('forwards ref on every subcomponent', () => {
    const captionRef = createRef<HTMLTableCaptionElement>();
    const theadRef = createRef<HTMLTableSectionElement>();
    const tbodyRef = createRef<HTMLTableSectionElement>();
    const tfootRef = createRef<HTMLTableSectionElement>();
    const trRef = createRef<HTMLTableRowElement>();
    const thRef = createRef<HTMLTableCellElement>();
    const tdRef = createRef<HTMLTableCellElement>();
    render(
      <Table>
        <Table.Caption ref={captionRef}>Cap</Table.Caption>
        <Table.Header ref={theadRef}>
          <Table.Row ref={trRef}>
            <Table.HeaderCell ref={thRef}>H</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body ref={tbodyRef}>
          <Table.Row>
            <Table.Cell ref={tdRef}>X</Table.Cell>
          </Table.Row>
        </Table.Body>
        <Table.Footer ref={tfootRef}>
          <Table.Row>
            <Table.Cell>F</Table.Cell>
          </Table.Row>
        </Table.Footer>
      </Table>,
    );
    expect(captionRef.current).toBeInstanceOf(HTMLTableCaptionElement);
    expect(theadRef.current).toBeInstanceOf(HTMLTableSectionElement);
    expect(tbodyRef.current).toBeInstanceOf(HTMLTableSectionElement);
    expect(tfootRef.current).toBeInstanceOf(HTMLTableSectionElement);
    expect(trRef.current).toBeInstanceOf(HTMLTableRowElement);
    expect(thRef.current).toBeInstanceOf(HTMLTableCellElement);
    expect(tdRef.current).toBeInstanceOf(HTMLTableCellElement);
  });

  it('passes colSpan / rowSpan through to native <th> and <td>', () => {
    const { container } = render(
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell colSpan={3}>Group header</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Cell rowSpan={2}>Spanning two rows</Table.Cell>
            <Table.Cell>A</Table.Cell>
            <Table.Cell colSpan={2}>Spanning two cols</Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>B</Table.Cell>
            <Table.Cell>C</Table.Cell>
            <Table.Cell>D</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    // colSpan on header — rendered DOM exposes the property as `colSpan`.
    const th = container.querySelector('th')!;
    expect(th.colSpan).toBe(3);
    // rowSpan + colSpan on body cells.
    const tds = container.querySelectorAll('tbody td');
    expect((tds[0] as HTMLTableCellElement).rowSpan).toBe(2);
    expect((tds[2] as HTMLTableCellElement).colSpan).toBe(2);
  });

  it('supports multi-row grouped header (colSpan on parent row + matching child cells)', () => {
    const { container } = render(
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell rowSpan={2}>Region</Table.HeaderCell>
            <Table.HeaderCell colSpan={2}>Q1</Table.HeaderCell>
            <Table.HeaderCell colSpan={2}>Q2</Table.HeaderCell>
          </Table.Row>
          <Table.Row>
            <Table.HeaderCell>Plan</Table.HeaderCell>
            <Table.HeaderCell>Actual</Table.HeaderCell>
            <Table.HeaderCell>Plan</Table.HeaderCell>
            <Table.HeaderCell>Actual</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
      </Table>,
    );
    const headerRows = container.querySelectorAll('thead tr');
    expect(headerRows).toHaveLength(2);
    const firstRowCells = headerRows[0].querySelectorAll('th');
    expect((firstRowCells[0] as HTMLTableCellElement).rowSpan).toBe(2);
    expect((firstRowCells[1] as HTMLTableCellElement).colSpan).toBe(2);
    expect((firstRowCells[2] as HTMLTableCellElement).colSpan).toBe(2);
    expect(headerRows[1].querySelectorAll('th')).toHaveLength(4);
  });

  it('layout="fixed" adds the fixed-layout class; default auto does not', () => {
    const { container, rerender } = render(<Table layout="fixed" />);
    expect(container.querySelector('table')!.className).toMatch(/layoutFixed/);
    rerender(<Table />);
    expect(container.querySelector('table')!.className).not.toMatch(/layoutFixed/);
  });

  it('tone on Table.Cell / Table.HeaderCell sets data-tone; omitted by default', () => {
    const { container } = render(
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell tone="danger">Overdue</Table.HeaderCell>
            <Table.HeaderCell tone="accent">Today</Table.HeaderCell>
            <Table.HeaderCell>Upcoming</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Cell tone="danger">3</Table.Cell>
            <Table.Cell tone="accent">1</Table.Cell>
            <Table.Cell>5</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    const ths = container.querySelectorAll('th');
    const tds = container.querySelectorAll('td');
    expect(ths[0]).toHaveAttribute('data-tone', 'danger');
    expect(ths[1]).toHaveAttribute('data-tone', 'accent');
    expect(ths[2]).not.toHaveAttribute('data-tone');
    expect(tds[0]).toHaveAttribute('data-tone', 'danger');
    expect(tds[1]).toHaveAttribute('data-tone', 'accent');
    expect(tds[2]).not.toHaveAttribute('data-tone');
  });

  it('Table.CellLink renders an <a> carrying the padding-hook class, merges className, passes the accessible name', () => {
    const ref = createRef<HTMLAnchorElement>();
    render(
      <Table>
        <Table.Body>
          <Table.Row>
            <Table.Cell>
              <Table.CellLink
                ref={ref}
                href="/deals?due=overdue"
                aria-label="Deals, overdue: 3"
                className="x"
              >
                3
              </Table.CellLink>
            </Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    const link = screen.getByRole('link', { name: 'Deals, overdue: 3' });
    expect(link).toHaveAttribute('href', '/deals?due=overdue');
    expect(link.className).toMatch(/cellLink/);
    expect(link).toHaveClass('x');
    expect(ref.current).toBe(link);
  });

  it('Table.CellLink `as` renders the given component with its props', () => {
    const RouterLink = forwardRef<HTMLAnchorElement, { to: string; children?: ReactNode }>(
      function RouterLink({ to, ...rest }, ref) {
        return <a ref={ref} href={to} data-router="" {...rest} />;
      },
    );
    const ref = createRef<HTMLAnchorElement>();
    render(
      <Table.CellLink as={RouterLink} to="/contacts" ref={ref}>
        Contacts
      </Table.CellLink>,
    );
    const link = screen.getByRole('link', { name: 'Contacts' });
    expect(link).toHaveAttribute('href', '/contacts');
    expect(link).toHaveAttribute('data-router');
    expect(link.className).toMatch(/cellLink/);
    expect(ref.current).toBe(link);
  });

  it('CellLink styles: cell drops padding, truncate ellipsises the link, hovered link recolours muted Text', () => {
    expect(declarations('.td:has(> .cellLink)')).toMatchObject({ padding: '0' });
    expect(declarations('.truncate > .cellLink')).toMatchObject({
      overflow: 'hidden',
      'text-overflow': 'ellipsis',
      'white-space': 'nowrap',
    });
    // Any hovered link, toned or not: muted/subtle Text takes the link colour.
    expect(declarations('.cellLink:hover')).toMatchObject({
      '--text-fg-muted': 'currentColor',
      '--text-fg-subtle': 'currentColor',
    });
    // The cell-wide overlay is the hover signal; no underline (#665).
    expect(declarations('.cellLink:hover')).not.toHaveProperty('text-decoration');
    // Full-grid borders stay square at a toned header (#664).
    expect(declarations('.bordered .th[data-tone]')).toEqual({ 'border-radius': '0' });
    for (const tone of ['danger', 'accent']) {
      expect(declarations(`[data-tone=${tone}] > .cellLink:hover`)).toEqual({
        color: `var(--table-cell-fg-${tone}-hover)`,
      });
    }
  });
});
