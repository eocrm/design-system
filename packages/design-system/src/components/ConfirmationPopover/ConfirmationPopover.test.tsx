import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmationPopover } from './ConfirmationPopover';

describe('ConfirmationPopover — initial render', () => {
  it('renders only the trigger when closed', () => {
    render(
      <ConfirmationPopover
        title="Delete record?"
        description="This action cannot be undone."
        variant="danger"
        onConfirm={() => {}}
      >
        <button type="button">Delete</button>
      </ConfirmationPopover>,
    );
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('ConfirmationPopover — content rendering (sync)', () => {
  it('opens with title, description, Cancel and Confirm buttons', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmationPopover
        title="Delete record?"
        description="This action cannot be undone."
        variant="danger"
        onConfirm={() => {}}
      >
        <button type="button">Delete</button>
      </ConfirmationPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('heading', { name: 'Delete record?' })).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    // The Confirm button defaults to label 'Confirm' (since confirmLabel
    // prop is not provided here). The trigger 'Delete' button is no longer
    // the active focus context once the panel opens.
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  it('respects custom confirmLabel and cancelLabel', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmationPopover
        title="Archive?"
        confirmLabel="Archive"
        cancelLabel="Keep"
        onConfirm={() => {}}
      >
        <button type="button">Archive…</button>
      </ConfirmationPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'Archive…' }));
    expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
  });

  it('default variant uses primary button; danger variant uses danger button', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ConfirmationPopover title="Default?" onConfirm={() => {}}>
        <button type="button">Open</button>
      </ConfirmationPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    // Button doesn't use data-variant — it composes a CSS-Module class
    // named after the variant (e.g. `styles.primary`). The compiled class
    // ends up containing the substring 'primary' / 'danger', so match on
    // that. Bare class equality would be brittle across module hashing.
    expect(screen.getByRole('button', { name: 'Confirm' }).className).toMatch(/primary/);

    rerender(
      <ConfirmationPopover title="Default?" variant="danger" onConfirm={() => {}}>
        <button type="button">Open</button>
      </ConfirmationPopover>,
    );
    expect(screen.getByRole('button', { name: 'Confirm' }).className).toMatch(/danger/);
  });

  it('aria-labelledby points at the title; aria-describedby points at the description', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmationPopover title="Delete?" description="Cannot be undone." onConfirm={() => {}}>
        <button type="button">Open</button>
      </ConfirmationPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const dialog = screen.getByRole('dialog');
    const heading = screen.getByRole('heading', { name: 'Delete?' });
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id);

    const description = screen.getByText('Cannot be undone.');
    expect(dialog.getAttribute('aria-describedby')).toBe(description.id);
  });

  it('sync onConfirm: click Confirm → onConfirm runs once → popover closes', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmationPopover title="Confirm?" onConfirm={onConfirm}>
        <button type="button">Open</button>
      </ConfirmationPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Cancel click closes + fires onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConfirmationPopover title="Confirm?" onConfirm={() => {}} onCancel={onCancel}>
        <button type="button">Open</button>
      </ConfirmationPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('ConfirmationPopover — initial focus', () => {
  it('focuses the Cancel button after open (both variants)', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ConfirmationPopover title="Confirm?" onConfirm={() => {}}>
        <button type="button">Open</button>
      </ConfirmationPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    rerender(
      <ConfirmationPopover title="Confirm?" variant="danger" onConfirm={() => {}}>
        <button type="button">Open</button>
      </ConfirmationPopover>,
    );
    // Re-rendering with a new variant keeps the popover open; focus has
    // already moved to Cancel on the original open. Verify it's still there.
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });
});
