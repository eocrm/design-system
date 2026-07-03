import { render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { useInOverlay } from './useInOverlay';

// Probe renders a button and reflects the hook result onto a data attribute,
// mirroring how the real floating Contents consume the hook.
function Probe({ active }: { active: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const inOverlay = useInOverlay(ref, active);
  return (
    <button ref={ref} data-in-overlay={inOverlay ? '' : undefined}>
      probe
    </button>
  );
}

describe('useInOverlay', () => {
  it('is false when the reference is at the document root', () => {
    render(<Probe active />);
    expect(screen.getByRole('button')).not.toHaveAttribute('data-in-overlay');
  });

  it('is true when the reference is inside a drawer portal root', () => {
    render(
      <div data-drawer-portal-root="">
        <Probe active />
      </div>,
    );
    expect(screen.getByRole('button')).toHaveAttribute('data-in-overlay', '');
  });

  it('is true when the reference is inside a modal portal root', () => {
    render(
      <div data-modal-portal-root="">
        <Probe active />
      </div>,
    );
    expect(screen.getByRole('button')).toHaveAttribute('data-in-overlay', '');
  });

  it('is true when the reference is inside a Popover.Content host', () => {
    render(
      <div data-popover-content="">
        <Probe active />
      </div>,
    );
    expect(screen.getByRole('button')).toHaveAttribute('data-in-overlay', '');
  });

  it('is true when the reference is inside a DropdownMenu content host', () => {
    render(
      <div data-dropdown-menu-content="">
        <Probe active />
      </div>,
    );
    expect(screen.getByRole('button')).toHaveAttribute('data-in-overlay', '');
  });

  it('is true when the reference is inside an already-elevated surface (transitive)', () => {
    // An embedded TimeField inside a DatePicker popover that itself carries
    // data-in-overlay must elevate too — the chain, not just direct hosts.
    render(
      <div data-in-overlay="">
        <Probe active />
      </div>,
    );
    expect(screen.getByRole('button')).toHaveAttribute('data-in-overlay', '');
  });

  it('is false when inactive, even if nested', () => {
    render(
      <div data-drawer-portal-root="">
        <Probe active={false} />
      </div>,
    );
    expect(screen.getByRole('button')).not.toHaveAttribute('data-in-overlay');
  });

  it('resets to false when deactivated after being true', () => {
    const { rerender } = render(
      <div data-modal-portal-root="">
        <Probe active />
      </div>,
    );
    expect(screen.getByRole('button')).toHaveAttribute('data-in-overlay', '');
    rerender(
      <div data-modal-portal-root="">
        <Probe active={false} />
      </div>,
    );
    expect(screen.getByRole('button')).not.toHaveAttribute('data-in-overlay');
  });
});
