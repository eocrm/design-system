import { render, screen } from '@testing-library/react';
import { RichText } from './RichText';
import { createBlock, docFromText } from './engine/model';
import type { RichDoc } from './engine/model';

describe('RichText', () => {
  it('renders a document', () => {
    render(<RichText value={docFromText('Hello world')} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders structured blocks', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('heading', 'Title', { level: 2, id: '1' }),
        createBlock('bullet_item', 'item', { id: '2' }),
      ],
    };
    render(<RichText value={doc} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Title' })).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent('item');
  });

  it('forwards ref to the root div', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<RichText ref={ref} value={docFromText('x')} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges className and spreads props', () => {
    const { container } = render(
      <RichText value={docFromText('x')} className="custom" data-testid="rt" />,
    );
    expect(container.querySelector('.custom')).not.toBeNull();
    expect(screen.getByTestId('rt')).toBeInTheDocument();
  });
});
