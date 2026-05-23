import { DrawerRoot } from './DrawerRoot';
import { Header } from './Header';
import { Body } from './Body';
import { Footer } from './Footer';
import { Close } from './Close';

/**
 * Compound `<Drawer>` family. Subcomponents attached via Object.assign so
 * consumers write `<Drawer.Header>` etc., not separate imports.
 */
export const Drawer = Object.assign(DrawerRoot, {
  Header,
  Body,
  Footer,
  Close,
});

export type { DrawerProps } from './DrawerRoot';
export type {
  DrawerSide,
  DrawerSize,
  DrawerOverlayVariant,
  DrawerStackMode,
} from './context';
export type { DrawerHeaderProps } from './Header';
export type { DrawerBodyProps } from './Body';
export type { DrawerFooterProps } from './Footer';
export type { DrawerCloseProps } from './Close';
