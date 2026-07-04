// #274 — parametrized host-yield contract: with a floating surface open
// inside a Modal, the FIRST Escape closes only the surface and the SECOND
// closes the host. Deleting any surface's useFloatingSurface registration
// (or its consumeEscape call) fails its case here.
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { Modal } from '../../Modal';
import { Popover } from '../../Popover';
import { DropdownMenu } from '../../DropdownMenu';
import { DatePicker } from '../../DatePicker';
import { TimeField } from '../../TimeField';
import { Rail } from '../../Rail';
import { Button } from '../../Button';
import { LocaleProvider } from '../../../i18n/LocaleProvider';
import { RichTextLinkEditor } from '../../RichTextEditor/RichTextLinkEditor';
import { overlayStack } from './index';

function Host({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <LocaleProvider locale="en-US">
      <Modal open={open} onOpenChange={setOpen} aria-label="Host">
        {children}
      </Modal>
    </LocaleProvider>
  );
}

afterEach(() => {
  overlayStack._reset();
});

const dialogOpen = () => screen.queryAllByRole('dialog').length > 0;

describe('Escape yield contract per surface (#274)', () => {
  it('Popover: first Escape closes the popover, second the modal', async () => {
    const user = userEvent.setup();
    render(
      <Host>
        <Popover defaultOpen>
          <Popover.Trigger>
            <Button>Filters</Button>
          </Popover.Trigger>
          <Popover.Content>
            <div>Panel body</div>
          </Popover.Content>
        </Popover>
      </Host>,
    );
    expect(screen.getByText('Panel body')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByText('Panel body')).toBeNull();
    expect(dialogOpen()).toBe(true);
    await user.keyboard('{Escape}');
    expect(dialogOpen()).toBe(false);
  });

  it('DropdownMenu: first Escape closes the menu, second the modal', async () => {
    const user = userEvent.setup();
    render(
      <Host>
        <DropdownMenu defaultOpen>
          <DropdownMenu.Trigger>
            <Button>Actions</Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      </Host>,
    );
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(dialogOpen()).toBe(true);
    await user.keyboard('{Escape}');
    expect(dialogOpen()).toBe(false);
  });

  it('TimeField: first Escape closes the clock, second the modal', async () => {
    const user = userEvent.setup();
    render(
      <Host>
        <TimeField aria-label="Time" value={{ hours: 9, minutes: 30 }} onChange={() => {}} />
      </Host>,
    );
    await user.click(screen.getByRole('button', { name: /Open time list/i }));
    expect(document.querySelector('[data-timefield-popover="true"]')).not.toBeNull();
    await user.keyboard('{Escape}');
    expect(document.querySelector('[data-timefield-popover="true"]')).toBeNull();
    expect(dialogOpen()).toBe(true);
    await user.keyboard('{Escape}');
    expect(dialogOpen()).toBe(false);
  });

  it('DatePicker: first Escape closes the calendar, second the modal', async () => {
    const user = userEvent.setup();
    render(
      <Host>
        <DatePicker aria-label="Due" value={null} onChange={() => {}} />
      </Host>,
    );
    await user.click(screen.getByRole('button', { name: 'Open calendar' }));
    // Two dialogs open: the modal + the calendar popover.
    expect(screen.getAllByRole('dialog').length).toBe(2);
    await user.keyboard('{Escape}');
    expect(screen.getAllByRole('dialog').length).toBe(1);
    await user.keyboard('{Escape}');
    expect(dialogOpen()).toBe(false);
  });

  it('Rail flyout: first Escape closes the flyout, second the modal', () => {
    vi.useFakeTimers();
    try {
      function RailHost() {
        const [open, setOpen] = useState(true);
        return (
          <Modal open={open} onOpenChange={setOpen} aria-label="Host">
            <Rail defaultCollapsed>
              <Rail.Section title="Ops">
                <Rail.Group icon={<span aria-hidden />} label="Settings">
                  <Rail.Item as="span">Sub A</Rail.Item>
                </Rail.Group>
              </Rail.Section>
            </Rail>
          </Modal>
        );
      }
      render(<RailHost />);
      const trigger = screen.getByRole('button', { name: /Settings/ });
      act(() => {
        fireEvent.pointerEnter(trigger);
      });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      // Flyout (role=dialog) + modal both open.
      expect(screen.getAllByRole('dialog').length).toBe(2);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.getAllByRole('dialog').length).toBe(1);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryAllByRole('dialog').length).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('RTE link editor: first Escape cancels the bubble, second closes the modal', async () => {
    const user = userEvent.setup();
    function LinkHost() {
      const [open, setOpen] = useState(true);
      const [bubble, setBubble] = useState(true);
      return (
        <Modal open={open} onOpenChange={setOpen} aria-label="Host">
          {bubble ? (
            <RichTextLinkEditor
              href=""
              editing={false}
              anchorRect={{ top: 10, left: 10, width: 10, height: 10 }}
              onApply={() => {}}
              onRemove={() => {}}
              onCancel={() => setBubble(false)}
            />
          ) : null}
        </Modal>
      );
    }
    render(<LinkHost />);
    expect(screen.getByRole('group')).toBeInTheDocument();
    // The modal's focus trap must NOT steal focus from the bubble.
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('group')).toBeNull();
    expect(dialogOpen()).toBe(true);
    await user.keyboard('{Escape}');
    expect(dialogOpen()).toBe(false);
  });
});
