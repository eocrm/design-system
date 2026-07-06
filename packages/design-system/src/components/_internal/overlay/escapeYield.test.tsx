// #274 — parametrized host-yield contract: with a floating surface open
// inside a Modal, the FIRST Escape closes only the surface and the SECOND
// closes the host. Deleting any surface's useFloatingSurface registration
// (or its consumeEscape call) fails its case here. (Select's case lives in
// Modal.test.tsx / Drawer.test.tsx.)
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { Modal } from '../../Modal';
import { Popover } from '../../Popover';
import { Tooltip } from '../../Tooltip';
import { Select } from '../../Select';
import { DropdownMenu } from '../../DropdownMenu';
import { DatePicker } from '../../DatePicker';
import { DateRangePicker } from '../../DateRangePicker';
import { TimeField } from '../../TimeField';
import { Rail } from '../../Rail';
import { Button } from '../../Button';
import { LiquidEditor } from '../../LiquidEditor';
import { LocaleProvider } from '../../../i18n/LocaleProvider';
import { RichTextLinkEditor } from '../../RichTextEditor/RichTextLinkEditor';
import { RichTextMentionMenu } from '../../RichTextEditor/RichTextMentionMenu';
import { RichTextAttachmentConfig } from '../../RichTextEditor/RichTextAttachmentConfig';
import type { Block } from '../../RichText/engine/model';
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

  it('Tooltip: first Escape dismisses the tooltip, second closes the modal (#281)', () => {
    render(
      <Host>
        <Tooltip content="Tip" delay={0}>
          <Button>Info</Button>
        </Tooltip>
      </Host>,
    );
    // Open via hover (delay 0) — avoids the :focus-visible gate; the Escape
    // handling under test is identical however it opened.
    act(() => {
      fireEvent.pointerEnter(screen.getByRole('button', { name: 'Info' }));
    });
    expect(screen.getByRole('tooltip')).toHaveTextContent('Tip');
    // First Escape: the host's capture listener runs first but yields because
    // the tooltip is a registered floating surface (useFloatingSurface) — so the
    // tooltip dismisses and the modal survives. (Deleting the registration would
    // close the modal here.)
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(dialogOpen()).toBe(true);
    // Second Escape: nothing floating left → the modal closes.
    fireEvent.keyDown(document, { key: 'Escape' });
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
      // Mounted after the modal (via the Add link click) so the modal's
      // capture listener runs first — see the attachment-config case.
      const [bubble, setBubble] = useState(false);
      return (
        <Modal open={open} onOpenChange={setOpen} aria-label="Host">
          <Button onClick={() => setBubble(true)}>Add link</Button>
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
    await user.click(screen.getByRole('button', { name: 'Add link' }));
    expect(screen.getByRole('group')).toBeInTheDocument();
    // The modal's focus trap must NOT steal focus from the bubble.
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('group')).toBeNull();
    expect(dialogOpen()).toBe(true);
    await user.keyboard('{Escape}');
    expect(dialogOpen()).toBe(false);
  });

  it('DateRangePicker: first Escape closes the calendar, second the modal', async () => {
    const user = userEvent.setup();
    render(
      <Host>
        <DateRangePicker aria-label="Period" value={null} onChange={() => {}} />
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

  it('LiquidEditor autocomplete: first Escape closes the menu, second the modal', async () => {
    const user = userEvent.setup();
    function LiquidHost() {
      const [open, setOpen] = useState(true);
      const [value, setValue] = useState('');
      return (
        <Modal open={open} onOpenChange={setOpen} aria-label="Host">
          <LiquidEditor
            value={value}
            onChange={setValue}
            variables={[{ code: 'first_name', label: 'First name', type: 'text' }]}
          />
        </Modal>
      );
    }
    render(<LiquidHost />);
    const ta = screen.getByRole('combobox');
    await user.click(ta);
    // `{{{{ fir` types the literal `{{ fir` (userEvent escapes `{` by doubling).
    await user.type(ta, '{{{{ fir');
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(dialogOpen()).toBe(true);
    await user.keyboard('{Escape}');
    expect(dialogOpen()).toBe(false);
  });

  it('RTE mention menu: first Escape closes the menu, second the modal', async () => {
    const user = userEvent.setup();
    function MentionHost() {
      const [open, setOpen] = useState(true);
      const [menu, setMenu] = useState(true);
      return (
        <Modal open={open} onOpenChange={setOpen} aria-label="Host">
          {/* The real editor closes the menu from its own element-scoped
              keydown — mirror that here; the menu itself only registers. */}
          <div onKeyDown={(e) => e.key === 'Escape' && setMenu(false)}>
            <Button>Editor stand-in</Button>
          </div>
          {menu ? (
            <RichTextMentionMenu
              items={[{ id: 'u1', label: 'Alice' }]}
              activeIndex={0}
              anchorRect={{ top: 10, left: 10, width: 0, height: 16 }}
              listboxId="lb"
              getOptionId={(i) => `opt-${i}`}
              label="Mentions"
              emptyLabel="No matches"
              onSelect={() => {}}
              onHover={() => {}}
            />
          ) : null}
        </Modal>
      );
    }
    render(<MentionHost />);
    expect(screen.getByRole('listbox', { name: 'Mentions' })).toBeInTheDocument();
    // The real editor owns focus while the menu is open — mirror that, else
    // the element-scoped close handler never sees the press. Click (not bare
    // .focus()): the Modal's initial-focus microtask is still pending at the
    // first await and would steal a synchronously-set focus.
    await user.click(screen.getByRole('button', { name: 'Editor stand-in' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(dialogOpen()).toBe(true);
    await user.keyboard('{Escape}');
    expect(dialogOpen()).toBe(false);
  });

  it('RTE attachment config: Escape with focus OUTSIDE the popover closes it, second press the modal', async () => {
    const user = userEvent.setup();
    const block: Block = {
      id: 'a',
      type: 'attachment',
      status: 'ready',
      src: 'http://u/p.png',
      mime: 'image/png',
      name: 'p.png',
      alt: 'Chart',
      inlines: [],
    };
    function ConfigHost() {
      const [open, setOpen] = useState(true);
      // Mounted AFTER the modal (via the Configure click) so listener order
      // matches production: the modal's capture listener registered first and
      // runs first — ONLY the useFloatingSurface registration saves the host.
      // Mounting both in one commit would register the config's listener
      // first (child effects run before parent effects) and consumeEscape
      // would mask a deleted registration.
      const [cfg, setCfg] = useState(false);
      return (
        <Modal open={open} onOpenChange={setOpen} aria-label="Host">
          <Button onClick={() => setCfg(true)}>Configure</Button>
          <Button>Elsewhere</Button>
          {cfg ? (
            <RichTextAttachmentConfig
              block={block}
              anchorRect={{ top: 10, left: 10, width: 200, height: 120 }}
              maxWidth={600}
              onAltChange={() => {}}
              onAlignChange={() => {}}
              onWidthChange={() => {}}
              onWidthReset={() => {}}
              onReplace={() => {}}
              onClose={() => setCfg(false)}
            />
          ) : null}
        </Modal>
      );
    }
    render(<ConfigHost />);
    await user.click(screen.getByRole('button', { name: 'Configure' }));
    expect(screen.getByRole('group')).toBeInTheDocument();
    expect(overlayStack.hasOpenFloating()).toBe(true);
    // Focus OUTSIDE the popover: only the document-capture listener sees this
    // press (the container onKeyDown is dead) — pins that listener specifically.
    // No click (pointerdown-outside would dismiss the popover); bare .focus()
    // is safe here — the Modal's initial-focus microtask flushed during the
    // Configure click.
    screen.getByRole('button', { name: 'Elsewhere' }).focus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('group')).toBeNull();
    expect(dialogOpen()).toBe(true);
    await user.keyboard('{Escape}');
    expect(dialogOpen()).toBe(false);
  });
});

describe('Surface-in-surface Escape ordering (#280)', () => {
  it('Select inside a Popover: first Escape closes the Select, second the Popover', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider locale="en-US">
        <Popover defaultOpen>
          <Popover.Trigger>
            <Button>Filters</Button>
          </Popover.Trigger>
          <Popover.Content>
            <span>panel body</span>
            <Select
              options={[
                { value: 'a', label: 'Alpha' },
                { value: 'b', label: 'Beta' },
              ]}
              placeholder="Pick"
            />
          </Popover.Content>
        </Popover>
      </LocaleProvider>,
    );
    expect(screen.getByText('panel body')).toBeInTheDocument();
    // Open the Select nested inside the popover.
    await user.click(screen.getByRole('button', { name: 'Pick' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    // First Escape: only the INNERMOST surface (the Select) closes; the popover
    // survives. Before #280 both closed on this one press.
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByText('panel body')).toBeInTheDocument();
    // Second Escape: the popover is now innermost → it closes.
    await user.keyboard('{Escape}');
    expect(screen.queryByText('panel body')).toBeNull();
  });

  it('Popover inside a Popover: first Escape closes the inner, second the outer', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider locale="en-US">
        <Popover defaultOpen>
          <Popover.Trigger>
            <Button>Outer</Button>
          </Popover.Trigger>
          <Popover.Content>
            <span>outer body</span>
            <Popover>
              <Popover.Trigger>
                <Button>Open inner</Button>
              </Popover.Trigger>
              <Popover.Content>
                <span>inner body</span>
              </Popover.Content>
            </Popover>
          </Popover.Content>
        </Popover>
      </LocaleProvider>,
    );
    expect(screen.getByText('outer body')).toBeInTheDocument();
    // Open the inner popover (registers AFTER the outer ⇒ innermost).
    await user.click(screen.getByRole('button', { name: 'Open inner' }));
    expect(screen.getByText('inner body')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByText('inner body')).toBeNull();
    expect(screen.getByText('outer body')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByText('outer body')).toBeNull();
  });

  it('DropdownMenu defers Escape while a DEEPER floating surface is open (#280)', async () => {
    // The realistic case is a ConfirmationPopover/Select opened from a menu
    // item; that popover registers as a floating surface AFTER the menu, so it's
    // innermost. Simulate that registration directly (rendering a Popover inside
    // a menu's Content doesn't compose in jsdom) — it exercises the exact
    // isTopFloating deferral the menu's Escape handler uses.
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
    act(() => overlayStack.registerFloating('deeper-surface'));
    await user.keyboard('{Escape}');
    // The whole menu defers to the deeper surface — it stays open (before #280 it
    // would have closed on this press).
    expect(screen.getByRole('menu')).toBeInTheDocument();
    // Deeper surface gone → the menu is innermost again → Escape closes it.
    act(() => overlayStack.unregisterFloating('deeper-surface'));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
