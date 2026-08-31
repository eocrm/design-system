import { render, screen } from '@testing-library/react';
import { I18nProvider } from '../../i18n';
import { RichTextAttachment } from './RichTextAttachment';
import type { Block } from './engine/model';

const att = (over: Partial<Block>): Block => ({
  id: 'a',
  type: 'attachment',
  inlines: [],
  ...over,
});
const wrap = (b: Block) =>
  render(
    <I18nProvider locale="en">
      <RichTextAttachment block={b} />
    </I18nProvider>,
  );

it('renders an image preview when ready + image mime', () => {
  wrap(
    att({ status: 'ready', src: 'http://u/p.png', mime: 'image/png', name: 'p.png', alt: 'Chart' }),
  );
  expect(screen.getByRole('img', { name: 'Chart' })).toBeInTheDocument();
});
it('renders a file chip (download link) for a non-image', () => {
  wrap(att({ status: 'ready', src: 'http://u/d.pdf', mime: 'application/pdf', name: 'd.pdf' }));
  const link = screen.getByRole('link', { name: /d\.pdf/i });
  expect(link).toHaveAttribute('href', 'http://u/d.pdf');
});
it('treats a missing mime as an image by URL extension', () => {
  wrap(att({ status: 'ready', src: 'http://u/photo.PNG', name: 'photo.PNG', alt: 'Pic' }));
  expect(screen.getByRole('img', { name: 'Pic' })).toBeInTheDocument();
});
it('does not render a live image for an unsafe src (degrades to chip)', () => {
  wrap(att({ status: 'ready', src: 'javascript:alert(1)', mime: 'image/png', name: 'x.png' }));
  expect(screen.queryByRole('img')).toBeNull();
  // chip link has no live unsafe href
  const link = screen.queryByRole('link');
  expect(link?.getAttribute('href') ?? '').not.toContain('javascript:');
});
it('renders a spinner while uploading', () => {
  wrap(att({ status: 'uploading', name: 'p.png' }));
  expect(screen.getByText('p.png')).toBeInTheDocument();
  expect(screen.getByLabelText('Uploading…')).toBeInTheDocument();
});
it('renders an error state with retry/remove action hooks', () => {
  wrap(att({ status: 'error', name: 'p.png' }));
  expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
  expect(document.querySelector('[data-attachment-action="retry"]')).toBeTruthy();
  expect(document.querySelector('[data-attachment-action="remove"]')).toBeTruthy();
});
