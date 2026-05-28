import { render, screen } from '@testing-library/react';
import { TopBar } from './TopBar';

describe('TopBar (smoke)', () => {
  it('renders without crashing', () => {
    render(<TopBar aria-label="bar" />);
    expect(screen.getByRole('banner', { name: 'bar' })).toBeInTheDocument();
  });
});
