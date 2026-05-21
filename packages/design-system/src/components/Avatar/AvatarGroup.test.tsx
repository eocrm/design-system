import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Avatar } from './Avatar';
import { AvatarGroup } from './AvatarGroup';

describe('AvatarGroup', () => {
  it('renders all children when count <= max', () => {
    render(
      <AvatarGroup max={4}>
        <Avatar name="A" />
        <Avatar name="B" />
        <Avatar name="C" />
      </AvatarGroup>,
    );
    expect(screen.getByRole('img', { name: 'A' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'B' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'C' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /more avatars/ })).toBeNull();
    expect(screen.queryByRole('img', { name: /more avatars/ })).toBeNull();
  });

  it('collapses to +N when count > max', () => {
    render(
      <AvatarGroup max={2}>
        <Avatar name="A" />
        <Avatar name="B" />
        <Avatar name="C" />
        <Avatar name="D" />
      </AvatarGroup>,
    );
    expect(screen.getByRole('img', { name: 'A' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'B' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'C' })).toBeNull();
    expect(screen.queryByRole('img', { name: 'D' })).toBeNull();
    // No handler → non-interactive span with role="img" + aria-label
    expect(screen.getByRole('img', { name: '2 more avatars' })).toBeInTheDocument();
  });

  it('renders +N as a button when onOverflowClick is provided, and fires the handler', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(
      <AvatarGroup max={1} onOverflowClick={handler}>
        <Avatar name="A" />
        <Avatar name="B" />
        <Avatar name="C" />
      </AvatarGroup>,
    );
    const btn = screen.getByRole('button', { name: '2 more avatars' });
    await user.click(btn);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][1]).toBe(2);
  });

  it('propagates size to descendant Avatars via context', () => {
    const { container } = render(
      <AvatarGroup size="lg">
        <Avatar name="A" />
      </AvatarGroup>,
    );
    // No per-child size set — group context size ("lg") should apply.
    const avatar = container.querySelector('[role="img"]');
    expect(avatar?.className).toMatch(/lg/);
  });

  it('forwards ref to the outer div', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(
      <AvatarGroup ref={ref}>
        <Avatar name="A" />
      </AvatarGroup>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges className without replacing', () => {
    const { container } = render(
      <AvatarGroup className="my-class">
        <Avatar name="A" />
      </AvatarGroup>,
    );
    expect(container.querySelector('div.my-class')).not.toBeNull();
  });

  it('renders role="list" wrapper with role="listitem" children', () => {
    render(
      <AvatarGroup>
        <Avatar name="A" />
        <Avatar name="B" />
      </AvatarGroup>,
    );
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('handles count exactly equal to max — no +N appears', () => {
    render(
      <AvatarGroup max={3}>
        <Avatar name="A" />
        <Avatar name="B" />
        <Avatar name="C" />
      </AvatarGroup>,
    );
    expect(screen.queryByRole('img', { name: /more avatars/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /more avatars/ })).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });
});
