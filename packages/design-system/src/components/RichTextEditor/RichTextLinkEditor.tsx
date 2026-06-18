// RichTextLinkEditor.tsx — the floating link-edit bubble for <RichTextEditor>.
// Presentational: the editor owns all state and passes the current href + the
// selection rect; this renders the URL form and positions it at the rect via a
// Floating UI virtual element (the same portal+virtual-anchor pattern as
// LiquidEditor's AutocompleteMenu, so it escapes the editor's overflow and any
// Drawer/Modal ancestor). Enter applies, Esc / click-outside cancels.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFloating, autoUpdate, flip, shift, offset } from '@floating-ui/react-dom';
import { Button } from '../Button';
import { Input } from '../Input';
import { Stack } from '../Stack';
import { Cluster } from '../Cluster';
import { useTranslation } from '../../i18n';
import styles from './RichTextEditor.module.scss';

export interface RichTextLinkEditorProps {
  /** Initial URL value (empty when creating). */
  href: string;
  /** Whether an existing link is being edited (shows the Remove button). */
  editing: boolean;
  /** Selection rect (viewport coords) the bubble anchors to. */
  anchorRect: { top: number; left: number; height: number; width: number };
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
  onApply,
  onRemove,
  onCancel,
}: RichTextLinkEditorProps) {
  const t = useTranslation();
  const [value, setValue] = useState(href);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  // Floating UI virtual element — only `getBoundingClientRect` is required.
  const virtualRef = useMemo(
    () => ({
      getBoundingClientRect: () => ({
        x: anchorRect.left,
        y: anchorRect.top,
        top: anchorRect.top,
        left: anchorRect.left,
        right: anchorRect.left + anchorRect.width,
        bottom: anchorRect.top + anchorRect.height,
        width: anchorRect.width,
        height: anchorRect.height,
      }),
    }),
    [anchorRect],
  );

  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-start',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [offset(6), flip(), shift({ padding: 4 })],
    elements: { reference: virtualRef },
  });

  // Focus the URL field on open; select its contents when editing so a re-type
  // replaces the existing href.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    if (editing) input.select();
  }, [editing]);

  // Dismiss on a pointerdown outside the bubble.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) onCancel();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [onCancel]);

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
