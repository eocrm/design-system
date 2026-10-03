import { ModalRoot } from './ModalRoot';
import { Header } from './Header';
import { Body } from './Body';
import { Footer } from './Footer';
import { Close } from './Close';

/**
 * Compound `<Modal>` family: `Modal.Header`, `Body`, `Footer` and `Close` attached via `Object.assign`.
 * @see docs/components/Modal.md
 */
export const Modal = Object.assign(ModalRoot, {
  Header,
  Body,
  Footer,
  Close,
});

export type { ModalProps } from './ModalRoot';
export type { ModalSize, ModalOverlayVariant, ModalStackMode } from './context';
export type { ModalHeaderProps } from './Header';
export type { ModalBodyProps } from './Body';
export type { ModalFooterProps } from './Footer';
export type { ModalCloseProps } from './Close';
