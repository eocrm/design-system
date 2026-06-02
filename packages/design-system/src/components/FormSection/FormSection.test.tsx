import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { FormSection } from './FormSection';

describe('FormSection', () => {
  it('renders the title at the configured heading level + the description', () => {
    render(
      <FormSection title="Profile" description="Public details" titleOrder={3}>
        x
      </FormSection>,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByText('Public details')).toBeInTheDocument();
  });

  it('defaults the heading to level 2', () => {
    render(<FormSection title="Profile">x</FormSection>);
    expect(screen.getByRole('heading', { level: 2, name: 'Profile' })).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <FormSection title="T">
        <span data-testid="child">c</span>
      </FormSection>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('omits the header when no title/description', () => {
    render(
      <FormSection>
        <span data-testid="child">c</span>
      </FormSection>,
    );
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('renders a <section> and forwards ref + className + rest', () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(
      <FormSection ref={ref} className="my-cls" data-foo="bar">
        x
      </FormSection>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.tagName).toBe('SECTION');
    expect(ref.current).toBe(root);
    expect(root.className).toMatch(/my-cls/);
    expect(root).toHaveAttribute('data-foo', 'bar');
  });
});
