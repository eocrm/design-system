import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Button } from '../Button';
import { ButtonGroup } from './ButtonGroup';

describe('<ButtonGroup> (visual mode)', () => {
  it('renders without crashing with default props', () => {
    render(
      <ButtonGroup>
        <Button>Cut</Button>
        <Button>Copy</Button>
      </ButtonGroup>,
    );
    expect(screen.getByText('Cut')).toBeInTheDocument();
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('root has role="group" and data-mode="visual"', () => {
    render(
      <ButtonGroup aria-label="Edit actions">
        <Button>Cut</Button>
      </ButtonGroup>,
    );
    const group = screen.getByRole('group', { name: 'Edit actions' });
    expect(group).toHaveAttribute('data-mode', 'visual');
  });

  it('aria-label passes through to root', () => {
    render(
      <ButtonGroup aria-label="Custom label">
        <Button>X</Button>
      </ButtonGroup>,
    );
    expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Custom label');
  });

  it('renders Button children as direct siblings (not wrapped)', () => {
    const { container } = render(
      <ButtonGroup>
        <Button>A</Button>
        <Button>B</Button>
      </ButtonGroup>,
    );
    const group = container.firstChild as HTMLElement;
    expect(group.children).toHaveLength(2);
    expect(group.children[0]!.tagName).toBe('BUTTON');
    expect(group.children[1]!.tagName).toBe('BUTTON');
  });

  it('propagates size to Button children that have no size set', () => {
    render(
      <ButtonGroup size="sm">
        <Button>A</Button>
      </ButtonGroup>,
    );
    const btn = screen.getByText('A');
    expect(btn.className).toMatch(/sm/);
  });

  it('per-Button size overrides group size', () => {
    render(
      <ButtonGroup size="sm">
        <Button size="lg">Big</Button>
      </ButtonGroup>,
    );
    const btn = screen.getByText('Big');
    expect(btn.className).toMatch(/lg/);
    expect(btn.className).not.toMatch(/\bsm\b/);
  });

  it('passes non-Button children through unchanged', () => {
    render(
      <ButtonGroup size="sm">
        <Button>A</Button>
        <span data-testid="divider">|</span>
        <Button>B</Button>
      </ButtonGroup>,
    );
    const divider = screen.getByTestId('divider');
    expect(divider.className).toBe('');
  });

  it('merges className onto root', () => {
    const { container } = render(
      <ButtonGroup className="custom-class">
        <Button>A</Button>
      </ButtonGroup>,
    );
    expect((container.firstChild as HTMLElement).className).toMatch(/custom-class/);
  });
});

describe('<ButtonGroup> (segmented mode)', () => {
  function Controlled({ initial = 'a', disabled }: { initial?: string; disabled?: boolean }) {
    const [v, setV] = useState(initial);
    return (
      <ButtonGroup value={v} onValueChange={setV} aria-label="Choices" disabled={disabled}>
        <ButtonGroup.Item value="a">Option A</ButtonGroup.Item>
        <ButtonGroup.Item value="b">Option B</ButtonGroup.Item>
        <ButtonGroup.Item value="c">Option C</ButtonGroup.Item>
      </ButtonGroup>
    );
  }

  it('renders as role="radiogroup" with data-mode="segmented"', () => {
    render(<Controlled />);
    const group = screen.getByRole('radiogroup', { name: 'Choices' });
    expect(group).toHaveAttribute('data-mode', 'segmented');
  });

  it('selected item has aria-checked=true; others have aria-checked=false', () => {
    render(<Controlled initial="b" />);
    expect(screen.getByRole('radio', { name: 'Option A' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: 'Option B' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Option C' })).toHaveAttribute('aria-checked', 'false');
  });

  it('roving tabindex: selected item is 0, others are -1', () => {
    render(<Controlled initial="b" />);
    expect(screen.getByRole('radio', { name: 'Option A' }).tabIndex).toBe(-1);
    expect(screen.getByRole('radio', { name: 'Option B' }).tabIndex).toBe(0);
    expect(screen.getByRole('radio', { name: 'Option C' }).tabIndex).toBe(-1);
  });

  it('click an unselected item fires onValueChange with that value', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <ButtonGroup value="a" onValueChange={onValueChange} aria-label="x">
        <ButtonGroup.Item value="a">A</ButtonGroup.Item>
        <ButtonGroup.Item value="b">B</ButtonGroup.Item>
      </ButtonGroup>,
    );
    await user.click(screen.getByRole('radio', { name: 'B' }));
    expect(onValueChange).toHaveBeenCalledWith('b');
  });

  it('click an already-selected item does NOT fire onValueChange', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <ButtonGroup value="a" onValueChange={onValueChange} aria-label="x">
        <ButtonGroup.Item value="a">A</ButtonGroup.Item>
        <ButtonGroup.Item value="b">B</ButtonGroup.Item>
      </ButtonGroup>,
    );
    await user.click(screen.getByRole('radio', { name: 'A' }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('ArrowRight from selected item moves selection + focus to next item', async () => {
    const user = userEvent.setup();
    render(<Controlled initial="a" />);
    const itemA = screen.getByRole('radio', { name: 'Option A' });
    itemA.focus();
    await user.keyboard('{ArrowRight}');
    const itemB = screen.getByRole('radio', { name: 'Option B' });
    expect(itemB).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(itemB);
  });

  it('ArrowLeft from selected item moves to previous item', async () => {
    const user = userEvent.setup();
    render(<Controlled initial="b" />);
    const itemB = screen.getByRole('radio', { name: 'Option B' });
    itemB.focus();
    await user.keyboard('{ArrowLeft}');
    const itemA = screen.getByRole('radio', { name: 'Option A' });
    expect(itemA).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(itemA);
  });

  it('ArrowRight from last item wraps to first', async () => {
    const user = userEvent.setup();
    render(<Controlled initial="c" />);
    const itemC = screen.getByRole('radio', { name: 'Option C' });
    itemC.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Option A' })).toHaveAttribute('aria-checked', 'true');
  });

  it('ArrowLeft from first item wraps to last', async () => {
    const user = userEvent.setup();
    render(<Controlled initial="a" />);
    const itemA = screen.getByRole('radio', { name: 'Option A' });
    itemA.focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'Option C' })).toHaveAttribute('aria-checked', 'true');
  });

  it('Home jumps to first item', async () => {
    const user = userEvent.setup();
    render(<Controlled initial="c" />);
    const itemC = screen.getByRole('radio', { name: 'Option C' });
    itemC.focus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('radio', { name: 'Option A' })).toHaveAttribute('aria-checked', 'true');
  });

  it('End jumps to last item', async () => {
    const user = userEvent.setup();
    render(<Controlled initial="a" />);
    const itemA = screen.getByRole('radio', { name: 'Option A' });
    itemA.focus();
    await user.keyboard('{End}');
    expect(screen.getByRole('radio', { name: 'Option C' })).toHaveAttribute('aria-checked', 'true');
  });

  it('Arrow navigation skips disabled items', async () => {
    const user = userEvent.setup();
    function H() {
      const [v, setV] = useState('a');
      return (
        <ButtonGroup value={v} onValueChange={setV} aria-label="x">
          <ButtonGroup.Item value="a">A</ButtonGroup.Item>
          <ButtonGroup.Item value="b" disabled>B</ButtonGroup.Item>
          <ButtonGroup.Item value="c">C</ButtonGroup.Item>
        </ButtonGroup>
      );
    }
    render(<H />);
    const itemA = screen.getByRole('radio', { name: 'A' });
    itemA.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'C' })).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'C' }));
  });

  it('group-level disabled: items get aria-disabled and clicks do not fire onValueChange', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <ButtonGroup value="a" onValueChange={onValueChange} aria-label="x" disabled>
        <ButtonGroup.Item value="a">A</ButtonGroup.Item>
        <ButtonGroup.Item value="b">B</ButtonGroup.Item>
      </ButtonGroup>,
    );
    expect(screen.getByRole('radio', { name: 'A' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('radio', { name: 'B' })).toHaveAttribute('aria-disabled', 'true');
    await user.click(screen.getByRole('radio', { name: 'B' }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('group-level disabled also sets aria-disabled on the radiogroup root', () => {
    render(
      <ButtonGroup value="a" onValueChange={() => {}} aria-label="x" disabled>
        <ButtonGroup.Item value="a">A</ButtonGroup.Item>
      </ButtonGroup>,
    );
    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-disabled', 'true');
  });

  it('warns in dev when segmented mode is used without aria-label or aria-labelledby', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // @ts-expect-error — intentionally omit required aria-label to trigger the runtime warning.
    render(
      <ButtonGroup value="a" onValueChange={() => {}}>
        <ButtonGroup.Item value="a">A</ButtonGroup.Item>
      </ButtonGroup>,
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('<ButtonGroup> TypeScript-level', () => {
  it('value + onValueChange must be passed together (compile-time mutual exclusion)', () => {
    // @ts-expect-error — value without onValueChange should be a compile error.
    const A = <ButtonGroup value="x">{null}</ButtonGroup>;
    // @ts-expect-error — onValueChange without value should be a compile error.
    const B = <ButtonGroup onValueChange={() => {}}>{null}</ButtonGroup>;
    expect(A).toBeDefined();
    expect(B).toBeDefined();
  });
});
