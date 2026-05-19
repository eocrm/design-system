import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Badge, type BadgeTone } from './Badge';

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('defaults to the neutral tone', () => {
    const { container } = render(<Badge>x</Badge>);
    expect((container.firstChild as HTMLElement).className).toMatch(/neutral/);
  });

  it.each<BadgeTone>(['neutral', 'info', 'success', 'warning', 'danger', 'purple'])(
    'applies the %s tone class',
    (tone) => {
      const { container } = render(<Badge tone={tone}>x</Badge>);
      expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(tone));
    },
  );

  it('merges the className prop with internal classes', () => {
    const { container } = render(<Badge className="external">x</Badge>);
    expect((container.firstChild as HTMLElement).className).toMatch(/external/);
    expect((container.firstChild as HTMLElement).className).toMatch(/badge/);
  });

  it('forwards refs to the underlying span', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Badge ref={ref}>x</Badge>);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });
});
