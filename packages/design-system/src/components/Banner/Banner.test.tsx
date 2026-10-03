import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Bell } from 'lucide-react';
import { Banner } from './Banner';

describe('<Banner>', () => {
  it('defaults to tone="info" and a static role="note"', () => {
    render(<Banner>Body</Banner>);
    const root = screen.getByRole('note');
    expect(root).toHaveAttribute('data-tone', 'info');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it.each(['info', 'success', 'warning', 'danger'] as const)(
    'tone="%s" sets data-tone and stays role="note" without live',
    (tone) => {
      render(<Banner tone={tone}>x</Banner>);
      expect(screen.getByRole('note')).toHaveAttribute('data-tone', tone);
    },
  );

  it.each([
    ['info', 'status'],
    ['success', 'status'],
    ['warning', 'status'],
    ['danger', 'alert'],
  ] as const)('live + tone="%s" → role="%s"', (tone, role) => {
    render(
      <Banner tone={tone} live>
        x
      </Banner>,
    );
    expect(screen.getByRole(role)).toHaveAttribute('data-tone', tone);
  });

  it.each([
    ['info', 'Information'],
    ['success', 'Success'],
    ['warning', 'Warning'],
    ['danger', 'Error'],
  ] as const)('tone="%s" prefixes a visually hidden "%s:" label', (tone, label) => {
    render(<Banner tone={tone}>Body</Banner>);
    expect(screen.getByRole('note')).toHaveTextContent(new RegExp(`^${label}: Body$`));
  });

  it('title renders in <strong>, inline before children, separated by one space', () => {
    render(<Banner title="Scheduled maintenance">Sat 22:00.</Banner>);
    expect(screen.getByText('Scheduled maintenance').tagName).toBe('STRONG');
    expect(screen.getByRole('note')).toHaveTextContent(
      /^Information: Scheduled maintenance Sat 22:00\.$/,
    );
  });

  it('title only — no trailing space', () => {
    render(<Banner title="Only title" />);
    expect(screen.getByRole('note').textContent).toBe('Information: Only title');
  });

  it('children only — no title element', () => {
    const { container } = render(<Banner>Only body</Banner>);
    expect(container.querySelector('strong')).toBeNull();
    expect(screen.getByRole('note').textContent).toBe('Information: Only body');
  });

  it('renders a default icon per tone, a custom icon, and none for icon={null}', () => {
    const { container, rerender } = render(<Banner tone="warning">x</Banner>);
    expect(container.querySelector('svg')).toBeInTheDocument();
    rerender(<Banner icon={<Bell data-testid="bell" />}>x</Banner>);
    expect(screen.getByTestId('bell')).toBeInTheDocument();
    rerender(<Banner icon={null}>x</Banner>);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders action when provided', () => {
    render(<Banner action={<a href="/status">Details</a>}>x</Banner>);
    expect(screen.getByRole('link', { name: 'Details' })).toBeInTheDocument();
  });

  it('no dismiss button without onDismiss', () => {
    render(<Banner>x</Banner>);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('onDismiss renders a "Dismiss" button that fires the handler and keeps the banner mounted', async () => {
    const onDismiss = vi.fn();
    render(<Banner onDismiss={onDismiss}>x</Banner>);
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('note')).toBeInTheDocument();
  });

  it('props cannot override role/data-tone (ARIA contract wins)', () => {
    render(
      <Banner tone="danger" data-tone="info" {...({ role: 'banner' } as object)}>
        x
      </Banner>,
    );
    expect(screen.getByRole('note')).toHaveAttribute('data-tone', 'danger');
  });

  it('merges className and forwards ref to the root <div>', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Banner ref={ref} className="custom">
        x
      </Banner>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveClass('custom');
    expect(ref.current?.className).not.toBe('custom');
  });
});
