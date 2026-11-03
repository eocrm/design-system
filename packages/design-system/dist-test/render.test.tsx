import { render, screen } from '@testing-library/react';
// The compiled package, as a consumer imports it (`npm run build` first).
import { Button, I18nProvider, Modal, Select, ru } from '../dist/index.js';

test('Button renders with compiled CSS-module classes', () => {
  render(<Button>Save</Button>);
  expect(screen.getByRole('button', { name: 'Save' }).className).not.toBe('');
});

test('Select renders a combobox', () => {
  render(<Select options={[{ value: 'a', label: 'Alpha' }]} placeholder="Pick one" />);
  const combobox = screen.getByRole('combobox');
  expect(combobox).toHaveTextContent('Pick one');
  expect(combobox.className).not.toBe('');
});

test('Modal, under I18nProvider, renders a dialog with passed-in messages', () => {
  render(
    <I18nProvider locale="ru" messages={ru}>
      <Modal open onOpenChange={() => {}}>
        <Modal.Header>Title</Modal.Header>
        <Modal.Body>Body</Modal.Body>
      </Modal>
    </I18nProvider>,
  );
  const dialog = screen.getByRole('dialog', { name: 'Title' });
  expect(dialog.className).not.toBe('');
  expect(screen.getByRole('button', { name: ru.modal.close })).toBeInTheDocument();
});
