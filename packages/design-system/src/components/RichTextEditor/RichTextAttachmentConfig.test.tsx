import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../../i18n';
import { RichTextAttachmentConfig } from './RichTextAttachmentConfig';
import type { Block } from '../RichText/engine/model';

const rect = { top: 10, left: 10, width: 200, height: 120 };
const imgBlock = (over: Partial<Block> = {}): Block => ({
  id: 'v',
  type: 'attachment',
  status: 'ready',
  src: 'http://u/p.png',
  mime: 'image/png',
  name: 'p.png',
  alt: 'Chart',
  inlines: [],
  ...over,
});

function setup(
  block: Block,
  handlers: Partial<React.ComponentProps<typeof RichTextAttachmentConfig>> = {},
) {
  const props = {
    block,
    anchorRect: rect,
    maxWidth: 600,
    accept: 'image/*',
    onAltChange: vi.fn(),
    onAlignChange: vi.fn(),
    onWidthChange: vi.fn(),
    onWidthReset: vi.fn(),
    onReplace: vi.fn(),
    onClose: vi.fn(),
    ...handlers,
  };
  render(
    <I18nProvider locale="en">
      <RichTextAttachmentConfig {...props} />
    </I18nProvider>,
  );
  return props;
}

it('renders the alt field seeded from the block and commits on blur', async () => {
  const p = setup(imgBlock());
  const input = screen.getByLabelText('Alt text') as HTMLInputElement;
  expect(input.value).toBe('Chart');
  await userEvent.clear(input);
  await userEvent.type(input, 'New alt');
  input.blur();
  expect(p.onAltChange).toHaveBeenCalledWith('New alt');
});

it('commits alt on Enter', async () => {
  const p = setup(imgBlock());
  const input = screen.getByLabelText('Alt text');
  await userEvent.clear(input);
  await userEvent.type(input, 'Edited{Enter}');
  expect(p.onAltChange).toHaveBeenCalledWith('Edited');
});

it('does NOT commit alt on a no-op blur (no seeded-name write)', async () => {
  // An image with no alt seeds the field from `name`; blurring without editing
  // must not write `name` into alt.
  const p = setup(imgBlock({ alt: undefined, name: 'photo.png' }));
  const input = screen.getByLabelText('Alt text') as HTMLInputElement;
  expect(input.value).toBe('photo.png');
  input.focus();
  input.blur();
  expect(p.onAltChange).not.toHaveBeenCalled();
});

it('omits Open/Download for an unsafe src', () => {
  setup(imgBlock({ src: 'javascript:alert(1)' }));
  expect(screen.queryByRole('link', { name: 'Open' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'Download' })).toBeNull();
});

it('a pointerdown outside the popover calls onClose', () => {
  const p = setup(imgBlock());
  fireEvent.pointerDown(document.body);
  expect(p.onClose).toHaveBeenCalled();
});

it('choosing a file in Replace fires onReplace with the File', async () => {
  const p = setup(imgBlock());
  // the hidden input is unlabeled — grab it directly
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(['x'], 'new.png', { type: 'image/png' });
  await userEvent.upload(input, file);
  expect(p.onReplace).toHaveBeenCalledWith(file);
});

it('fires onAlignChange from the alignment buttons', async () => {
  const p = setup(imgBlock());
  await userEvent.click(screen.getByRole('button', { name: 'Align center' }));
  expect(p.onAlignChange).toHaveBeenCalledWith('center');
});

it('fires onWidthReset from the reset control', async () => {
  const p = setup(imgBlock({ width: 320 }));
  await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
  expect(p.onWidthReset).toHaveBeenCalled();
});

it('shows the Width control for an image with explicit dimensions (embed)', () => {
  setup(imgBlock({ width: 320 }));
  expect(screen.getByRole('slider', { name: 'Width' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
});

it('hides the Width control for an image with no dimensions (uploaded), keeping alt/align', () => {
  setup(imgBlock()); // no width
  expect(screen.queryByRole('slider', { name: 'Width' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull();
  // Alt + alignment are still offered — only Width is gated on known dimensions.
  expect(screen.getByLabelText('Alt text')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Align center' })).toBeInTheDocument();
});

it('a non-image attachment shows only Replace/Open/Download (no alt/align/width)', () => {
  setup(
    imgBlock({ mime: 'application/pdf', src: 'http://u/d.pdf', name: 'd.pdf', alt: undefined }),
  );
  expect(screen.queryByLabelText('Alt text')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Align center' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Replace' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Download' })).toBeInTheDocument();
});

it('Open + Download links point at the src', () => {
  setup(imgBlock());
  expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', 'http://u/p.png');
  const dl = screen.getByRole('link', { name: 'Download' });
  expect(dl).toHaveAttribute('href', 'http://u/p.png');
  expect(dl).toHaveAttribute('download');
});

it('Escape calls onClose', async () => {
  const p = setup(imgBlock());
  screen.getByLabelText('Alt text').focus();
  await userEvent.keyboard('{Escape}');
  expect(p.onClose).toHaveBeenCalled();
});
