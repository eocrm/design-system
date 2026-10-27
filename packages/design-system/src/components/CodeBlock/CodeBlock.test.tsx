import { createRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CodeBlock, type CodeBlockSample } from './index';

const SAMPLES: CodeBlockSample[] = [
  { id: 'curl', label: 'cURL', code: 'curl https://x.test', language: 'bash' },
  { id: 'py', label: 'Python', code: 'import requests\n', language: 'python' },
];

const body = (container: HTMLElement) => container.querySelector('pre') as HTMLPreElement;

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
afterEach(() => {
  if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
  else delete (navigator as { clipboard?: unknown }).clipboard;
});

function mockClipboard(writeText: unknown) {
  Object.defineProperty(navigator, 'clipboard', {
    value: writeText === undefined ? undefined : { writeText },
    configurable: true,
  });
}

describe('CodeBlock', () => {
  describe('single sample', () => {
    it('shows the title, falling back to the language label, then Plain text', () => {
      const { rerender } = render(<CodeBlock code="{}" language="json" title="Response" />);
      expect(screen.getByText('Response')).toBeInTheDocument();
      rerender(<CodeBlock code="{}" language="json" />);
      expect(screen.getByText('JSON')).toBeInTheDocument();
      rerender(<CodeBlock code="{}" language="csharp" />);
      expect(screen.getByText('C#')).toBeInTheDocument();
      rerender(<CodeBlock code="x" language="cobol" />);
      expect(screen.getByText('Plain text')).toBeInTheDocument();
      rerender(<CodeBlock code="x" language="constructor" />);
      expect(screen.getByText('Plain text')).toBeInTheDocument();
    });

    it('renders the code minus one trailing newline, one data-line per line', () => {
      const { container } = render(<CodeBlock code={'a\nb\n'} />);
      expect(body(container).textContent).toBe('a\nb');
      expect(container.querySelectorAll('[data-line]')).toHaveLength(2);
    });

    it('keeps blank lines free of stray newlines', () => {
      const { container } = render(<CodeBlock code={'a\n\nb'} language="python" />);
      expect(body(container).textContent).toBe('a\n\nb');
    });

    it("a one-item samples array shows that sample's label", () => {
      render(<CodeBlock samples={[{ ...SAMPLES[1], label: 'Client' }]} />);
      expect(screen.getByText('Client')).toBeInTheDocument();
      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    });
  });

  describe('copy', () => {
    it('writes the exact original string and announces Copied', async () => {
      const user = userEvent.setup();
      const writeText = vi.fn().mockResolvedValue(undefined);
      mockClipboard(writeText);
      render(<CodeBlock code={'{"a":1}\n'} language="json" />);
      await user.click(screen.getByRole('button', { name: 'Copy code' }));
      expect(writeText).toHaveBeenCalledWith('{"a":1}\n');
      expect(await within(screen.getByRole('status')).findByText('Copied')).toBeInTheDocument();
    });

    it("announces Couldn't copy when writeText rejects", async () => {
      const user = userEvent.setup();
      mockClipboard(vi.fn().mockRejectedValue(new Error('denied')));
      render(<CodeBlock code="x" />);
      await user.click(screen.getByRole('button', { name: 'Copy code' }));
      expect(
        await within(screen.getByRole('status')).findByText("Couldn't copy"),
      ).toBeInTheDocument();
      // Visible cue too: the button keeps its name, the icon swaps to X.
      const button = screen.getByRole('button', { name: 'Copy code' });
      expect(button.querySelector('.lucide-x')).not.toBeNull();
      expect(button.querySelector('.lucide-copy')).toBeNull();
    });

    it("announces Couldn't copy when navigator.clipboard is missing", async () => {
      const user = userEvent.setup();
      mockClipboard(undefined);
      render(<CodeBlock code="x" />);
      await user.click(screen.getByRole('button', { name: 'Copy code' }));
      expect(
        await within(screen.getByRole('status')).findByText("Couldn't copy"),
      ).toBeInTheDocument();
    });
  });

  describe('samples', () => {
    it('renders tabs and switches body, copied text and onSampleChange', async () => {
      const user = userEvent.setup();
      const writeText = vi.fn().mockResolvedValue(undefined);
      mockClipboard(writeText);
      const onSampleChange = vi.fn();
      const { container } = render(<CodeBlock samples={SAMPLES} onSampleChange={onSampleChange} />);
      expect(screen.getByRole('tab', { name: 'cURL' })).toHaveAttribute('aria-selected', 'true');
      expect(body(container)).toHaveAttribute('role', 'tabpanel');
      expect(body(container).textContent).toBe('curl https://x.test');

      await user.click(screen.getByRole('tab', { name: 'Python' }));
      expect(body(container).textContent).toBe('import requests');
      expect(onSampleChange).toHaveBeenCalledTimes(1);
      expect(onSampleChange).toHaveBeenCalledWith('py');

      const pyTab = screen.getByRole('tab', { name: 'Python' });
      expect(pyTab).toHaveAttribute('aria-controls', body(container).id);
      expect(body(container)).toHaveAttribute('aria-labelledby', pyTab.id);

      await user.click(screen.getByRole('button', { name: 'Copy code' }));
      expect(writeText).toHaveBeenCalledWith('import requests\n');
    });

    it('syncKey syncs blocks with the same key and an available id only', async () => {
      const user = userEvent.setup();
      const onA = vi.fn();
      const onB = vi.fn();
      const noPy = [SAMPLES[0], { id: 'node', label: 'Node', code: 'node' }];
      render(
        <>
          <CodeBlock data-testid="a" samples={SAMPLES} syncKey="k1" onSampleChange={onA} />
          <CodeBlock data-testid="b" samples={SAMPLES} syncKey="k1" onSampleChange={onB} />
          <CodeBlock data-testid="c" samples={noPy} syncKey="k1" defaultSampleId="node" />
          <CodeBlock data-testid="d" samples={SAMPLES} syncKey="other" />
        </>,
      );
      const tab = (id: string, name: string) =>
        within(screen.getByTestId(id)).getByRole('tab', { name });

      await user.click(tab('a', 'Python'));
      expect(tab('b', 'Python')).toHaveAttribute('aria-selected', 'true');
      expect(tab('c', 'Node')).toHaveAttribute('aria-selected', 'true');
      expect(tab('d', 'cURL')).toHaveAttribute('aria-selected', 'true');
      expect(onA).toHaveBeenCalledTimes(1);
      expect(onB).not.toHaveBeenCalled();
    });

    it('controlled activeSampleId wins over syncKey', async () => {
      const user = userEvent.setup();
      render(
        <>
          <CodeBlock data-testid="a" samples={SAMPLES} syncKey="k2" />
          <CodeBlock data-testid="b" samples={SAMPLES} syncKey="k2" activeSampleId="curl" />
        </>,
      );
      await user.click(within(screen.getByTestId('a')).getByRole('tab', { name: 'Python' }));
      expect(within(screen.getByTestId('b')).getByRole('tab', { name: 'cURL' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });
  });

  it('wrap toggle flips aria-pressed and the wrap class; defaultWrap sets the start', async () => {
    const user = userEvent.setup();
    const { container } = render(<CodeBlock code="x" />);
    const toggle = screen.getByRole('button', { name: 'Wrap lines' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(body(container).className).not.toMatch(/wrap/);
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(body(container).className).toMatch(/wrap/);

    const other = render(<CodeBlock code="x" defaultWrap />);
    expect(body(other.container).className).toMatch(/wrap/);
  });

  it('the body is always a focusable, named region', () => {
    const { container, rerender } = render(<CodeBlock code="x" />);
    expect(body(container)).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('group', { name: 'Plain text' })).toBe(body(container));

    rerender(<CodeBlock code="x" title="Request" maxHeight="sm" />);
    expect(body(container).className).toMatch(/maxSm/);
    expect(body(container)).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('group', { name: 'Request' })).toBe(body(container));

    rerender(<CodeBlock samples={SAMPLES} />);
    expect(body(container)).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tabpanel', { name: 'cURL' })).toBe(body(container));

    rerender(<CodeBlock samples={SAMPLES} title="Request" />);
    expect(screen.getByRole('tablist', { name: 'Request' })).toBeInTheDocument();
  });

  it('highlightLines marks only the listed lines', () => {
    const { container } = render(<CodeBlock code={'a\nb\nc'} highlightLines={[2]} />);
    const lines = container.querySelectorAll('[data-line]');
    expect([...lines].map((l) => l.hasAttribute('data-highlighted'))).toEqual([false, true, false]);
  });

  it('forwards ref to the root, merges className and passes data-* through', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <CodeBlock ref={ref} code="x" className="custom" data-testid="root" />,
    );
    const root = container.firstChild as HTMLDivElement;
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('custom');
    expect(root.className).toMatch(/root/);
    expect(root).toHaveAttribute('data-testid', 'root');
  });
});
