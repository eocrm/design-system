import { createContext, useContext, type RefObject } from 'react';
import { type ModalStackMode } from './useModalStack';

export type { ModalStackMode };

export type ModalSize = 'sm' | 'md' | 'lg';
export type ModalOverlayVariant = 'solid' | 'blur';

export interface ModalContextValue {
  open: boolean;
  setOpen: (next: boolean) => void;
  /** Stable modal id, used by the stack registry + aria-controls bindings. */
  modalId: string;
  /** Ref to the dialog container, populated by <Content>. Used for focus trap + outside-click. */
  contentRef: RefObject<HTMLDivElement | null>;
  /** Stable id for the heading registered by <Header>, used for aria-labelledby. */
  headingId: string | null;
  /** Called by <Header> to register its heading id. */
  setHeadingId: (id: string | null) => void;
  /** Size preset; drives the content's --modal-size CSS class. */
  size: ModalSize;
  /** Overlay variant; drives data-variant on the portal root. */
  overlay: ModalOverlayVariant;
  /** Forwarded from props for the Esc handler in Content. */
  disableEscapeClose: boolean;
  /** Forwarded for the overlay click handler. */
  dismissOnOverlayClick: boolean;
  /** Forwarded so Content can override initial focus. */
  initialFocusRef: RefObject<HTMLElement | null> | undefined;
  /** From Modal props; used by Content for aria-label when no heading is registered. */
  ariaLabel: string | undefined;
  ariaDescribedBy: string | undefined;
  /** Current stack depth (for the --modal-depth custom prop on the overlay). */
  depth: number;
  /** Whether this modal is currently the topmost open modal. Drives Escape/focus-trap activity. */
  isTop: boolean;
  /** This modal's own stackMode prop. */
  stackMode: ModalStackMode;
  /** Mode of the current top modal (null if stack is empty). */
  topMode: ModalStackMode | null;
}

export const ModalContext = createContext<ModalContextValue | null>(null);

export function useModalContext(componentName: string): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error(`<Modal.${componentName}> must be used inside <Modal>.`);
  }
  return ctx;
}
