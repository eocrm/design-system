import { render, screen } from '@testing-library/react';
import { resolve } from 'node:path';
import { createRef } from 'react';
import { compile } from 'sass';
import { CardBody, type CardBodyProps } from '../../index';
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
    const style = document.createElement('style');
    style.textContent = compile(resolve(__dirname, 'Card.module.scss')).css;
    const card = document.createElement('div');
    card.className = 'card fill';
    const control = document.createElement('div');
    control.className = 'card';
    document.head.append(style);
    document.body.append(card, control);

    try {
      const computed = getComputedStyle(card);
      const controlComputed = getComputedStyle(control);
      expect(computed.height).toBe('100%');
      expect(computed.minWidth).toBe('0px');
      expect(controlComputed.height).not.toBe('100%');
      expect(controlComputed.minWidth).not.toBe('0px');
    } finally {
      card.remove();
      control.remove();
      style.remove();
    }
  });
});

describe('compound API', () => {
  it('exports CardBody as both a named component and Card.Body', () => {
    expect(CardBody).toBeDefined();
    expect(Card.Body).toBe(CardBody);
  });

  it('Card.Body renders the scrolling region under a fixed header', () => {
    const ref = createRef<HTMLDivElement>();
    const bodyProps: CardBodyProps = {
      scroll: true,
      className: 'consumer-class',
      'aria-label': 'Pipeline entries',
    };
    const { container } = render(
      <Card fill>
        <Card.Header>Pipeline</Card.Header>
        <Card.Body ref={ref} data-testid="body" {...bodyProps}>
          Body content
        </Card.Body>
      </Card>,
    );

    const card = container.firstElementChild!;
    const body = screen.getByTestId('body');
    expect(card.className).toMatch(/fillWithBody/);
    expect(card.className).toMatch(/paddingNone/);
    expect(ref.current).toBe(body);
    expect(body.tagName).toBe('DIV');
    expect(body.className).toMatch(/body/);
    expect(body.className).toMatch(/scroll/);
    expect(body.className).toMatch(/consumer-class/);
    expect(body).toHaveAttribute('aria-label', 'Pipeline entries');
    expect(body).not.toHaveAttribute('scroll');
  });

  it('Card.Body without scroll keeps section styling without the scroll modifier', () => {
    const { container } = render(<Card.Body data-region="details">Details</Card.Body>);
    const body = container.firstElementChild!;
    expect(body.className).toMatch(/body/);
    expect(body.className).not.toMatch(/scroll/);
    expect(body).toHaveAttribute('data-region', 'details');
  });

  it('only establishes the internal column chain when fill and Card.Body are combined', () => {
    const { container, rerender } = render(
      <Card>
        <Card.Body>Details</Card.Body>
      </Card>,
    );
    expect(container.firstElementChild!.className).not.toMatch(/fillWithBody/);

    rerender(<Card fill>Plain content</Card>);
    expect(container.firstElementChild!.className).not.toMatch(/fillWithBody/);
  });

  it('owns the shrink-safe column and scrolling-body CSS contract', () => {
    const style = document.createElement('style');
    style.textContent = compile(resolve(__dirname, 'Card.module.scss')).css;
    const card = document.createElement('div');
    card.className = 'card fill fillWithBody';
    const header = document.createElement('div');
    header.className = 'header';
    const body = document.createElement('div');
    body.className = 'body scroll';
    card.append(header, body);
    document.head.append(style);
    document.body.append(card);

    try {
      const cardComputed = getComputedStyle(card);
      const headerComputed = getComputedStyle(header);
      const bodyComputed = getComputedStyle(body);
      expect(cardComputed.display).toBe('flex');
      expect(cardComputed.flexDirection).toBe('column');
      expect(cardComputed.minHeight).toBe('0px');
      expect(headerComputed.flexShrink).toBe('0');
      expect(bodyComputed.minHeight).toBe('0px');
      expect(bodyComputed.flex).toBe('1 1 auto');
      expect(bodyComputed.overflowY).toBe('auto');
      const bodyRule = Array.from(style.sheet!.cssRules).find(
        (rule) => rule instanceof CSSStyleRule && rule.selectorText === '.body',
      );
      expect((bodyRule as CSSStyleRule).style.padding).toBe(
        'var(--card-body-padding-y) var(--card-body-padding-x)',
      );
    } finally {
      card.remove();
      style.remove();
    }
  });

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
