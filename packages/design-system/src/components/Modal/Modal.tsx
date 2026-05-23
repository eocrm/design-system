import { ModalRoot } from './ModalRoot';
import { Header } from './Header';
import { Body } from './Body';
import { Footer } from './Footer';
import { Close } from './Close';

/**
 * Compound `<Modal>` family. Subcomponents attached via Object.assign so
 * consumers write `<Modal.Header>` etc., not separate imports.
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
