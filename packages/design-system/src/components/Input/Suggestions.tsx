import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  type ChangeEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { autoUpdate, flip, offset, size, useFloating } from '@floating-ui/react-dom';
import clsx from 'clsx';
import { useTranslation } from '../../i18n/useTranslation';
import { chain } from '../_internal/refs';
import { overlayStack, useFloatingSurface, useInOverlay } from '../_internal/overlay';
import styles from './Input.module.scss';

type Handlers = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  'onFocus' | 'onClick' | 'onChange' | 'onKeyDown' | 'onBlur'
>;

/**
 * Write a value the way typing does: the native setter bypasses React's value
 * tracker, and the bubbling `input` event fires the consumer's `onChange` in
 * both controlled and uncontrolled use.
 */
function setNativeValue(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Internal: `<Input suggestions>` — an ARIA 1.2 list-autocomplete combobox.
 * Returns props to spread on the `<input>` (consumer handlers chained first),
 * a ref the input must carry while `enabled`, and the portalled listbox. With
 * no suggestions it returns nothing and the input stays a plain textbox. The
 * popup machinery (Floating UI, overlay stack) lives in `<SuggestionsPopup>`,
 * mounted only while the list is shown, so a closed or plain Input renders once.
 */
export function useSuggestions(
  suggestions: readonly string[] | undefined,
  readOnly: boolean | undefined,
  handlers: Handlers,
): {
  enabled: boolean;
  inputProps: InputHTMLAttributes<HTMLInputElement>;
  inputRef: RefObject<HTMLInputElement | null>;
  popup: ReactNode;
} {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Set by the mounted popup: its overlay-stack id, for the Escape gate.
  const floatingIdRef = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  // null = not edited since opening: show every suggestion, so a prefilled
  // value doesn't hide the others.
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(-1);

  const enabled = !!suggestions?.length && !readOnly;
  // Deduped (first occurrence wins, order kept): the value is the row key and identity.
  const all = enabled ? [...new Set(suggestions)] : [];
  // A changed list (by value, not identity) invalidates the highlighted row.
  const listKey = JSON.stringify(all);
  const [seenKey, setSeenKey] = useState(listKey);
  if (seenKey !== listKey) {
    setSeenKey(listKey);
    setActive(-1);
  }
  if (!enabled) return { enabled, inputProps: {}, inputRef, popup: null };

  const needle = query?.toLowerCase();
  const visible = needle == null ? all : all.filter((s) => s.toLowerCase().includes(needle));
  const shown = open && visible.length > 0;
  // Clamp: `visible` can shrink under a highlighted row (filter, or the parent's new list).
  const activeIdx = active < visible.length ? active : -1;

  const optionId = (i: number) => `${listboxId}-${i}`;
  const openAll = () => {
    setOpen(true);
    setQuery(null);
    setActive(-1);
  };
  const close = () => {
    setOpen(false);
    setActive(-1);
  };
  const choose = (value: string | undefined) => {
    if (value === undefined) return;
    if (inputRef.current) setNativeValue(inputRef.current, value);
    close();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Mid-IME-composition Enter/arrows belong to the IME (commit / candidate pick).
    if (e.defaultPrevented || e.nativeEvent.isComposing) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      // Closed: open with every suggestion and start from nothing highlighted.
      const n = shown ? visible.length : all.length;
      const from = shown ? activeIdx : -1;
      if (!shown) openAll();
      setActive(from < 0 ? (delta > 0 ? 0 : n - 1) : (from + delta + n) % n);
    } else if (e.key === 'Enter' && shown && activeIdx >= 0) {
      // No highlight: Enter stays native (e.g. submits the form).
      e.preventDefault();
      choose(visible[activeIdx]);
    } else if (
      e.key === 'Escape' &&
      shown &&
      floatingIdRef.current &&
      overlayStack.isTopFloating(floatingIdRef.current)
    ) {
      e.preventDefault(); // also stops the native <input type="search"> clear
      overlayStack.consumeEscape(e.nativeEvent);
      close();
    }
  };

  const inputProps: InputHTMLAttributes<HTMLInputElement> = {
    role: 'combobox',
    'aria-autocomplete': 'list',
    'aria-expanded': shown,
    // Only while the listbox exists — it is unmounted when collapsed.
    'aria-controls': shown ? listboxId : undefined,
    'aria-activedescendant': shown && activeIdx >= 0 ? optionId(activeIdx) : undefined,
    onFocus: chain<FocusEvent<HTMLInputElement>>(handlers.onFocus, openAll),
    onClick: chain<MouseEvent<HTMLInputElement>>(handlers.onClick, () => {
      if (!open) openAll();
    }),
    onChange: chain<ChangeEvent<HTMLInputElement>>(handlers.onChange, (e) => {
      setQuery(e.target.value);
      setOpen(true);
      setActive(-1);
    }),
    onKeyDown: chain<KeyboardEvent<HTMLInputElement>>(handlers.onKeyDown, onKeyDown),
    // Blur (incl. Tab) closes without selecting; option presses keep focus.
    onBlur: chain<FocusEvent<HTMLInputElement>>(handlers.onBlur, close),
  };

  const popup = shown && (
    <SuggestionsPopup
      inputRef={inputRef}
      floatingIdRef={floatingIdRef}
      listboxId={listboxId}
      visible={visible}
      active={activeIdx}
      optionId={optionId}
      onActivate={setActive}
      onChoose={choose}
    />
  );

  return { enabled, inputProps, inputRef, popup };
}

function SuggestionsPopup({
  inputRef,
  floatingIdRef,
  listboxId,
  visible,
  active,
  optionId,
  onActivate,
  onChoose,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  floatingIdRef: RefObject<string | null>;
  listboxId: string;
  visible: string[];
  active: number;
  optionId: (i: number) => string;
  onActivate: (i: number) => void;
  onChoose: (value: string) => void;
}) {
  const t = useTranslation();
  // #274/#280: hosts (Modal/Drawer) yield Escape while we're shown.
  const floatingId = useFloatingSurface(true);
  const inOverlay = useInOverlay(inputRef, true);
  useLayoutEffect(() => {
    floatingIdRef.current = floatingId;
    return () => {
      floatingIdRef.current = null;
    };
  }, [floatingIdRef, floatingId]);

  const { refs, floatingStyles, isPositioned } = useFloating({
    open: true,
    placement: 'bottom-start',
    transform: false,
    middleware: [
      offset(4),
      flip(),
      size({
        padding: 8,
        apply({ rects, availableHeight, elements }) {
          // The popup's own floating geometry: the input's width, and the
          // viewport room `.suggestions` caps its max-height with.
          elements.floating.style.width = `${rects.reference.width}px`;
          elements.floating.style.setProperty(
            '--input-suggestions-available-height',
            `${Math.max(0, availableHeight)}px`,
          );
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });
  const { setReference } = refs;
  useLayoutEffect(() => setReference(inputRef.current), [setReference, inputRef]);

  // Focus stays in the input (activedescendant), so keep the active row visible by hand.
  const listRef = useRef<HTMLUListElement | null>(null);
  useEffect(() => {
    if (!isPositioned || active < 0) return;
    listRef.current?.children[active]?.scrollIntoView?.({ block: 'nearest' });
  }, [isPositioned, active]);

  return createPortal(
    <ul
      ref={(node) => {
        listRef.current = node;
        refs.setFloating(node);
      }}
      id={listboxId}
      role="listbox"
      aria-label={t('input.suggestions')}
      style={floatingStyles}
      data-in-overlay={inOverlay ? '' : undefined}
      className={styles.suggestions}
      // Keep focus (and the caret) in the input on any press inside the list.
      onMouseDown={(e) => e.preventDefault()}
    >
      {visible.map((s, i) => (
        <li
          key={s}
          id={optionId(i)}
          role="option"
          aria-selected={i === active}
          className={clsx(styles.suggestion, i === active && styles.suggestionActive)}
          // mousemove, not mouseenter: rows scrolling under a resting pointer must not steal the highlight.
          onMouseMove={() => {
            if (i !== active) onActivate(i);
          }}
          onClick={() => onChoose(s)}
        >
          {s}
        </li>
      ))}
    </ul>,
    document.body,
  );
}
