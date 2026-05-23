import { createContext, useContext, type RefObject } from 'react';
import type { OverlayStackMode } from '../_internal/overlay';
import type { DrawerSide } from './useDragToClose';

export type DrawerSize = 'sm' | 'md' | 'lg';
export type DrawerOverlayVariant = 'solid' | 'blur';
/** Alias of {@link OverlayStackMode}. */
export type DrawerStackMode = OverlayStackMode;
export type { DrawerSide };

export interface DrawerContextValue {
  open: boolean;
  setOpen: (next: boolean) => void;
  /** Stable drawer id, used by the stack registry. */
  drawerId: string;
  /** Ref to the dialog container, populated by <Content>. */
  contentRef: RefObject<HTMLDivElement | null>;
  /** Stable id for the heading registered by <Header>. */
  headingId: string | null;
  setHeadingId: (id: string | null) => void;
  side: DrawerSide;
  size: DrawerSize;
  overlay: DrawerOverlayVariant;
  stackMode: DrawerStackMode;
  disableEscapeClose: boolean;
  dismissOnOverlayClick: boolean;
  dragToClose: boolean;
  initialFocusRef: RefObject<HTMLElement | null> | undefined;
  ariaLabel: string | undefined;
  ariaDescribedBy: string | undefined;
  depth: number;
  isTop: boolean;
  topMode: DrawerStackMode | null;
}

export const DrawerContext = createContext<DrawerContextValue | null>(null);

export function useDrawerContext(componentName: string): DrawerContextValue {
  const ctx = useContext(DrawerContext);
  if (!ctx) {
    throw new Error(`<Drawer.${componentName}> must be used inside <Drawer>.`);
  }
  return ctx;
}
