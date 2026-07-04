// RichTextLinkEditor.tsx — the floating link-edit bubble for <RichTextEditor>.
// Presentational: the editor owns all state and passes the current href + the
// selection rect; this renders the URL form and positions it at the rect via a
// Floating UI virtual element (the same portal+virtual-anchor pattern as
// LiquidEditor's AutocompleteMenu, so it escapes the editor's overflow and any
// Drawer/Modal ancestor). Enter applies, Esc / click-outside cancels.
import { useCallback, useEffect, useRef, useState } from 'react';
import { overlayStack, useFloatingSurface } from '../_internal/overlay';
import { createPortal } from 'react-dom';
import { Button } from '../Button';
import { Input } from '../Input';
import { Stack } from '../Stack';
import { Cluster } from '../Cluster';
import { useTranslation } from '../../i18n';
import type { Rect } from './selection';
import { useAnchoredFloating } from './useAnchoredFloating';
import { useDismissOnOutsidePointerDown } from './useDismissOnOutsidePointerDown';
import styles from './RichTextEditor.module.scss';

export interface RichTextLinkEditorProps {
  /** Initial URL value (empty when creating). */
  href: string;
  /** Whether an existing link is being edited (shows the Remove button). */
  editing: boolean;
  /** Selection rect (viewport coords) the bubble anchors to. */
  anchorRect: Rect;
  /**
   * Live anchor rect, re-read on every Floating UI reposition so the bubble tracks
   * the selection line on scroll (the static `anchorRect` is only the initial
   * position; it goes stale on a pure scroll, which fires no `selectionchange`).
   * Falls back to `anchorRect` when it returns null.
   */
  getAnchorRect?: () => Rect | null;
  /** Apply the (trimmed) URL. */
  onApply: (href: string) => void;
  /** Remove the link (only reachable when `editing`). */
  onRemove: () => void;
  /** Dismiss without changes (Esc / click-outside). */
  onCancel: () => void;
}

/**
 * Internal floating bubble for editing a link's URL. Rendered by
 * `<RichTextEditor>` when the link editor is open; not exported from the
 * package. Remount it (via `key`) per open so the URL field re-seeds from `href`.
 */
export function RichTextLinkEditor({
  href,
  editing,
  anchorRect,
  getAnchorRect,
  onApply,
  onRemove,
  onCancel,
}: RichTextLinkEditorProps) {
  // #274: mounted only while open — register as a floating surface so
  // Modal/Drawer/Lightbox yield Escape to us (our own Escape handling closes
  // us; without registration one press would close the host too).
  useFloatingSurface(true);
  const t = useTranslation();
  const [value, setValue] = useState(href);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  const { refs, floatingStyles } = useAnchoredFloating(anchorRect, getAnchorRect, { offset: 6 });

  // Focus the URL field on open; select its contents when editing so a re-type
  // replaces the existing href.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    if (editing) input.select();
  }, [editing]);

  // Dismiss on a pointerdown outside the bubble.
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  useDismissOnOutsidePointerDown(bubbleRef, onCancel);

  // #274: Escape must close the bubble from ANYWHERE — inside a Modal the
  // focus trap can hold focus on the dialog, so the container-scoped
  // onKeyDown below never fires; without this the registered bubble makes
  // the host yield and the press goes dead. Capture + consume so the host
  // (and the editor) treat the press as handled.
  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      overlayStack.consumeEscape(e);
      onCancelRef.current();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      bubbleRef.current = node;
      refs.setFloating(node);
    },
    [refs],
  );

  return createPortal(
    <div
      ref={setRefs}
      className={styles.linkBubble}
      style={floatingStyles}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <form
        role="group"
        data-rte-overlay=""
        aria-label={t('richTextEditor.linkEditorLabel')}
        onSubmit={(e) => {
          e.preventDefault();
          onApply(value.trim());
        }}
      >
        <Stack gap="xs">
          <Cluster gap="xs">
            <Input
              ref={inputRef}
              size="sm"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-label={t('richTextEditor.linkUrl')}
              placeholder={t('richTextEditor.linkUrlPlaceholder')}
            />
            <Button type="submit" size="sm" variant="primary">
              {t('richTextEditor.linkApply')}
            </Button>
          </Cluster>
          {editing ? (
            <Button type="button" size="sm" variant="danger" onClick={onRemove}>
              {t('richTextEditor.linkRemove')}
            </Button>
          ) : null}
        </Stack>
      </form>
    </div>,
    document.body,
  );
}
