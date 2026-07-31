import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Split } from './Split';

describe('Split', () => {
  it('renders the aside and the main (children)', () => {
    render(
      <Split aside={<span data-testid="aside">rail</span>}>
        <span data-testid="main">panel</span>
      </Split>,
    );
    expect(screen.getByTestId('aside')).toBeInTheDocument();
    expect(screen.getByTestId('main')).toBeInTheDocument();
  });

  it('wraps aside and main in distinct cells inside one container', () => {
    const { container } = render(
      <Split aside={<span data-testid="aside" />}>
        <span data-testid="main" />
      </Split>,
    );
    const root = container.firstElementChild!;
    const asideCell = root.querySelector('[class*="aside"]');
    const mainCell = root.querySelector('[class*="main"]');
    expect(asideCell).not.toBeNull();
    expect(mainCell).not.toBeNull();
    expect(asideCell).toContainElement(screen.getByTestId('aside'));
    expect(mainCell).toContainElement(screen.getByTestId('main'));
  });

  it('places aside before main in DOM order when side="start" (default)', () => {
    const { container } = render(
      <Split aside={<span data-testid="aside" />}>
        <span data-testid="main" />
      </Split>,
    );
    const aside = container.querySelector('[class*="aside"]')!;
    const main = container.querySelector('[class*="main"]')!;
    expect(aside.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('places main before aside in DOM order when side="end"', () => {
    const { container } = render(
      <Split side="end" aside={<span data-testid="aside" />}>
        <span data-testid="main" />
      </Split>,
    );
    const aside = container.querySelector('[class*="aside"]')!;
    const main = container.querySelector('[class*="main"]')!;
    expect(main.compareDocumentPosition(aside) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('applies the side modifier class', () => {
    const { container, rerender } = render(<Split aside={<i />}>x</Split>);
    expect((container.firstElementChild as HTMLElement).className).toMatch(/sideStart/);
    rerender(
      <Split side="end" aside={<i />}>
        x
      </Split>,
    );
    expect((container.firstElementChild as HTMLElement).className).toMatch(/sideEnd/);
  });

  it('maps gap to the right class', () => {
    const { container } = render(
      <Split gap="xl" aside={<i />}>
        x
      </Split>,
    );
    expect((container.firstElementChild as HTMLElement).className).toMatch(/gapXl/);
  });

  it('maps align to the right class (default start)', () => {
    const { container, rerender } = render(<Split aside={<i />}>x</Split>);
    expect((container.firstElementChild as HTMLElement).className).toMatch(/alignStart/);
    rerender(
      <Split align="stretch" aside={<i />}>
        x
      </Split>,
    );
    expect((container.firstElementChild as HTMLElement).className).toMatch(/alignStretch/);
  });

  it('sets the --split-aside-width custom property from asideWidth (default auto)', () => {
    const { container, rerender } = render(<Split aside={<i />}>x</Split>);
    expect(
      (container.firstElementChild as HTMLElement).style.getPropertyValue('--split-aside-width'),
    ).toBe('auto');
    rerender(
      <Split asideWidth="240px" aside={<i />}>
        x
      </Split>,
    );
    expect(
      (container.firstElementChild as HTMLElement).style.getPropertyValue('--split-aside-width'),
    ).toBe('240px');
  });

  it('merges className on the container', () => {
    const { container } = render(
      <Split className="external" aside={<i />}>
        x
      </Split>,
    );
    expect((container.firstElementChild as HTMLElement).className).toMatch(/external/);
  });

  it('merges consumer style with the aside-width custom property', () => {
    const { container } = render(
      <Split style={{ maxWidth: 500 }} aside={<i />}>
        x
      </Split>,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.maxWidth).toBe('500px');
    expect(el.style.getPropertyValue('--split-aside-width')).toBe('auto');
  });

  it('forwards ref to the container div', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Split ref={ref} aside={<i />}>
        x
      </Split>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('spreads native HTML attributes onto the container', () => {
    const { container } = render(
      <Split aside={<i />} data-testid="sp" aria-label="settings layout">
        x
      </Split>,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveAttribute('data-testid', 'sp');
    expect(el).toHaveAttribute('aria-label', 'settings layout');
  });
});

// jsdom does not evaluate container queries — same as Grid's collapseBelow
// tests (#314), the collapse contract is asserted via the emitted classes; the
// @container rules themselves are verified in the browser.
describe('Split collapseBelow (#372)', () => {
  it('adds the collapsible + breakpoint classes when set', () => {
    const { container } = render(
      <Split aside={<i />} collapseBelow="sm">
        x
      </Split>,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toMatch(/collapsible/);
    expect(el.className).toMatch(/collapseSm/);
  });

  it('adds no collapse classes when unset — no container-type on plain splits', () => {
    const { container } = render(<Split aside={<i />}>x</Split>);
    expect((container.firstElementChild as HTMLElement).className).not.toMatch(/collaps/i);
  });

  it('collapses on either side, keeping DOM order (aside-first only for side="start")', () => {
    const cellOrder = (root: Element) =>
      Array.from(root.children).map((c) =>
        /aside/.test((c as HTMLElement).className) ? 'aside' : 'main',
      );

    const start = render(
      <Split aside={<i />} side="start" collapseBelow="md">
        x
      </Split>,
    );
    const startRoot = start.container.firstElementChild as HTMLElement;
    expect(startRoot.className).toMatch(/collapsible/);
    expect(startRoot.className).toMatch(/collapseMd/);
    expect(startRoot.className).toMatch(/sideStart/);
    expect(cellOrder(startRoot)).toEqual(['aside', 'main']);

    const end = render(
      <Split aside={<i />} side="end" collapseBelow="md">
        x
      </Split>,
    );
    const endRoot = end.container.firstElementChild as HTMLElement;
    expect(endRoot.className).toMatch(/collapsible/);
    expect(endRoot.className).toMatch(/collapseMd/);
    expect(endRoot.className).toMatch(/sideEnd/);
    expect(cellOrder(endRoot)).toEqual(['main', 'aside']);
  });

  it('keeps the pinned aside width custom property while collapsible', () => {
    const { container } = render(
      <Split aside={<i />} asideWidth="220px" collapseBelow="sm">
        x
      </Split>,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.getPropertyValue('--split-aside-width')).toBe('220px');
  });
});

describe('Split collapseBelow — the container query can actually match (#372)', () => {
  // jsdom cannot evaluate @container, so no behavioral test can reach this.
  // The class-name tests above all pass against a BROKEN implementation: the
  // first attempt at this feature put the collapse rule on the collapsible
  // element itself, which can never match — an element does not query its own
  // size container, so the rule resolves against the nearest ANCESTOR
  // container (usually none) and silently does nothing. Same class names, same
  // DOM order, dead CSS. Only a browser caught it.
  //
  // So assert the one thing that distinguishes correct from dead: the query's
  // subject must be the CHILDREN. Same SCSS-source technique DashboardCanvas
  // and DropdownMenu use for contracts jsdom can't reach.
  const scss = readFileSync(resolve(__dirname, 'Split.module.scss'), 'utf8');

  it.each(['Sm', 'Md', 'Lg'])('targets children, not itself, at the %s breakpoint', (bp) => {
    expect(scss).toMatch(new RegExp(`\\.collapsible\\.collapse${bp}\\s*>\\s*\\*\\s*\\{`));
  });

  it('wraps each collapse rule in a @container query', () => {
    expect(scss.match(/@container \(max-width:/g)).toHaveLength(3);
  });

  it('makes both collapsible side templates shrink-safe for pinned aside widths', () => {
    expect(scss).toMatch(
      /\.sideStart\.collapsible\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*var\(--split-aside-width,\s*auto\)\)\s+minmax\(0,\s*1fr\)/s,
    );
    expect(scss).toMatch(
      /\.sideEnd\.collapsible\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*var\(--split-aside-width,\s*auto\)\)/s,
    );
  });
});
