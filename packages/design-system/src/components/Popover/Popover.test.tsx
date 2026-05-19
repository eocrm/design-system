import { render, screen } from '@testing-library/react';
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
