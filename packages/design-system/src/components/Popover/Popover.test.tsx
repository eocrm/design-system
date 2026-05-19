import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Popover } from './Popover';

describe('Popover — initial render', () => {
  it('renders nothing portaled on mount when defaultOpen is false', () => {
    render(
      <Popover>
        <div data-testid="children-marker">trigger and content go here later</div>
      </Popover>,
    );
    expect(screen.getByTestId('children-marker')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Popover.Trigger', () => {
  it('renders its child unchanged and sets aria-haspopup="dialog" and aria-expanded="false"', () => {
    render(
      <Popover>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
      </Popover>,
    );
    const trigger = screen.getByRole('button', { name: 'Open' });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles aria-expanded on click', async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
      </Popover>,
    );
    const trigger = screen.getByRole('button', { name: 'Open' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens on Enter or Space when focused', async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
      </Popover>,
    );
    await user.tab();
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Open' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('throws a clear error when children is not a valid React element', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(
        <Popover>
          {/* @ts-expect-error — intentionally invalid */}
          <Popover.Trigger>{null}</Popover.Trigger>
        </Popover>,
      ),
    ).toThrow(/exactly one React element/);
    spy.mockRestore();
  });

  it('chains consumer onClick (consumer runs first)', async () => {
    const user = userEvent.setup();
    const consumer = vi.fn();
    render(
      <Popover>
        <Popover.Trigger>
          <button type="button" onClick={consumer}>
            Open
          </button>
        </Popover.Trigger>
      </Popover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(consumer).toHaveBeenCalledTimes(1);
  });
});

describe('Popover.Content — minimal portal', () => {
  it('renders nothing when closed', () => {
    render(
      <Popover>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>panel body</Popover.Content>
      </Popover>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the panel as a portaled dialog when defaultOpen', () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>panel body</Popover.Content>
      </Popover>,
    );
    const panel = screen.getByRole('dialog');
    expect(panel).toHaveTextContent('panel body');
    expect(panel).toHaveAttribute('aria-modal', 'false');
    expect(panel).toHaveAttribute('tabIndex', '-1');
    // Portaled to document.body, NOT inside the test container.
    expect(document.body.contains(panel)).toBe(true);
  });

  it('panel id matches the trigger aria-controls when open', () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>panel body</Popover.Content>
      </Popover>,
    );
    const trigger = screen.getByRole('button', { name: 'Open' });
    const panel = screen.getByRole('dialog');
    expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
  });
});

describe('Popover.Heading', () => {
  it('renders as h3 by default with an auto id', () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>
          <Popover.Heading>Filters</Popover.Heading>
        </Popover.Content>
      </Popover>,
    );
    const heading = screen.getByRole('heading', { name: 'Filters', level: 3 });
    expect(heading.id).toMatch(/^popover-heading-/);
  });

  it('respects the `as` prop', () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>
          <Popover.Heading as="h2">Filters</Popover.Heading>
        </Popover.Content>
      </Popover>,
    );
    expect(screen.getByRole('heading', { name: 'Filters', level: 2 })).toBeInTheDocument();
  });

  it('wires aria-labelledby on Content to the heading id', () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>
          <Popover.Heading>Filters</Popover.Heading>
        </Popover.Content>
      </Popover>,
    );
    const dialog = screen.getByRole('dialog');
    const heading = screen.getByRole('heading', { name: 'Filters' });
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id);
  });

  it('Content has no aria-labelledby when no Heading is present', () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>plain body</Popover.Content>
      </Popover>,
    );
    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-labelledby');
  });
});
