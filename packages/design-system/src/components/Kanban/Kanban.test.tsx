import { createRef } from 'react';
import { render } from '@testing-library/react';
import { Kanban } from './Kanban';
import { SortableHandle } from '../Sortable/Sortable';

describe('Kanban', () => {
  it('renders a board region with columns and cards (role="article" only when Handle is present)', () => {
    const { container } = render(
      <Kanban>
        <Kanban.Column id="col-a">
          <Kanban.Card id="card-1">
            <Kanban.Handle aria-label="Drag card 1" />
            Card One
          </Kanban.Card>
          <Kanban.Card id="card-2">Card Two (no handle)</Kanban.Card>
        </Kanban.Column>
      </Kanban>,
    );

    // Root is a region
    const region = container.querySelector('[role="region"]');
    expect(region).not.toBeNull();

    // Card with Handle gets role="article"
    const articles = container.querySelectorAll('[role="article"]');
    expect(articles).toHaveLength(1);

    // Card without Handle does NOT get role="article" (dnd-kit applies role="button")
    const buttons = container.querySelectorAll('[role="button"]');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('forwards ref to root <div> with role="region"', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Kanban ref={ref}>
        <Kanban.Column id="col-a">
          <Kanban.Card id="card-1">A</Kanban.Card>
        </Kanban.Column>
      </Kanban>,
    );
    expect(ref.current?.tagName).toBe('DIV');
    expect(ref.current?.getAttribute('role')).toBe('region');
  });

  it('Column forwards ref to its <div>', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Kanban>
        <Kanban.Column ref={ref} id="col-a">
          <Kanban.Card id="card-1">A</Kanban.Card>
        </Kanban.Column>
      </Kanban>,
    );
    expect(ref.current?.tagName).toBe('DIV');
  });

  it('Card forwards ref to its <div>; role="article" when Handle is present', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Kanban>
        <Kanban.Column id="col-a">
          <Kanban.Card ref={ref} id="card-1">
            <Kanban.Handle aria-label="Drag" />
            Content
          </Kanban.Card>
        </Kanban.Column>
      </Kanban>,
    );
    expect(ref.current?.tagName).toBe('DIV');
    expect(ref.current?.getAttribute('role')).toBe('article');
  });

  it('merges consumer className on root, Column, and Card', () => {
    const { container } = render(
      <Kanban className="custom-board">
        <Kanban.Column id="col-a" className="custom-col">
          <Kanban.Card id="card-1" className="custom-card">
            A
          </Kanban.Card>
        </Kanban.Column>
      </Kanban>,
    );
    expect(container.querySelector('[role="region"]')?.className).toContain('custom-board');
    // Column div
    const allDivs = container.querySelectorAll('div');
    const colDiv = Array.from(allDivs).find((d) => d.className.includes('custom-col'));
    expect(colDiv).not.toBeNull();
    // Card div
    const cardDiv = Array.from(allDivs).find((d) => d.className.includes('custom-card'));
    expect(cardDiv).not.toBeNull();
  });

  it('Column and Card ids accept both string and number', () => {
    const { container } = render(
      <Kanban>
        <Kanban.Column id="string-col">
          <Kanban.Card id="string-card">String id</Kanban.Card>
        </Kanban.Column>
        <Kanban.Column id={42}>
          <Kanban.Card id={99}>Number id</Kanban.Card>
        </Kanban.Column>
      </Kanban>,
    );
    // Both columns render — there should be at least 2 column divs inside the region
    const region = container.querySelector('[role="region"]')!;
    expect(region.children.length).toBe(2);
  });

  it('renders an empty Column without crashing', () => {
    const { container } = render(
      <Kanban>
        <Kanban.Column id="empty" />
      </Kanban>,
    );
    expect(container.querySelector('[role="region"]')).not.toBeNull();
  });

  it('renders multiple Columns in source order', () => {
    const { container } = render(
      <Kanban>
        <Kanban.Column id="first">
          <Kanban.Card id="a">A</Kanban.Card>
        </Kanban.Column>
        <Kanban.Column id="second">
          <Kanban.Card id="b">B</Kanban.Card>
        </Kanban.Column>
        <Kanban.Column id="third">
          <Kanban.Card id="c">C</Kanban.Card>
        </Kanban.Column>
      </Kanban>,
    );
    const region = container.querySelector('[role="region"]')!;
    expect(region.children).toHaveLength(3);
  });

  it('Kanban.Handle is the same reference as SortableHandle', () => {
    expect(Kanban.Handle).toBe(SortableHandle);
  });

  it('renders without console warnings under default props with Handles', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <Kanban>
        <Kanban.Column id="col-a">
          <Kanban.Card id="card-1">
            <Kanban.Handle aria-label="Drag card 1" />
            Card One
          </Kanban.Card>
          <Kanban.Card id="card-2">
            <Kanban.Handle aria-label="Drag card 2" />
            Card Two
          </Kanban.Card>
        </Kanban.Column>
        <Kanban.Column id="col-b">
          <Kanban.Card id="card-3">
            <Kanban.Handle aria-label="Drag card 3" />
            Card Three
          </Kanban.Card>
        </Kanban.Column>
      </Kanban>,
    );
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });
});
