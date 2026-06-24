import type { ReactNode } from 'react';

/** A link encountered while rendering, passed to `renderLink`. */
export interface RichTextLink {
  /** The sanitized URL. */
  href: string;
  /** The link's visible text in the document. */
  text: string;
}

/**
 * Replace how a link renders. Return your own node (e.g. a task/member chip) to
 * substitute the link, or `defaultNode` for the standard `<a>`.
 */
export type RenderLink = (link: RichTextLink, defaultNode: ReactNode) => ReactNode;
