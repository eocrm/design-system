import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SortableGroup } from './SortableGroup';
import { Sortable } from '../Sortable';

// Each Item carries a <Sortable.Handle> — the keyboard-drag harness below
// activates the drag via the Handle button (Space to pick up, Arrow to move,
// Space to drop), mirroring dnd-kit's canonical Space-pickup flow.
function Group(props: { onMove?: (e: unknown) => void }) {
  return (
    <SortableGroup onMove={props.onMove}>
      <SortableGroup.Container id="a" items={['x', 'y']}>
        <Sortable.Item id="x">
          <Sortable.Handle aria-label="Reorder X">hx</Sortable.Handle>X
        </Sortable.Item>
        <Sortable.Item id="y">
          <Sortable.Handle aria-label="Reorder Y">hy</Sortable.Handle>Y
        </Sortable.Item>
      </SortableGroup.Container>
      <SortableGroup.Container id="b" items={['p']}>
        <Sortable.Item id="p">
          <Sortable.Handle aria-label="Reorder P">hp</Sortable.Handle>P
        </Sortable.Item>
      </SortableGroup.Container>
    </SortableGroup>
  );
}

// dnd-kit's KeyboardSensor + sortableKeyboardCoordinates compute the next drop
// target from each sortable item's bounding rect. jsdom reports zero-size rects
// for everything, which leaves the sensor unable to find a neighbour — so we
// stub getBoundingClientRect to hand each successive element a distinct,
// stacked 100x40 box. That gives the within-container keyboard reorder real
// vertical geometry to resolve against. Returns a restore fn.
function stubStackedRects(): () => void {
  let top = 0;
  const orig = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    const t = (top += 50);
    return {
      x: 0,
      y: t,
      top: t,
      left: 0,
      right: 100,
      bottom: t + 40,
      width: 100,
      height: 40,
      toJSON() {},
    } as DOMRect;
  };
  return () => {
    Element.prototype.getBoundingClientRect = orig;
  };
}

describe('SortableGroup', () => {
  it('renders all containers and items, one <ol> per container', () => {
    render(<Group />);
    expect(screen.getByText('X')).toBeInTheDocument();
    expect(screen.getByText('Y')).toBeInTheDocument();
    expect(screen.getByText('P')).toBeInTheDocument();
    expect(document.querySelectorAll('ol').length).toBe(2);
  });

  it('renders each container as an <ol> with a <li> per item', () => {
    render(<Group />);
    const lists = document.querySelectorAll('ol');
    expect(lists[0].querySelectorAll('li').length).toBe(2);
    expect(lists[1].querySelectorAll('li').length).toBe(1);
  });

  it('throws if Container is used outside SortableGroup', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(
        <SortableGroup.Container id="a" items={[]}>
          {null}
        </SortableGroup.Container>,
      ),
    ).toThrow(/must be used inside <SortableGroup>/);
    err.mockRestore();
  });

  it('Container forwards its ref to the underlying <ol>', () => {
    let node: HTMLOListElement | null = null;
    render(
      <SortableGroup>
        <SortableGroup.Container
          id="a"
          items={['x']}
          ref={(el) => {
            node = el;
          }}
        >
          <Sortable.Item id="x">X</Sortable.Item>
        </SortableGroup.Container>
      </SortableGroup>,
    );
    expect(node).not.toBeNull();
    expect(node!.tagName).toBe('OL');
  });

  it('merges a consumer className onto the Container <ol>', () => {
    render(
      <SortableGroup>
        <SortableGroup.Container id="a" items={['x']} className="custom-list">
          <Sortable.Item id="x">X</Sortable.Item>
        </SortableGroup.Container>
      </SortableGroup>,
    );
    expect(document.querySelector('ol')?.className).toContain('custom-list');
  });

  it('renders no DragOverlay clone at rest (no active drag)', () => {
    render(<Group />);
    // The lifted-overlay marker only appears during an active drag.
    expect(document.querySelectorAll('[data-dragging="true"]').length).toBe(0);
  });

  it('fires onMove for a within-container keyboard reorder with correct indices', async () => {
    // Drive the canonical keyboard drag through the Handle button: focus the
    // first item's handle, Space to pick up, ArrowDown to move past its
    // neighbour, Space to drop. With stacked rects in place dnd-kit resolves
    // the move within container "a".
    const restore = stubStackedRects();
    const onMove = vi.fn();
    const user = userEvent.setup();
    render(<Group onMove={onMove} />);

    screen.getByLabelText('Reorder X').focus();
    await user.keyboard('[Space]'); // pick up "x"
    await user.keyboard('[ArrowDown]'); // move down past "y"
    await user.keyboard('[Space]'); // drop

    restore();

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith({
      id: 'x',
      from: { container: 'a', index: 0 },
      to: { container: 'a', index: 1 },
    });
    // Confirm same-container reorder, not a cross-container handoff.
    const event = onMove.mock.calls[0][0] as {
      from: { container: string };
      to: { container: string };
    };
    expect(event.from.container).toBe(event.to.container);
  });

  it('does not fire onMove when a keyboard drag is cancelled with Escape', async () => {
    const restore = stubStackedRects();
    const onMove = vi.fn();
    const user = userEvent.setup();
    render(<Group onMove={onMove} />);

    screen.getByLabelText('Reorder X').focus();
    await user.keyboard('[Space]'); // pick up
    await user.keyboard('[ArrowDown]'); // move
    await user.keyboard('[Escape]'); // cancel — no drop

    restore();

    expect(onMove).not.toHaveBeenCalled();
  });

  // --- announcements (#390) -------------------------------------------------
  // Ids ('x', 'p') and item text ('Renew Acme') differ, so an announcement that
  // leaked a dnd-kit id would be visible below.
  function NamedGroup() {
    return (
      <SortableGroup>
        <SortableGroup.Container id="a" items={['x', 'y']} aria-label="Open">
          <Sortable.Item id="x">
            <Sortable.Handle aria-label="Reorder first" />
            Renew Acme
          </Sortable.Item>
          <Sortable.Item id="y">
            <Sortable.Handle aria-label="Reorder second" />
            Call Globex
          </Sortable.Item>
        </SortableGroup.Container>
        <SortableGroup.Container id="b" items={['p', 'q']}>
          <Sortable.Item id="p">
            <Sortable.Handle aria-label="Reorder third" />
            Invoice Initech
          </Sortable.Item>
          <Sortable.Item id="q">
            <Sortable.Handle aria-label="Reorder fourth" />
            Ping Hooli
          </Sortable.Item>
        </SortableGroup.Container>
      </SortableGroup>
    );
  }

  it('announces the item text and the container aria-label, not the ids', async () => {
    const restore = stubStackedRects();
    const user = userEvent.setup();
    render(<NamedGroup />);

    screen.getByLabelText('Reorder first').focus();
    await user.keyboard('[Space]');
    await user.keyboard('[ArrowDown]');
    const live = screen.getByRole('status').textContent ?? '';
    await user.keyboard('[Escape]');
    restore();

    expect(live).toBe('Renew Acme, position 2 of 2 in Open.');
    expect(screen.getByRole('status').textContent).toBe(
      'Move cancelled. Renew Acme stayed where it was.',
    );
  });

  it('falls back to the container’s position when it has no aria-label', async () => {
    // No aria-label anywhere, so every container must name itself positionally
    // — never read out the raw container id.
    const restore = stubStackedRects();
    const user = userEvent.setup();
    render(<Group />);

    screen.getByLabelText('Reorder X').focus();
    await user.keyboard('[Space]');
    await user.keyboard('[ArrowDown]');
    const live = screen.getByRole('status').textContent ?? '';
    await user.keyboard('[Escape]');
    restore();

    expect(live).toMatch(/ in list \d of 2\.$/);
    expect(live).not.toMatch(/ in [ab]\./);
  });

  // NOTE: cross-container drags are NOT exercised here. dnd-kit's
  // sortableKeyboardCoordinates resolves the next droppable from real layout
  // geometry; with jsdom's synthetic stacked rects the keyboard sensor cannot
  // detect that the next droppable lives in a different container, so a
  // cross-container handoff never fires onMove in jsdom. Cross-container index
  // math is covered by moveSortableItem.test.ts (the pure reducer) and the
  // Playwright pass (Task 7), which drives real pointer geometry in a browser.
});
