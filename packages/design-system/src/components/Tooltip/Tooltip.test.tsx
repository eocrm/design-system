import { render, screen } from '@testing-library/react';
import { Tooltip } from './Tooltip';

describe('Tooltip — initial render', () => {
  it('renders the trigger and does not render the tooltip on mount', () => {
    render(
      <Tooltip content="Save the record">
        <button type="button">Save</button>
      </Tooltip>,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
