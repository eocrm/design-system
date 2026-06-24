import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
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

  it('omits the bottom bar when there are no actions', () => {
    const { container } = render(<MediaTile media={<div>M</div>} title="x" />);
    expect(container.querySelector('[class*="barBottom"]')).toBeNull();
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
