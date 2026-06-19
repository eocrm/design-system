import {
  forwardRef,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type UIEvent,
} from 'react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n';
import { tokenize, unknownVariables } from './liquidTokenizer';
import { getCaretCoordinates } from './caretCoordinates';
import { DEFAULT_LIQUID_FILTERS } from './liquidFilters';
import { HighlightLayer } from './HighlightLayer';
import { AutocompleteMenu } from './AutocompleteMenu';
import { InsertVariableMenu } from './InsertVariableMenu';
import { PreviewPane } from './PreviewPane';
import { useLiquidAutocomplete, applyCompletion } from './useLiquidAutocomplete';
import type { LiquidEditorProps } from './types';
import styles from './LiquidEditor.module.scss';

// Keys the autocomplete menu owns while open — handled in keyDown, so key-up
// must not recompute (which would reset the active suggestion).
const MENU_NAV_KEYS = new Set(['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Escape']);

/**
 * Liquid template editor — a code-editor-flavored control for authoring Liquid
 * template strings: syntax highlighting, a line-number gutter, a variable-insert
 * menu, caret autocomplete, client-side unknown-variable flagging, and a
 * controlled preview pane.
 *
 * Controlled only: pass `value` + `onChange`. The component never parses or
 * renders Liquid — backend syntax errors come in via `invalid`/`error`, and the
 * rendered preview comes in via `preview`/`previewStatus`.
 *
 * @example
 * // Custom-field formula editor.
 * const VARS = [
 *   { code: 'first_name', label: 'First name', type: 'text', group: 'Built-in' },
 *   { code: 'last_name', label: 'Last name', type: 'text', group: 'Built-in' },
 * ];
 * <LiquidEditor value={formula} onChange={setFormula} variables={VARS} />
 *
 * @example
 * // With a debounced backend preview.
 * <LiquidEditor
 *   value={formula}
 *   onChange={setFormula}
 *   variables={VARS}
 *   preview={rendered}
 *   previewStatus={isRendering ? 'loading' : 'idle'}
 * />
 *
 * @example
 * // Inside a Field (auto label association via id / aria-labelledby).
 * <Field label="Formula">
 *   <LiquidEditor value={formula} onChange={setFormula} variables={VARS} />
 * </Field>
 *
 * @example
 * // Extra toolbar buttons (right-aligned, before "Insert variable").
 * <LiquidEditor value={formula} onChange={setFormula} variables={VARS}
 *   toolbarActions={<Button variant="ghost" size="sm"><BookOpen size={14} /> Docs</Button>}
 * />
 *
 * @remarks When NOT to use
 * - Plain multi-line prose → use `<Textarea>`.
 * - Static, read-only code display → use the playground `CodeBlock` (the library
 *   has no block-code primitive).
 *
 * @remarks Anti-patterns
 * - ❌ Expecting it to validate Liquid syntax — it does not parse; feed
 *   `invalid`/`error` from the backend.
 * - ❌ Producing the preview inside the component — preview is consumer-rendered
 *   and arrives via `preview`/`previewStatus`.
 * - ❌ Adding `margin`/positioning hoping the editor self-places — that's the
 *   parent's job (use `<Stack>` / `<Cluster>` / a wrapper `className`).
 */
export const LiquidEditor = forwardRef<HTMLTextAreaElement, LiquidEditorProps>(
  function LiquidEditor(
    {
      value,
      onChange,
      variables = [],
      flagUnknownVariables = true,
      invalid = false,
      error,
      preview,
      previewStatus = 'idle',
      previewPlacement = 'bottom',
      showLineNumbers = true,
      showToolbar = true,
      toolbarActions,
      filters = DEFAULT_LIQUID_FILTERS as string[],
      minRows = 4,
      maxRows,
      readOnly = false,
      disabled = false,
      id,
      name,
      placeholder,
      className,
      ...aria
    },
    ref,
  ) {
    const t = useTranslation();
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    // The highlight <pre> is rendered by HighlightLayer (which doesn't forward a
    // ref), so scroll-sync resolves it from the editor-stack container instead.
    const editorStackRef = useRef<HTMLDivElement | null>(null);
    const gutterRef = useRef<HTMLDivElement | null>(null);
    const reactId = useId();
    const listboxId = `${reactId}-listbox`;
    const footerId = `${reactId}-footer`;

    // Merge the external ref with the internal one so this component can both
    // expose the textarea to consumers AND drive it (caret restore, autoresize).
    const setRefs = useCallback(
      (node: HTMLTextAreaElement | null) => {
        textareaRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    const knownCodes = useMemo(() => new Set(variables.map((v) => v.code)), [variables]);

    const tokens = useMemo(
      () => tokenize(value, flagUnknownVariables ? knownCodes : undefined),
      [value, flagUnknownVariables, knownCodes],
    );

    const unknowns = useMemo(
      () => (flagUnknownVariables ? unknownVariables(value, knownCodes) : []),
      [value, flagUnknownVariables, knownCodes],
    );

    const lineCount = useMemo(() => value.split('\n').length, [value]);

    const interactive = !readOnly && !disabled;
    const {
      state: ac,
      recompute,
      move,
      close,
    } = useLiquidAutocomplete({ variables, filters, enabled: interactive });

    const [anchorRect, setAnchorRect] = useState({ top: 0, left: 0, height: 0, width: 0 });

    // After an explicit dismiss (Escape) or accept, suppress re-opening the menu
    // at the SAME caret/value signature — otherwise the trailing keyUp (or the
    // post-commit refresh) would immediately reopen it on a still-matching word.
    // Cleared the moment the signature changes (any edit or caret move).
    const dismissedSigRef = useRef<string | null>(null);
    const dismissAt = useCallback((nextValue: string, caret: number) => {
      dismissedSigRef.current = `${caret}:${nextValue}`;
    }, []);

    const updateAnchor = useCallback(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      const ctx = getCaretCoordinates(ta, ta.selectionStart ?? 0);
      const box = ta.getBoundingClientRect();
      setAnchorRect({
        top: box.top + ctx.top,
        left: box.left + ctx.left,
        height: ctx.height,
        width: 1,
      });
    }, []);

    const refresh = useCallback(
      (nextValue: string, caret: number) => {
        // Honor an active dismissal: don't reopen at the same signature.
        if (dismissedSigRef.current === `${caret}:${nextValue}`) {
          updateAnchor();
          return;
        }
        dismissedSigRef.current = null;
        recompute(nextValue, caret);
        updateAnchor();
      },
      [recompute, updateAnchor],
    );

    // Auto-resize like Textarea: clamp height between minRows and maxRows.
    useLayoutEffect(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = 'auto';
      const cs = window.getComputedStyle(el);
      const lh = parseFloat(cs.lineHeight) || 0;
      const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
      const min = lh * minRows + padY;
      const max = maxRows !== undefined ? lh * maxRows + padY : Infinity;
      const target = Math.min(Math.max(el.scrollHeight, min), max);
      el.style.height = `${target}px`;
      el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
    }, [value, minRows, maxRows]);

    // Mirror the textarea's scroll onto the highlight <pre> and the gutter so all
    // three layers stay glyph-aligned while scrolling a tall value.
    const syncScroll = useCallback((e: UIEvent<HTMLTextAreaElement>) => {
      const ta = e.currentTarget;
      const pre = editorStackRef.current?.querySelector('pre');
      if (pre) {
        pre.scrollTop = ta.scrollTop;
        pre.scrollLeft = ta.scrollLeft;
      }
      if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop;
    }, []);

    const commit = useCallback(
      (nextValue: string, caret: number) => {
        onChange(nextValue);
        // Restore the caret after React applies the controlled value (a
        // controlled <textarea> resets the caret to the end otherwise).
        requestAnimationFrame(() => {
          const ta = textareaRef.current;
          if (ta) {
            ta.setSelectionRange(caret, caret);
            refresh(nextValue, caret);
          }
        });
      },
      [onChange, refresh],
    );

    const insertVariable = useCallback(
      (code: string) => {
        const ta = textareaRef.current;
        const snippet = `{{ ${code} }}`;
        const start = ta?.selectionStart ?? value.length;
        const end = ta?.selectionEnd ?? value.length;
        const next = value.slice(0, start) + snippet + value.slice(end);
        commit(next, start + snippet.length);
        ta?.focus();
      },
      [value, commit],
    );

    // Accept a suggestion. Defaults to the keyboard-active one; pass an explicit
    // index for mouse-clicks (which target an item regardless of the active row).
    const acceptActive = useCallback(
      (index?: number) => {
        if (!ac.open || !ac.context) return false;
        const item = ac.items[index ?? ac.activeIndex];
        const ta = textareaRef.current;
        if (!item || !ta) return false;
        // Replace from the start of the typed token (ctx.wordStart) through the
        // selection END — so any actively selected range is consumed by the
        // inserted suggestion, not left dangling after it.
        const replaceEnd = ta.selectionEnd ?? ta.selectionStart ?? 0;
        const { value: next, caret: nextCaret } = applyCompletion(
          value,
          replaceEnd,
          ac.context,
          item.value,
        );
        close();
        // A just-completed word still matches its variable; suppress the
        // immediate reopen at the resulting caret/value until the user types more.
        dismissAt(next, nextCaret);
        commit(next, nextCaret);
        return true;
      },
      [ac, value, close, commit, dismissAt],
    );

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (!ac.open) return;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          move(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          move(-1);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
          if (acceptActive()) e.preventDefault();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation(); // don't close an enclosing Drawer/Modal
          const ta = textareaRef.current;
          // Suppress the trailing keyUp from reopening the menu at this caret.
          dismissAt(e.currentTarget.value, ta?.selectionStart ?? 0);
          close();
        }
      },
      [ac.open, move, acceptActive, close, dismissAt],
    );

    const activeOptionId = ac.open ? `${listboxId}-opt-${ac.activeIndex}` : undefined;
    const hasPreview = preview !== undefined || previewStatus !== 'idle';
    const footer =
      error ??
      (unknowns.length > 0 ? t('liquidEditor.unknownVariable', { name: unknowns[0] }) : null);
    // Associate the footer description (error / unknown-variable warning) with
    // the textarea, merged with any consumer-supplied `aria-describedby`.
    const describedBy =
      [aria['aria-describedby'], footer != null ? footerId : null].filter(Boolean).join(' ') ||
      undefined;

    const editor = (
      <>
        {showToolbar ? (
          <div className={styles.toolbar}>
            {/* Spacer first → custom actions + Insert variable are pushed right. */}
            <span className={styles.toolbarSpacer} />
            {toolbarActions}
            <InsertVariableMenu
              variables={variables}
              disabled={!interactive}
              onInsert={insertVariable}
            />
          </div>
        ) : null}
        <div className={styles.body}>
          {showLineNumbers ? (
            <div ref={gutterRef} className={styles.gutter} aria-hidden="true">
              {Array.from({ length: lineCount }, (_, i) => i + 1).join('\n')}
            </div>
          ) : null}
          <div ref={editorStackRef} className={styles.editorStack}>
            <HighlightLayer tokens={tokens} />
            <textarea
              // {...aria} FIRST so the component-owned combobox ARIA + role +
              // className below always win — this control's a11y contract
              // (role="combobox", aria-expanded/controls/activedescendant) must
              // be preserved no matter what the consumer passes (CLAUDE.md Rule 7,
              // Pattern B — props first). Only aria-label/aria-labelledby flow in.
              {...aria}
              ref={setRefs}
              id={id}
              name={name}
              className={styles.textarea}
              value={value}
              placeholder={placeholder}
              readOnly={readOnly}
              disabled={disabled}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              rows={minRows}
              aria-label={
                aria['aria-label'] ??
                (aria['aria-labelledby'] ? undefined : t('liquidEditor.editorLabel'))
              }
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              role="combobox"
              aria-expanded={ac.open}
              aria-controls={ac.open ? listboxId : undefined}
              aria-activedescendant={activeOptionId}
              aria-autocomplete="list"
              onChange={(e) => {
                const next = e.target.value;
                onChange(next);
                refresh(next, e.target.selectionStart ?? next.length);
              }}
              onKeyDown={handleKeyDown}
              onKeyUp={(e) => {
                // While the menu is open, Arrow/Enter/Tab/Escape are owned by
                // keyDown. Re-running refresh() here would recompute the
                // suggestions and reset the active row to 0 — breaking keyboard
                // navigation. Skip them; other keys still resync on key-up.
                if (ac.open && MENU_NAV_KEYS.has(e.key)) return;
                refresh(e.currentTarget.value, e.currentTarget.selectionStart ?? 0);
              }}
              onClick={(e) => refresh(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)}
              onScroll={syncScroll}
              onBlur={close}
            />
          </div>
        </div>
        {footer ? (
          <div id={footerId} className={styles.footer}>
            {footer}
          </div>
        ) : null}
      </>
    );

    return (
      <div
        className={clsx(
          styles.root,
          previewPlacement === 'right' && hasPreview && styles.splitRight,
          invalid && styles.invalid,
          disabled && styles.disabled,
          className,
        )}
      >
        {previewPlacement === 'right' ? (
          <>
            <div className={styles.editorColumn}>{editor}</div>
            {hasPreview ? <PreviewPane status={previewStatus} content={preview} /> : null}
          </>
        ) : (
          <>
            {editor}
            {hasPreview ? <PreviewPane status={previewStatus} content={preview} /> : null}
          </>
        )}
        {ac.open ? (
          <AutocompleteMenu
            items={ac.items}
            activeIndex={ac.activeIndex}
            anchorRect={anchorRect}
            listboxId={listboxId}
            onSelect={(_item, index) => acceptActive(index)}
          />
        ) : null}
      </div>
    );
  },
);
