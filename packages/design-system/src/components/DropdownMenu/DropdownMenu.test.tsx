import { render } from '@testing-library/react';
import { DropdownMenu } from './DropdownMenu';

describe('DropdownMenu', () => {
  it('renders without crashing', () => {
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger />
        <DropdownMenu.Content />
      </DropdownMenu>,
    );
  });
});
