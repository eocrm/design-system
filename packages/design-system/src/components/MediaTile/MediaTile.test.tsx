import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRef } from 'react';
import { fireEvent } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MediaTile, type MediaTileProps } from './MediaTile';

function renderTile(props: Partial<MediaTileProps> = {}) {
  return render(
    <MediaTile
      media={<div data-testid="media">M</div>}
      title="photo.jpg"
      meta="2 MB"
      actions={<button>Del</button>}
      {...props}
    />,
  );
}

describe('MediaTile', () => {
  it('renders the media, title, meta, and actions', () => {
    renderTile();
    expect(screen.getByTestId('media')).toBeInTheDocument();
    expect(screen.getByText('photo.jpg')).toBeInTheDocument();
    expect(screen.getByText('2 MB')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Del' })).toBeInTheDocument();
  });

  it('renders the action buttons at rest (no hover) so they stay tabbable', () => {
    renderTile();
    expect(screen.getByRole('button', { name: 'Del' })).toBeInTheDocument();
  });

  it("defaults revealOn to 'hover'", () => {
    const { container } = renderTile();
    expect((container.firstChild as HTMLElement).className).toMatch(/reveal-hover/);
  });

  it.each(['hover', 'focus', 'visible'] as const)('revealOn=%s applies the matching class', (r) => {
    const { container } = renderTile({ revealOn: r });
    expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(`reveal-${r}`));
  });

  it("defaults radius to 'md'", () => {
    const { container } = renderTile();
    expect((container.firstChild as HTMLElement).className).toMatch(/radius-md/);
  });

  it.each(['none', 'sm', 'md', 'lg'] as const)('radius=%s applies the matching class', (rad) => {
    const { container } = renderTile({ radius: rad });
    expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(`radius-${rad}`));
  });

  it('omits the top bar when there is no title and no meta', () => {
    const { container } = render(<MediaTile media={<div>M</div>} actions={<button>Del</button>} />);
    expect(container.querySelector('[class*="barTop"]')).toBeNull();
  });

  it("a click on the overlay bar's empty scrim still reaches the tile onClick", () => {
    const onClick = vi.fn();
    const { container } = render(
      <MediaTile
        media={<div>M</div>}
        actions={<button type="button">Del</button>}
        onClick={onClick}
      />,
    );
    fireEvent.click(container.querySelector('[class*="barBottom"]')!);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('omits the bottom bar when there are no actions', () => {
    const { container } = render(<MediaTile media={<div>M</div>} title="x" />);
    expect(container.querySelector('[class*="barBottom"]')).toBeNull();
  });

  it("defaults captionPlacement to 'overlay' (caption in the top bar, actions in the bottom bar)", () => {
    const { container } = renderTile();
    const root = container.firstChild as HTMLElement;
    expect(root.className).not.toMatch(/placement-below/);
    expect(container.querySelector('[class*="barTop"]')).toHaveTextContent('photo.jpg');
    expect(container.querySelector('[class*="barBottom"]')).toContainElement(
      screen.getByRole('button', { name: 'Del' }),
    );
    expect(container.querySelector('[class*="caption"]')).toBeNull();
  });

  it("captionPlacement='below' renders a caption bar below the media and actions top-right", () => {
    const { container } = renderTile({ captionPlacement: 'below' });
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/placement-below/);
    const caption = container.querySelector('[class*="caption"]') as HTMLElement;
    expect(caption).toHaveTextContent('photo.jpg');
    expect(caption).toHaveTextContent('2 MB');
    // Caption is a sibling after the media area, not an overlay inside it.
    expect(root.lastElementChild).toBe(caption);
    expect(container.querySelector('[class*="barTop"]')).toBeNull();
    expect(container.querySelector('[class*="barBottom"]')).toBeNull();
    expect(container.querySelector('[class*="actionsTop"]')).toContainElement(
      screen.getByRole('button', { name: 'Del' }),
    );
  });

  describe("controls='bar'", () => {
    const bar = (container: HTMLElement) =>
      container.querySelector('[class*="controlBar"]') as HTMLElement;

    it('defaults to chips: no control bar', () => {
      const { container } = renderTile({ captionPlacement: 'below', selectable: true });
      expect(bar(container)).toBeNull();
      expect(container.querySelector('[class*="actionsTop"]')).not.toBeNull();
    });

    it('renders checkbox and actions in one bar, no chips', () => {
      const { container } = renderTile({
        captionPlacement: 'below',
        controls: 'bar',
        selectable: true,
      });
      const b = bar(container);
      expect(b).toContainElement(screen.getByRole('checkbox'));
      expect(b).toContainElement(screen.getByRole('button', { name: 'Del' }));
      expect(container.querySelector('[class*="chip"]')).toBeNull();
    });

    it('is ignored in overlay placement', () => {
      const { container } = renderTile({ controls: 'bar', selectable: true });
      expect(bar(container)).toBeNull();
      expect(container.querySelector('[class*="barBottom"]')).not.toBeNull();
    });

    it('a free-space click toggles selection both ways without reaching the tile', () => {
      const onSelectedChange = vi.fn();
      const onClick = vi.fn();
      const props = {
        captionPlacement: 'below',
        controls: 'bar',
        selectable: true,
        onSelectedChange,
        onClick,
      } as const;
      const { container, rerender } = renderTile(props);
      fireEvent.click(bar(container));
      expect(onSelectedChange).toHaveBeenLastCalledWith(true);
      rerender(
        <MediaTile
          media={<div />}
          title="photo.jpg"
          actions={<button>Del</button>}
          {...props}
          selected
        />,
      );
      fireEvent.click(bar(container));
      expect(onSelectedChange).toHaveBeenLastCalledWith(false);
      expect(onSelectedChange).toHaveBeenCalledTimes(2);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('checkbox and action clicks fire once and never reach the tile', async () => {
      const onSelectedChange = vi.fn();
      const onClick = vi.fn();
      const onDel = vi.fn();
      renderTile({
        captionPlacement: 'below',
        controls: 'bar',
        selectable: true,
        onSelectedChange,
        onClick,
        actions: <button onClick={onDel}>Del</button>,
      });
      await userEvent.click(screen.getByRole('checkbox'));
      expect(onSelectedChange).toHaveBeenCalledTimes(1);
      await userEvent.click(screen.getByRole('button', { name: 'Del' }));
      expect(onDel).toHaveBeenCalledTimes(1);
      expect(onSelectedChange).toHaveBeenCalledTimes(1);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('without selectable a free-space click does nothing and stays off the tile', () => {
      const onClick = vi.fn();
      const { container } = renderTile({ captionPlacement: 'below', controls: 'bar', onClick });
      expect(screen.queryByRole('checkbox')).toBeNull();
      fireEvent.click(bar(container));
      expect(onClick).not.toHaveBeenCalled();
    });

    it('keys inside the bar never reach the tile', () => {
      const onKeyDown = vi.fn();
      renderTile({ captionPlacement: 'below', controls: 'bar', onKeyDown });
      fireEvent.keyDown(screen.getByRole('button', { name: 'Del' }), { key: 'Enter' });
      expect(onKeyDown).not.toHaveBeenCalled();
    });
  });

  it('renders no checkbox unless selectable', () => {
    renderTile();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('names the checkbox with selectLabel, else "Select {title}", else "Select"', () => {
    const { rerender } = renderTile({ selectable: true, selectLabel: 'Pick photo' });
    expect(screen.getByRole('checkbox', { name: 'Pick photo' })).toBeInTheDocument();
    rerender(<MediaTile media={<div>M</div>} title="photo.jpg" selectable />);
    expect(screen.getByRole('checkbox', { name: 'Select photo.jpg' })).toBeInTheDocument();
    rerender(<MediaTile media={<div>M</div>} title={<b>photo.jpg</b>} selectable />);
    expect(screen.getByRole('checkbox', { name: 'Select' })).toBeInTheDocument();
  });

  it('reflects selected on the checkbox and data-selected on the root', () => {
    const { container, rerender } = renderTile({ selectable: true });
    const root = container.firstChild as HTMLElement;
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(root).not.toHaveAttribute('data-selected');
    rerender(<MediaTile media={<div>M</div>} title="photo.jpg" selectable selected />);
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(root).toHaveAttribute('data-selected');
  });

  it('puts the checkbox before the actions in tab order', () => {
    renderTile({ selectable: true, captionPlacement: 'below' });
    const checkbox = screen.getByRole('checkbox');
    const action = screen.getByRole('button', { name: 'Del' });
    expect(
      checkbox.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('ignores selected when not selectable', () => {
    const { container } = renderTile({ selected: true });
    expect(container.firstChild).not.toHaveAttribute('data-selected');
  });

  it('calls onSelectedChange(next) without triggering the tile onClick', async () => {
    const onSelectedChange = vi.fn();
    const onClick = vi.fn();
    const { rerender } = renderTile({ selectable: true, onSelectedChange, onClick });
    await userEvent.click(screen.getByRole('checkbox'));
    expect(onSelectedChange).toHaveBeenLastCalledWith(true);
    rerender(
      <MediaTile
        media={<div>M</div>}
        title="photo.jpg"
        selectable
        selected
        onSelectedChange={onSelectedChange}
        onClick={onClick}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox'));
    expect(onSelectedChange).toHaveBeenLastCalledWith(false);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('clicking the tile body fires onClick and does not toggle selection', async () => {
    const onSelectedChange = vi.fn();
    const onClick = vi.fn();
    renderTile({ selectable: true, onSelectedChange, onClick });
    await userEvent.click(screen.getByTestId('media'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onSelectedChange).not.toHaveBeenCalled();
  });

  it('forwards ref to the root div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<MediaTile ref={ref} media={<div>M</div>} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges className and spreads HTML attributes', () => {
    const { container } = render(
      <MediaTile media={<div>M</div>} className="custom" data-testid="tile" />,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/custom/);
    expect(root).toHaveAttribute('data-testid', 'tile');
  });
});

describe('MediaTile — events from controls do not reach the tile', () => {
  it.each(['overlay', 'below'] as const)(
    '%s: clicking an action button does not fire the tile onClick',
    async (placement) => {
      const onClick = vi.fn();
      const onAction = vi.fn();
      renderTile({
        captionPlacement: placement,
        onClick,
        actions: <button onClick={onAction}>Download</button>,
      });
      await userEvent.click(screen.getByRole('button', { name: 'Download' }));
      expect(onAction).toHaveBeenCalledTimes(1);
      expect(onClick).not.toHaveBeenCalled();
    },
  );

  it.each(['overlay', 'below'] as const)(
    '%s: keydown in the checkbox or an action does not reach the tile onKeyDown',
    (placement) => {
      const onKeyDown = vi.fn();
      renderTile({ captionPlacement: placement, selectable: true, onKeyDown });
      fireEvent.keyDown(screen.getByRole('checkbox'), { key: ' ' });
      fireEvent.keyDown(screen.getByRole('button', { name: 'Del' }), { key: 'Enter' });
      expect(onKeyDown).not.toHaveBeenCalled();
    },
  );
});

describe('MediaTile — reveal + selection CSS (source-pinned)', () => {
  const scss = readFileSync(resolve(__dirname, 'MediaTile.module.scss'), 'utf8');
  // The rule block that makes revealed controls visible + interactive.
  const shownRule = scss.match(
    /([^{}]*)\{\s*opacity: var\(--mediatile-opacity-shown\);\s*pointer-events: auto;/,
  )!;
  const shownSelectors = shownRule[1];

  it('a checked checkbox (selected tile) is always shown', () => {
    expect(shownSelectors).toMatch(/\.root\[data-selected\] :is\(\.select, \.controlBar\)/);
  });

  it.each(['hover:hover', 'hover:focus-within', 'focus:focus-within', 'visible'])(
    'reveal-%s shows the bars AND the chips (below-placement actions + select)',
    (sel) => {
      const re = new RegExp(`\\.reveal-${sel} :is\\(\\.bar, \\.chip\\)`);
      expect(shownSelectors).toMatch(re);
    },
  );

  it('(hover: none) makes reveal-hover bars and chips visible (both placements)', () => {
    const block = scss.match(/@media \(hover: none\) \{[\s\S]*?\n\}/)![0];
    expect(block).toMatch(/\.reveal-hover :is\(\.bar, \.chip\) \{/);
    expect(block).toMatch(/opacity: var\(--mediatile-opacity-shown\);/);
    expect(block).toMatch(/pointer-events: auto;/);
  });

  it('the selected ring is an ::after painted above the media, ignoring pointers', () => {
    expect(scss).toMatch(/\.root \{[^}]*position: relative;/);
    const ring = scss.match(/\.root\[data-selected\]::after \{[^}]*\}/)![0];
    expect(ring).toMatch(/content: '';/);
    expect(ring).toMatch(/position: absolute;/);
    expect(ring).toMatch(/inset: 0;/);
    expect(ring).toMatch(/pointer-events: none;/);
    expect(ring).toMatch(
      /box-shadow: inset 0 0 0 var\(--mediatile-selected-ring-width\) var\(--mediatile-selected-ring\);/,
    );
  });
});
