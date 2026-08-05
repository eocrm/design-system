import { render, screen } from '@testing-library/react';
import { resolve } from 'node:path';
import { createRef } from 'react';
import { parse, type Rule } from 'postcss';
import { compile } from 'sass';
import { Card, type CardPadding, type CardTone } from './Card';

describe('Card', () => {
  it('renders its children', () => {
    render(<Card>Body content</Card>);
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('defaults to padding="md" for plain content', () => {
    const { container } = render(<Card>x</Card>);
    expect((container.firstChild as HTMLElement).className).toMatch(/paddingMd/);
  });

  it('auto-defaults to padding="none" when a Card.Header child is present', () => {
    const { container } = render(
      <Card>
        <Card.Header>Title</Card.Header>
      </Card>,
    );
    expect((container.firstChild as HTMLElement).className).toMatch(/paddingNone/);
    expect((container.firstChild as HTMLElement).className).not.toMatch(/paddingMd/);
  });

  it('auto-defaults to padding="none" when a Card.List child is present', () => {
    const { container } = render(
      <Card>
        <Card.List>
          <Card.ListRow>row</Card.ListRow>
        </Card.List>
      </Card>,
    );
    expect((container.firstChild as HTMLElement).className).toMatch(/paddingNone/);
  });

  it('explicit padding overrides the compound auto-detect', () => {
    const { container } = render(
      <Card padding="lg">
        <Card.Header>Title</Card.Header>
      </Card>,
    );
    expect((container.firstChild as HTMLElement).className).toMatch(/paddingLg/);
    expect((container.firstChild as HTMLElement).className).not.toMatch(/paddingNone/);
  });

  it('auto-defaults to padding="none" when a Card.ListRow is a direct child', () => {
    const { container } = render(
      <Card>
        <Card.ListRow>row</Card.ListRow>
      </Card>,
    );
    expect((container.firstChild as HTMLElement).className).toMatch(/paddingNone/);
  });

  it('auto-detect still triggers when compound + plain children are mixed', () => {
    const { container } = render(
      <Card>
        <Card.Header>Title</Card.Header>
        <div>extra footer content</div>
      </Card>,
    );
    expect((container.firstChild as HTMLElement).className).toMatch(/paddingNone/);
  });

  it('auto-detect recurses through a Fragment wrapper', () => {
    const { container } = render(
      <Card>
        <>
          <Card.Header>Title</Card.Header>
        </>
      </Card>,
    );
    expect((container.firstChild as HTMLElement).className).toMatch(/paddingNone/);
  });

  it('auto-detect recurses through nested Fragments', () => {
    const { container } = render(
      <Card>
        <>
          <>
            <Card.Header>Title</Card.Header>
          </>
        </>
      </Card>,
    );
    expect((container.firstChild as HTMLElement).className).toMatch(/paddingNone/);
  });

  it.each<CardPadding>(['none', 'sm', 'md', 'lg'])('applies the %s padding class', (padding) => {
    const { container } = render(<Card padding={padding}>x</Card>);
    const cap = padding[0].toUpperCase() + padding.slice(1);
    expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(`padding${cap}`));
  });

  it('merges the className prop', () => {
    const { container } = render(<Card className="external">x</Card>);
    expect((container.firstChild as HTMLElement).className).toMatch(/external/);
    expect((container.firstChild as HTMLElement).className).toMatch(/card/);
  });

  it('forwards refs to the underlying div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Card ref={ref}>x</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('no tone prop: data-tone attribute is not set', () => {
    const { container } = render(<Card>x</Card>);
    expect(container.firstElementChild).not.toHaveAttribute('data-tone');
  });

  it.each(['accent', 'info', 'success', 'warning', 'danger'] as const)(
    'tone="%s" sets data-tone="%s"',
    (tone: CardTone) => {
      const { container } = render(<Card tone={tone}>x</Card>);
      expect(container.firstElementChild).toHaveAttribute('data-tone', tone);
    },
  );

  it('tone composes with padding without affecting either', () => {
    const { container } = render(
      <Card padding="lg" tone="success">
        x
      </Card>,
    );
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute('data-tone', 'success');
    expect(root.className).toMatch(/padding/);
  });

  it('tone="accent" with custom className merges (does not replace)', () => {
    const { container } = render(
      <Card tone="accent" className="custom">
        x
      </Card>,
    );
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute('data-tone', 'accent');
    expect(root.className).toMatch(/custom/);
  });

  it('overflow defaults to "hidden" — does NOT add the visible modifier class', () => {
    const { container } = render(<Card>x</Card>);
    expect((container.firstChild as HTMLElement).className).not.toMatch(/overflowVisible/);
  });

  it('overflow="visible" adds the modifier class', () => {
    const { container } = render(<Card overflow="visible">x</Card>);
    expect((container.firstChild as HTMLElement).className).toMatch(/overflowVisible/);
  });

  it('overflow="hidden" explicit is equivalent to default (no modifier)', () => {
    const { container } = render(<Card overflow="hidden">x</Card>);
    expect((container.firstChild as HTMLElement).className).not.toMatch(/overflowVisible/);
  });

  it('fill adds the full-height modifier class', () => {
    const { container } = render(<Card fill>x</Card>);
    expect((container.firstChild as HTMLElement).className).toMatch(/fill/);
  });

  it('does not apply or forward fill by default', () => {
    const { container } = render(<Card>x</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).not.toMatch(/fill/);
    expect(card).not.toHaveAttribute('fill');
  });

  it('fill owns the full-height and shrink-safe CSS contract', () => {
    const root = parse(compile(resolve(__dirname, 'Card.module.scss')).css);
    const rules: Rule[] = [];
    root.walkRules((rule) => {
      if (rule.selectors.includes('.fill')) rules.push(rule);
    });

    const declarations = new Map<string, { value: string; important: boolean | undefined }>();
    for (const rule of rules) {
      for (const node of rule.nodes) {
        if (node.type === 'decl') {
          declarations.set(node.prop, { value: node.value, important: node.important });
        }
      }
    }

    expect(declarations.get('height')).toEqual({ value: '100%', important: undefined });
    expect(declarations.get('min-width')).toEqual({ value: '0', important: undefined });
  });
});

describe('compound API', () => {
  it('Card.Header renders <div> with default <h3> title', () => {
    const { container } = render(<Card.Header>Title</Card.Header>);
    expect(container.querySelector('h3')).toHaveTextContent('Title');
  });

  it('headerLevel="h2" wraps the title in <h2>', () => {
    const { container } = render(<Card.Header headerLevel="h2">T</Card.Header>);
    expect(container.querySelector('h2')).toBeInTheDocument();
  });

  it('action prop renders inside the header', () => {
    render(<Card.Header action={<button data-testid="act">View all</button>}>T</Card.Header>);
    expect(screen.getByTestId('act')).toBeInTheDocument();
  });

  it('no action prop → no action span', () => {
    const { container } = render(<Card.Header>T</Card.Header>);
    expect(container.querySelectorAll('span').length).toBe(0);
  });

  it('Card.List renders a <ul>', () => {
    const { container } = render(
      <Card.List>
        <Card.ListRow>x</Card.ListRow>
      </Card.List>,
    );
    expect(container.querySelector('ul')).toBeInTheDocument();
  });

  it('Card.ListRow renders an <li> with content', () => {
    const { container } = render(
      <Card.List>
        <Card.ListRow>row content</Card.ListRow>
      </Card.List>,
    );
    const li = container.querySelector('li');
    expect(li).toHaveTextContent('row content');
  });

  it('last ListRow is the expected element (last-child smoke test)', () => {
    // Smoke test only — we can't query computed styles for the SCSS rule in
    // jsdom, but we can verify the last-child is the expected element.
    const { container } = render(
      <Card.List>
        <Card.ListRow>a</Card.ListRow>
        <Card.ListRow>b</Card.ListRow>
        <Card.ListRow data-testid="last">c</Card.ListRow>
      </Card.List>,
    );
    const lis = container.querySelectorAll('li');
    expect(lis[lis.length - 1]).toHaveAttribute('data-testid', 'last');
  });

  it('compound composes: Card > Header + List > ListRow (no padding prop needed)', () => {
    const { container } = render(
      <Card>
        <Card.Header>Title</Card.Header>
        <Card.List>
          <Card.ListRow>Row 1</Card.ListRow>
          <Card.ListRow>Row 2</Card.ListRow>
        </Card.List>
      </Card>,
    );
    expect(container.querySelector('h3')).toHaveTextContent('Title');
    expect(container.querySelectorAll('li').length).toBe(2);
    expect((container.firstChild as HTMLElement).className).toMatch(/paddingNone/);
  });

  it('Card.Header className merges (does not replace) with base header class', () => {
    const { container } = render(<Card.Header className="custom">T</Card.Header>);
    const header = container.firstElementChild!;
    expect(header.className).toMatch(/header/);
    expect(header.className).toMatch(/custom/);
  });
});
