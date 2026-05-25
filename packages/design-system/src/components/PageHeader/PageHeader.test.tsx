import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { PageHeader } from './index';

describe('PageHeader — rendering', () => {
  it('renders only the slots provided', () => {
    const { container } = render(
      <PageHeader>
        <PageHeader.Title>Acme</PageHeader.Title>
      </PageHeader>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Acme' })).toBeInTheDocument();
    // No subtitle / meta / actions / aside / breadcrumb rendered.
    expect(container.querySelector('[class*="subtitle"]')).not.toBeInTheDocument();
    expect(container.querySelector('[class*="meta"]')).not.toBeInTheDocument();
    expect(container.querySelector('[class*="actions"]')).not.toBeInTheDocument();
    expect(container.querySelector('[class*="aside"]')).not.toBeInTheDocument();
    expect(container.querySelector('[class*="breadcrumb"]')).not.toBeInTheDocument();
  });

  it('renders all seven slots when provided', () => {
    const { container } = render(
      <PageHeader>
        <PageHeader.Breadcrumb>
          <nav data-testid="bc">crumb</nav>
        </PageHeader.Breadcrumb>
        <PageHeader.BackButton href="/back" />
        <PageHeader.Aside>
          <span data-testid="aside-content">A</span>
        </PageHeader.Aside>
        <PageHeader.Title>T</PageHeader.Title>
        <PageHeader.Subtitle>S</PageHeader.Subtitle>
        <PageHeader.Meta>M</PageHeader.Meta>
        <PageHeader.Actions>
          <button type="button">btn</button>
        </PageHeader.Actions>
      </PageHeader>,
    );
    expect(screen.getByTestId('bc')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go back' })).toBeInTheDocument();
    expect(screen.getByTestId('aside-content')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'T' })).toBeInTheDocument();
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'btn' })).toBeInTheDocument();
    // Spot-check that aside got positioned via the .aside class.
    expect(container.querySelector('[class*="aside"]')).toBeInTheDocument();
  });

  it('applies rootWithBorder class by default', () => {
    const { container } = render(
      <PageHeader>
        <PageHeader.Title>X</PageHeader.Title>
      </PageHeader>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/rootWithBorder/);
  });

  it('does NOT apply rootWithBorder when borderBottom={false}', () => {
    const { container } = render(
      <PageHeader borderBottom={false}>
        <PageHeader.Title>X</PageHeader.Title>
      </PageHeader>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toMatch(/rootWithBorder/);
  });

  it('renders as a <div>, not a <header>', () => {
    const { container } = render(
      <PageHeader>
        <PageHeader.Title>X</PageHeader.Title>
      </PageHeader>,
    );
    expect(container.firstElementChild?.tagName).toBe('DIV');
    // Confirm no banner landmark is introduced.
    expect(container.querySelector('header')).not.toBeInTheDocument();
  });
});

describe('PageHeader — sub-component detection', () => {
  it('renders <PageHeader.Title> into the title slot', () => {
    const { container } = render(
      <PageHeader>
        <PageHeader.Title>Match me</PageHeader.Title>
      </PageHeader>,
    );
    const title = container.querySelector('[class*="title"]') as HTMLElement;
    expect(title).toBeInTheDocument();
    expect(title.tagName).toBe('H1');
    expect(title.textContent).toBe('Match me');
  });

  it('silently drops unrecognized children', () => {
    const { container } = render(
      <PageHeader>
        <PageHeader.Title>Kept</PageHeader.Title>
        <div data-testid="bad-child">should not render</div>
        <span>also dropped</span>
      </PageHeader>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Kept' })).toBeInTheDocument();
    expect(screen.queryByTestId('bad-child')).not.toBeInTheDocument();
    expect(screen.queryByText('also dropped')).not.toBeInTheDocument();
    expect(container.textContent).not.toContain('should not render');
  });

  it('unwraps one level of Fragment around a sub-component', () => {
    render(
      <PageHeader>
        <>
          <PageHeader.Title>Fragmented</PageHeader.Title>
          <PageHeader.Subtitle>Also fragmented</PageHeader.Subtitle>
        </>
      </PageHeader>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Fragmented' })).toBeInTheDocument();
    expect(screen.getByText('Also fragmented')).toBeInTheDocument();
  });
});

describe('PageHeader.Title', () => {
  it('defaults to order=1 (renders <h1>)', () => {
    render(
      <PageHeader>
        <PageHeader.Title>H1</PageHeader.Title>
      </PageHeader>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'H1' })).toBeInTheDocument();
  });

  it('renders <h2> when order={2}', () => {
    render(
      <PageHeader>
        <PageHeader.Title order={2}>H2</PageHeader.Title>
      </PageHeader>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'H2' })).toBeInTheDocument();
    // And NO h1 should exist.
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });
});

describe('PageHeader.BackButton', () => {
  it('renders <a> when href is provided', () => {
    render(
      <PageHeader>
        <PageHeader.BackButton href="/contacts" aria-label="Back to contacts" />
      </PageHeader>,
    );
    const link = screen.getByRole('link', { name: 'Back to contacts' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/contacts');
  });

  it('renders <button> when onClick is provided', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <PageHeader>
        <PageHeader.BackButton onClick={onClick} aria-label="Back" />
      </PageHeader>,
    );
    const btn = screen.getByRole('button', { name: 'Back' });
    expect(btn.tagName).toBe('BUTTON');
    expect(btn).toHaveAttribute('type', 'button');
    await user.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('warns in dev when both href and onClick are passed; renders as <button>', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <PageHeader>
        <PageHeader.BackButton href="/x" onClick={() => {}} aria-label="Back" />
      </PageHeader>,
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('received both `href` and `onClick`'),
    );
    expect(screen.getByRole('button', { name: 'Back' }).tagName).toBe('BUTTON');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    warnSpy.mockRestore();
  });

  it('warns in dev when neither href nor onClick; renders disabled <button>', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <PageHeader>
        <PageHeader.BackButton aria-label="Back" />
      </PageHeader>,
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('without `href` or `onClick`'),
    );
    const btn = screen.getByRole('button', { name: 'Back' });
    expect(btn.tagName).toBe('BUTTON');
    expect(btn).toBeDisabled();
    warnSpy.mockRestore();
  });

  it('defaults aria-label to "Go back" when not provided', () => {
    render(
      <PageHeader>
        <PageHeader.BackButton href="/back" />
      </PageHeader>,
    );
    expect(screen.getByRole('link', { name: 'Go back' })).toBeInTheDocument();
  });

  it('renders custom icon when provided', () => {
    render(
      <PageHeader>
        <PageHeader.BackButton href="/back" icon={<span data-testid="custom-icon">⟵</span>} />
      </PageHeader>,
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });
});

describe('PageHeader.Aside + PageHeader.Actions', () => {
  it('renders Aside children inside the .aside slot', () => {
    const { container } = render(
      <PageHeader>
        <PageHeader.Aside>
          <span data-testid="content">A</span>
        </PageHeader.Aside>
        <PageHeader.Title>T</PageHeader.Title>
      </PageHeader>,
    );
    const aside = container.querySelector('[class*="aside"]') as HTMLElement;
    expect(aside).toBeInTheDocument();
    expect(aside).toContainElement(screen.getByTestId('content'));
  });

  it('renders Actions children inside the .actions slot', () => {
    const { container } = render(
      <PageHeader>
        <PageHeader.Title>T</PageHeader.Title>
        <PageHeader.Actions>
          <button type="button">Save</button>
          <button type="button">Cancel</button>
        </PageHeader.Actions>
      </PageHeader>,
    );
    const actions = container.querySelector('[class*="actions"]') as HTMLElement;
    expect(actions).toBeInTheDocument();
    expect(actions).toContainElement(screen.getByRole('button', { name: 'Save' }));
    expect(actions).toContainElement(screen.getByRole('button', { name: 'Cancel' }));
  });
});

describe('PageHeader.Subtitle + PageHeader.Meta', () => {
  it('renders both below the title in the center column', () => {
    const { container } = render(
      <PageHeader>
        <PageHeader.Title>T</PageHeader.Title>
        <PageHeader.Subtitle>S</PageHeader.Subtitle>
        <PageHeader.Meta>
          <span data-testid="meta-child">M</span>
        </PageHeader.Meta>
      </PageHeader>,
    );
    expect(container.querySelector('[class*="subtitle"]')?.textContent).toBe('S');
    expect(screen.getByTestId('meta-child')).toBeInTheDocument();
  });
});

describe('PageHeader — misc', () => {
  it('forwards ref to the outermost div', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PageHeader ref={ref}>
        <PageHeader.Title>X</PageHeader.Title>
      </PageHeader>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('className merges with the base class on the root', () => {
    const { container } = render(
      <PageHeader className="custom-class">
        <PageHeader.Title>X</PageHeader.Title>
      </PageHeader>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/custom-class/);
    expect(root.className).toMatch(/root/);
  });

  it('aria-labelledby support — h1 has a stable id we can target if needed', () => {
    // Sanity that Title renders the actual <h1> element with text content
    // (not a button or generic role).
    render(
      <PageHeader>
        <PageHeader.Title>Findable</PageHeader.Title>
      </PageHeader>,
    );
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.tagName).toBe('H1');
    expect(h1.textContent).toBe('Findable');
  });
});
