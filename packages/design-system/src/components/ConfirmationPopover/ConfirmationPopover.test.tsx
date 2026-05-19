import { render, screen } from '@testing-library/react';
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
