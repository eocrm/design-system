import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Badge, type BadgeSize, type BadgeTone } from './Badge';

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('defaults to the neutral tone', () => {
    const { container } = render(<Badge>x</Badge>);
    expect((container.firstChild as HTMLElement).className).toMatch(/neutral/);
  });

  it.each<BadgeTone>(['neutral', 'info', 'success', 'warning', 'danger', 'purple'])(
    'applies the %s tone class',
    (tone) => {
      const { container } = render(<Badge tone={tone}>x</Badge>);
      expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(tone));
    },
  );

  it('defaults to the md size', () => {
    const { container } = render(<Badge>x</Badge>);
    expect((container.firstChild as HTMLElement).className).toMatch(/md/);
  });

  it.each<BadgeSize>(['sm', 'md'])('applies the %s size class', (size) => {
    const { container } = render(<Badge size={size}>x</Badge>);
    expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(size));
  });

  it('merges the className prop with internal classes', () => {
    const { container } = render(<Badge className="external">x</Badge>);
    expect((container.firstChild as HTMLElement).className).toMatch(/external/);
    expect((container.firstChild as HTMLElement).className).toMatch(/badge/);
  });

  it('forwards refs to the underlying span', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Badge ref={ref}>x</Badge>);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });

  it('does not render a dot by default', () => {
    const { container } = render(<Badge>x</Badge>);
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('renders a dot before the content when dot="start"', () => {
    const { container } = render(<Badge dot="start">Active</Badge>);
    const root = container.firstChild as HTMLElement;
    const dot = root.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(dot).not.toBeNull();
    expect(dot.className).toMatch(/dot/);
    expect(root.firstChild).toBe(dot);
  });

  it('renders a dot after the content when dot="end"', () => {
    const { container } = render(<Badge dot="end">Active</Badge>);
    const root = container.firstChild as HTMLElement;
    const dot = root.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(dot).not.toBeNull();
    expect(dot.className).toMatch(/dot/);
    expect(root.lastChild).toBe(dot);
  });

  it('marks the dot as decorative so the badge text remains the accessible label', () => {
    const { container } = render(<Badge dot="start">Active</Badge>);
    const dot = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(dot.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('default variant is "filled" (no stripe class)', () => {
    const { container } = render(<Badge tone="success">x</Badge>);
    expect(container.firstElementChild!.className).not.toMatch(/stripe/);
  });

  it('variant="filled" explicit: no stripe class', () => {
    const { container } = render(
      <Badge variant="filled" tone="success">
        x
      </Badge>,
    );
    expect(container.firstElementChild!.className).not.toMatch(/stripe/);
  });

  it('variant="stripe" adds the stripe class', () => {
    const { container } = render(
      <Badge variant="stripe" tone="success">
        x
      </Badge>,
    );
    expect(container.firstElementChild!.className).toMatch(/stripe/);
  });

  it('variant="stripe" composes with tone (both classes present)', () => {
    const { container } = render(
      <Badge variant="stripe" tone="warning">
        x
      </Badge>,
    );
    const root = container.firstElementChild!;
    expect(root.className).toMatch(/stripe/);
    expect(root.className).toMatch(/warning/);
  });

  it.each(['sm', 'md'] as const)(
    'variant="stripe" + size="%s": size class still applies',
    (size: BadgeSize) => {
      const { container } = render(
        <Badge variant="stripe" size={size} tone="info">
          x
        </Badge>,
      );
      expect(container.firstElementChild!.className).toMatch(new RegExp(size));
    },
  );

  it('color="amber" sets inline bg + color using palette tokens (filled)', () => {
    const { container } = render(<Badge color="amber">Tag</Badge>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.background).toBe('var(--color-palette-amber-bg)');
    expect(root.style.color).toBe('var(--color-palette-amber-fg)');
    expect(root.style.borderLeftColor).toBe('');
  });

  it('color="violet" on stripe variant also sets borderLeftColor', () => {
    const { container } = render(
      <Badge variant="stripe" color="violet">
        Tag
      </Badge>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.background).toBe('var(--color-palette-violet-bg)');
    expect(root.style.color).toBe('var(--color-palette-violet-fg)');
    expect(root.style.borderLeftColor).toBe('var(--color-palette-violet-fg)');
  });

  it('no color prop means no palette inline style is set', () => {
    const { container } = render(<Badge tone="success">Active</Badge>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.background).toBe('');
    expect(root.style.color).toBe('');
  });

  it('consumer style merges on top of palette style (consumer override wins)', () => {
    const { container } = render(
      <Badge color="amber" style={{ background: 'red' }}>
        Tag
      </Badge>,
    );
    expect((container.firstElementChild as HTMLElement).style.background).toBe('red');
  });
});

describe('Badge align (#327)', () => {
  it('align="middle" adds the alignMiddle class', () => {
    render(<Badge align="middle">To Do</Badge>);
    expect(screen.getByText('To Do').className).toMatch(/alignMiddle/);
  });
  it('no align class by default (baseline = current behavior)', () => {
    render(<Badge>To Do</Badge>);
    expect(screen.getByText('To Do').className).not.toMatch(/alignMiddle/);
  });
});
