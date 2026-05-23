import { createRef, useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Plus } from 'lucide-react';
import { Accordion } from './Accordion';

function BasicSingle({
  collapsible = false,
  defaultValue,
}: {
  collapsible?: boolean;
  defaultValue?: string;
}) {
  return (
    <Accordion type="single" collapsible={collapsible} defaultValue={defaultValue}>
      <Accordion.Item value="a">
        <Accordion.Trigger>A trigger</Accordion.Trigger>
        <Accordion.Content>A content</Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="b">
        <Accordion.Trigger>B trigger</Accordion.Trigger>
        <Accordion.Content>B content</Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="c">
        <Accordion.Trigger>C trigger</Accordion.Trigger>
        <Accordion.Content>C content</Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}

function BasicMultiple({ defaultValue }: { defaultValue?: string[] }) {
  return (
    <Accordion type="multiple" defaultValue={defaultValue}>
      <Accordion.Item value="a">
        <Accordion.Trigger>A trigger</Accordion.Trigger>
        <Accordion.Content>A content</Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="b">
        <Accordion.Trigger>B trigger</Accordion.Trigger>
        <Accordion.Content>B content</Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="c">
        <Accordion.Trigger>C trigger</Accordion.Trigger>
        <Accordion.Content>C content</Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}

describe('<Accordion>', () => {
  // ─── Rendering + structure ─────────────────────────────────────────────

  it('renders without crashing with minimal compound markup', () => {
    render(<BasicSingle />);
    expect(screen.getByText('A trigger')).toBeInTheDocument();
    expect(screen.getByText('B trigger')).toBeInTheDocument();
  });

  it('renders items in DOM order', () => {
    const { container } = render(<BasicSingle />);
    const triggers = container.querySelectorAll('button[aria-expanded]');
    expect(triggers[0]).toHaveTextContent('A trigger');
    expect(triggers[1]).toHaveTextContent('B trigger');
    expect(triggers[2]).toHaveTextContent('C trigger');
  });

  it('Trigger is wrapped in the default <h3>', () => {
    const { container } = render(<BasicSingle />);
    expect(container.querySelectorAll('h3').length).toBeGreaterThanOrEqual(3);
  });

  it('headerLevel="h2" wraps the trigger in <h2>', () => {
    const { container } = render(
      <Accordion type="single">
        <Accordion.Item value="a" headerLevel="h2">
          <Accordion.Trigger>A</Accordion.Trigger>
          <Accordion.Content>content</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );
    expect(container.querySelector('h2')).toBeInTheDocument();
  });

  it('aria-controls on trigger matches id on content panel', () => {
    render(<BasicSingle />);
    const trigger = screen.getByRole('button', { name: 'A trigger' });
    const ariaControls = trigger.getAttribute('aria-controls');
    expect(ariaControls).toBeTruthy();
    const panel = document.getElementById(ariaControls!);
    expect(panel).not.toBeNull();
  });

  it('aria-labelledby on content matches id on trigger', () => {
    render(<BasicSingle />);
    const trigger = screen.getByRole('button', { name: 'A trigger' });
    const triggerId = trigger.id;
    // Content panel: find via aria-labelledby. Note: closed panels still
    // exist in the DOM (only height is 0).
    const panels = document.querySelectorAll('[role="region"]');
    const panel = Array.from(panels).find((p) => p.getAttribute('aria-labelledby') === triggerId);
    expect(panel).toBeDefined();
  });

  it('default state: no item open; all aria-expanded="false"', () => {
    render(<BasicSingle />);
    const triggers = screen.getAllByRole('button');
    triggers.forEach((t) => {
      expect(t).toHaveAttribute('aria-expanded', 'false');
    });
  });

  // ─── State (single mode) ───────────────────────────────────────────────

  it('defaultValue="a" opens item a on initial render', () => {
    render(<BasicSingle defaultValue="a" />);
    expect(screen.getByRole('button', { name: 'A trigger' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'B trigger' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('clicking a closed item opens it AND closes any previously open item', async () => {
    const user = userEvent.setup();
    render(<BasicSingle defaultValue="a" />);
    await user.click(screen.getByRole('button', { name: 'B trigger' }));
    expect(screen.getByRole('button', { name: 'A trigger' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('button', { name: 'B trigger' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('collapsible={false} (default): clicking the open item does NOT close it', async () => {
    const user = userEvent.setup();
    render(<BasicSingle defaultValue="a" />);
    await user.click(screen.getByRole('button', { name: 'A trigger' }));
    expect(screen.getByRole('button', { name: 'A trigger' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('collapsible={true}: clicking the open item closes it', async () => {
    const user = userEvent.setup();
    render(<BasicSingle collapsible defaultValue="a" />);
    await user.click(screen.getByRole('button', { name: 'A trigger' }));
    expect(screen.getByRole('button', { name: 'A trigger' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('controlled single: value + onValueChange round-trip', async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [v, setV] = useState('');
      return (
        <>
          <span data-testid="state">{v}</span>
          <Accordion type="single" value={v} onValueChange={setV}>
            <Accordion.Item value="a">
              <Accordion.Trigger>A trigger</Accordion.Trigger>
              <Accordion.Content>A content</Accordion.Content>
            </Accordion.Item>
            <Accordion.Item value="b">
              <Accordion.Trigger>B trigger</Accordion.Trigger>
              <Accordion.Content>B content</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        </>
      );
    }
    render(<Controlled />);
    await user.click(screen.getByRole('button', { name: 'B trigger' }));
    expect(screen.getByTestId('state')).toHaveTextContent('b');
    await user.click(screen.getByRole('button', { name: 'A trigger' }));
    expect(screen.getByTestId('state')).toHaveTextContent('a');
  });

  // ─── State (multiple mode) ─────────────────────────────────────────────

  it('multiple mode: defaultValue={["a","b"]} opens both items', () => {
    render(<BasicMultiple defaultValue={['a', 'b']} />);
    expect(screen.getByRole('button', { name: 'A trigger' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'B trigger' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'C trigger' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('multiple mode: clicking a closed item adds it to the open set', async () => {
    const user = userEvent.setup();
    render(<BasicMultiple defaultValue={['a']} />);
    await user.click(screen.getByRole('button', { name: 'C trigger' }));
    expect(screen.getByRole('button', { name: 'A trigger' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'C trigger' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('multiple mode: clicking an open item removes it from the set', async () => {
    const user = userEvent.setup();
    render(<BasicMultiple defaultValue={['a', 'b']} />);
    await user.click(screen.getByRole('button', { name: 'A trigger' }));
    expect(screen.getByRole('button', { name: 'A trigger' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('button', { name: 'B trigger' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('controlled multiple: value + onValueChange round-trip', async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [v, setV] = useState<string[]>([]);
      return (
        <>
          <span data-testid="state">{v.join(',')}</span>
          <Accordion type="multiple" value={v} onValueChange={setV}>
            <Accordion.Item value="a">
              <Accordion.Trigger>A trigger</Accordion.Trigger>
              <Accordion.Content>A content</Accordion.Content>
            </Accordion.Item>
            <Accordion.Item value="b">
              <Accordion.Trigger>B trigger</Accordion.Trigger>
              <Accordion.Content>B content</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        </>
      );
    }
    render(<Controlled />);
    await user.click(screen.getByRole('button', { name: 'A trigger' }));
    expect(screen.getByTestId('state')).toHaveTextContent('a');
    await user.click(screen.getByRole('button', { name: 'B trigger' }));
    expect(screen.getByTestId('state')).toHaveTextContent('a,b');
    await user.click(screen.getByRole('button', { name: 'A trigger' }));
    expect(screen.getByTestId('state')).toHaveTextContent('b');
  });

  // ─── Disabled ──────────────────────────────────────────────────────────

  it('disabled item: trigger has the disabled attribute', () => {
    render(
      <Accordion type="single">
        <Accordion.Item value="a" disabled>
          <Accordion.Trigger>A</Accordion.Trigger>
          <Accordion.Content>content</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );
    expect(screen.getByRole('button', { name: 'A' })).toBeDisabled();
  });

  it('clicking a disabled trigger does NOT toggle the item', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <Accordion type="single" onValueChange={handleChange}>
        <Accordion.Item value="a" disabled>
          <Accordion.Trigger>A</Accordion.Trigger>
          <Accordion.Content>content</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );
    await user.click(screen.getByRole('button', { name: 'A' }));
    expect(handleChange).not.toHaveBeenCalled();
  });

  // ─── Keyboard ──────────────────────────────────────────────────────────

  it('ArrowDown from the first trigger focuses the second', async () => {
    const user = userEvent.setup();
    render(<BasicSingle />);
    const first = screen.getByRole('button', { name: 'A trigger' });
    first.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'B trigger' })).toHaveFocus();
  });

  it('ArrowUp from the second trigger focuses the first', async () => {
    const user = userEvent.setup();
    render(<BasicSingle />);
    const second = screen.getByRole('button', { name: 'B trigger' });
    second.focus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('button', { name: 'A trigger' })).toHaveFocus();
  });

  it('ArrowDown wraps from last to first', async () => {
    const user = userEvent.setup();
    render(<BasicSingle />);
    const last = screen.getByRole('button', { name: 'C trigger' });
    last.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'A trigger' })).toHaveFocus();
  });

  it('Home focuses the first non-disabled trigger', async () => {
    const user = userEvent.setup();
    render(<BasicSingle />);
    const second = screen.getByRole('button', { name: 'B trigger' });
    second.focus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('button', { name: 'A trigger' })).toHaveFocus();
  });

  it('End focuses the last non-disabled trigger', async () => {
    const user = userEvent.setup();
    render(<BasicSingle />);
    const first = screen.getByRole('button', { name: 'A trigger' });
    first.focus();
    await user.keyboard('{End}');
    expect(screen.getByRole('button', { name: 'C trigger' })).toHaveFocus();
  });

  it('ArrowDown skips disabled items', async () => {
    const user = userEvent.setup();
    render(
      <Accordion type="single">
        <Accordion.Item value="a">
          <Accordion.Trigger>A</Accordion.Trigger>
          <Accordion.Content>x</Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="b" disabled>
          <Accordion.Trigger>B</Accordion.Trigger>
          <Accordion.Content>x</Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="c">
          <Accordion.Trigger>C</Accordion.Trigger>
          <Accordion.Content>x</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );
    const first = screen.getByRole('button', { name: 'A' });
    first.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'C' })).toHaveFocus();
  });

  // ─── Icon ──────────────────────────────────────────────────────────────

  it('custom icon on Trigger replaces the default ChevronDown', () => {
    render(
      <Accordion type="single">
        <Accordion.Item value="a">
          <Accordion.Trigger icon={<Plus data-testid="custom" />}>A</Accordion.Trigger>
          <Accordion.Content>x</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );
    expect(screen.getByTestId('custom')).toBeInTheDocument();
  });

  it('icon={null} hides the indicator entirely', () => {
    render(
      <Accordion type="single">
        <Accordion.Item value="a">
          <Accordion.Trigger icon={null}>A</Accordion.Trigger>
          <Accordion.Content>x</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );
    const trigger = screen.getByRole('button', { name: 'A' });
    expect(within(trigger).queryByRole('img')).toBeNull();
    expect(trigger.querySelector('svg')).toBeNull();
  });

  // ─── Rule 1 minimum coverage: ref + className ──────────────────────────

  it('Accordion root: ref forwards to the root <div>', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Accordion type="single" ref={ref}>
        <Accordion.Item value="a">
          <Accordion.Trigger>A</Accordion.Trigger>
          <Accordion.Content>x</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('DIV');
    expect(ref.current?.getAttribute('data-accordion')).toBe('');
  });

  it('Item: ref forwards to the item <div>', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Accordion type="single">
        <Accordion.Item ref={ref} value="a">
          <Accordion.Trigger>A</Accordion.Trigger>
          <Accordion.Content>x</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('DIV');
    expect(ref.current?.getAttribute('data-state')).toBe('closed');
  });

  it('Trigger: ref forwards to the <button>', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Accordion type="single">
        <Accordion.Item value="a">
          <Accordion.Trigger ref={ref}>A</Accordion.Trigger>
          <Accordion.Content>x</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('BUTTON');
    expect(ref.current?.type).toBe('button');
  });

  it('Content: ref forwards to the content <div>', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Accordion type="single">
        <Accordion.Item value="a">
          <Accordion.Trigger>A</Accordion.Trigger>
          <Accordion.Content ref={ref}>x</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('DIV');
    expect(ref.current?.getAttribute('role')).toBe('region');
  });

  it('className merges (not replaces) on all four parts', () => {
    const { container } = render(
      <Accordion type="single" className="custom-root">
        <Accordion.Item value="a" className="custom-item">
          <Accordion.Trigger className="custom-trigger">A</Accordion.Trigger>
          <Accordion.Content className="custom-content">x</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );
    const root = container.querySelector('[data-accordion]')!;
    expect(root.className).toMatch(/custom-root/);
    expect(root.className).toMatch(/accordion/);

    const item = container.querySelector('[data-state]')!;
    expect(item.className).toMatch(/custom-item/);
    expect(item.className).toMatch(/item/);

    const trigger = screen.getByRole('button', { name: 'A' });
    expect(trigger.className).toMatch(/custom-trigger/);
    expect(trigger.className).toMatch(/trigger/);

    const content = container.querySelector('[role="region"]')!;
    expect(content.className).toMatch(/custom-content/);
    expect(content.className).toMatch(/content/);
  });

  // ─── Nested accordion keyboard scope ──────────────────────────────────

  it('ArrowDown on outer trigger does NOT escape into a nested Accordion', async () => {
    const user = userEvent.setup();
    render(
      <Accordion type="multiple" defaultValue={['outer-1']}>
        <Accordion.Item value="outer-1">
          <Accordion.Trigger>Outer A</Accordion.Trigger>
          <Accordion.Content>
            <Accordion type="single">
              <Accordion.Item value="inner-1">
                <Accordion.Trigger>Inner A</Accordion.Trigger>
                <Accordion.Content>inner content A</Accordion.Content>
              </Accordion.Item>
              <Accordion.Item value="inner-2">
                <Accordion.Trigger>Inner B</Accordion.Trigger>
                <Accordion.Content>inner content B</Accordion.Content>
              </Accordion.Item>
            </Accordion>
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="outer-2">
          <Accordion.Trigger>Outer B</Accordion.Trigger>
          <Accordion.Content>outer content B</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );
    const outerA = screen.getByRole('button', { name: 'Outer A' });
    outerA.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'Outer B' })).toHaveFocus();
  });
});
