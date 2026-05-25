import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { DefinitionList } from './DefinitionList';

describe('DefinitionList', () => {
  it('renders <dl> with default props', () => {
    const { container } = render(
      <DefinitionList>
        <DefinitionList.Item>
          <DefinitionList.Term>Email</DefinitionList.Term>
          <DefinitionList.Description>ada@example.com</DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>,
    );
    const dl = container.querySelector('dl');
    expect(dl).not.toBeNull();
    expect(dl!.getAttribute('data-layout')).toBe('horizontal');
    expect(dl!.getAttribute('data-spacing')).toBe('md');
    expect(dl!.getAttribute('data-dividers')).toBeNull();
  });

  it('forwards ref to the underlying <dl>', () => {
    const ref = createRef<HTMLDListElement>();
    render(
      <DefinitionList ref={ref}>
        <DefinitionList.Item>
          <DefinitionList.Term>Email</DefinitionList.Term>
          <DefinitionList.Description>ada@example.com</DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>,
    );
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('DL');
  });

  it('merges consumer className with the internal class on root', () => {
    const { container } = render(
      <DefinitionList className="custom-dl">
        <DefinitionList.Item>
          <DefinitionList.Term>Email</DefinitionList.Term>
          <DefinitionList.Description>ada@example.com</DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>,
    );
    const dl = container.querySelector('dl');
    expect(dl?.className).toContain('custom-dl');
    // Internal class is hashed by CSS Modules; we just check the consumer's class is present.
    expect(dl?.className.split(' ').length).toBeGreaterThan(1);
  });

  it('renders Item as <div>, Term as <dt>, Description as <dd>', () => {
    const { container } = render(
      <DefinitionList>
        <DefinitionList.Item>
          <DefinitionList.Term>Email</DefinitionList.Term>
          <DefinitionList.Description>ada@example.com</DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>,
    );
    expect(container.querySelector('dl > div')).not.toBeNull();
    expect(container.querySelector('dl > div > dt')?.textContent).toBe('Email');
    expect(container.querySelector('dl > div > dd')?.textContent).toBe('ada@example.com');
  });

  it('renders icon before description text, wrapped in aria-hidden span', () => {
    render(
      <DefinitionList>
        <DefinitionList.Item>
          <DefinitionList.Term>Email</DefinitionList.Term>
          <DefinitionList.Description icon={<svg data-testid="email-icon" />}>
            ada@example.com
          </DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>,
    );
    const dd = screen.getByText('ada@example.com').closest('dd');
    expect(dd).not.toBeNull();
    const iconWrapper = dd!.firstElementChild;
    expect(iconWrapper?.tagName).toBe('SPAN');
    expect(iconWrapper?.getAttribute('aria-hidden')).toBe('true');
    expect(iconWrapper?.querySelector('[data-testid="email-icon"]')).not.toBeNull();
  });

  it('renders Description without icon wrapper when icon prop is omitted', () => {
    const { container } = render(
      <DefinitionList>
        <DefinitionList.Item>
          <DefinitionList.Term>Email</DefinitionList.Term>
          <DefinitionList.Description>ada@example.com</DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>,
    );
    const dd = container.querySelector('dd');
    expect(dd?.querySelector('span[aria-hidden="true"]')).toBeNull();
    expect(dd?.textContent).toBe('ada@example.com');
  });

  it('applies layout="horizontal" via data-layout attribute', () => {
    const { container } = render(
      <DefinitionList layout="horizontal">
        <DefinitionList.Item>
          <DefinitionList.Term>x</DefinitionList.Term>
          <DefinitionList.Description>y</DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>,
    );
    expect(container.querySelector('dl')?.getAttribute('data-layout')).toBe('horizontal');
  });

  it('applies layout="stacked" via data-layout attribute', () => {
    const { container } = render(
      <DefinitionList layout="stacked">
        <DefinitionList.Item>
          <DefinitionList.Term>x</DefinitionList.Term>
          <DefinitionList.Description>y</DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>,
    );
    expect(container.querySelector('dl')?.getAttribute('data-layout')).toBe('stacked');
  });

  it('sets --dl-term-width CSS variable inline on root when termWidth is provided', () => {
    const { container } = render(
      <DefinitionList termWidth="180px">
        <DefinitionList.Item>
          <DefinitionList.Term>x</DefinitionList.Term>
          <DefinitionList.Description>y</DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>,
    );
    const dl = container.querySelector('dl') as HTMLElement;
    expect(dl.style.getPropertyValue('--dl-term-width')).toBe('180px');
  });

  it.each(['sm', 'md', 'lg'] as const)('applies data-spacing="%s"', (spacing) => {
    const { container } = render(
      <DefinitionList spacing={spacing}>
        <DefinitionList.Item>
          <DefinitionList.Term>x</DefinitionList.Term>
          <DefinitionList.Description>y</DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>,
    );
    expect(container.querySelector('dl')?.getAttribute('data-spacing')).toBe(spacing);
  });

  it('applies data-dividers="true" when dividers prop is true', () => {
    const { container } = render(
      <DefinitionList dividers>
        <DefinitionList.Item>
          <DefinitionList.Term>x</DefinitionList.Term>
          <DefinitionList.Description>y</DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>,
    );
    expect(container.querySelector('dl')?.getAttribute('data-dividers')).toBe('true');
  });

  it('omits data-dividers attribute when dividers={false} is passed explicitly', () => {
    const { container } = render(
      <DefinitionList dividers={false}>
        <DefinitionList.Item>
          <DefinitionList.Term>x</DefinitionList.Term>
          <DefinitionList.Description>y</DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>,
    );
    expect(container.querySelector('dl')?.getAttribute('data-dividers')).toBeNull();
  });

  it('warns in dev when a direct child is not a DefinitionList.Item', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <DefinitionList>
        <div>not an item</div>
      </DefinitionList>,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('<DefinitionList>');
    warn.mockRestore();
  });

  it('renders <dl> with no items without crashing', () => {
    const { container } = render(<DefinitionList />);
    expect(container.querySelector('dl')).not.toBeNull();
  });

  it('renders multiple Items in source order', () => {
    const { container } = render(
      <DefinitionList>
        <DefinitionList.Item>
          <DefinitionList.Term>First</DefinitionList.Term>
          <DefinitionList.Description>1</DefinitionList.Description>
        </DefinitionList.Item>
        <DefinitionList.Item>
          <DefinitionList.Term>Second</DefinitionList.Term>
          <DefinitionList.Description>2</DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>,
    );
    const terms = Array.from(container.querySelectorAll('dt')).map((dt) => dt.textContent);
    expect(terms).toEqual(['First', 'Second']);
  });

  it('treats Fragment-wrapped Items as valid children (no dev warning, renders correctly)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(
      <DefinitionList>
        <>
          <DefinitionList.Item>
            <DefinitionList.Term>First</DefinitionList.Term>
            <DefinitionList.Description>1</DefinitionList.Description>
          </DefinitionList.Item>
          <DefinitionList.Item>
            <DefinitionList.Term>Second</DefinitionList.Term>
            <DefinitionList.Description>2</DefinitionList.Description>
          </DefinitionList.Item>
        </>
      </DefinitionList>,
    );
    expect(warn).not.toHaveBeenCalled();
    const terms = Array.from(container.querySelectorAll('dt')).map((dt) => dt.textContent);
    expect(terms).toEqual(['First', 'Second']);
    warn.mockRestore();
  });
});
