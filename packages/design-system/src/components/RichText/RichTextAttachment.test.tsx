import { fireEvent, render, screen } from '@testing-library/react';
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
it('renders an error state with icon retry/remove buttons carrying the action hooks', () => {
  wrap(att({ id: 'b1', status: 'error', name: 'p.png' }));
  const retry = screen.getByRole('button', { name: 'Retry p.png' });
  const remove = screen.getByRole('button', { name: 'Remove p.png' });
  expect(retry).toHaveAttribute('data-attachment-action', 'retry');
  expect(retry).toHaveAttribute('data-block-id', 'b1');
  expect(remove).toHaveAttribute('data-attachment-action', 'remove');
  expect(retry).toHaveAccessibleDescription('Upload failed');
});
it('shows the UploadError reason on the failed block and describes the actions with it (#643)', () => {
  wrap(att({ status: 'error', name: 'p.png', uploadError: 'Max 5 MB.' }));
  expect(screen.getByText('Max 5 MB.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Remove p.png' })).toHaveAccessibleDescription(
    'Upload failed Max 5 MB.',
  );
});
it('names the icon buttons even without a file name', () => {
  wrap(att({ status: 'error' }));
  expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
});

it('publishes the loaded image aspect for the height cap (#644)', () => {
  wrap(
    att({ status: 'ready', src: 'http://u/p.png', mime: 'image/png', name: 'p.png', width: 700 }),
  );
  const img = document.querySelector('img')!;
  Object.defineProperty(img, 'naturalWidth', { value: 300 });
  Object.defineProperty(img, 'naturalHeight', { value: 400 });
  fireEvent.load(img);
  expect(img.style.getPropertyValue('--rich-text-image-aspect')).toBe('0.75');
});
