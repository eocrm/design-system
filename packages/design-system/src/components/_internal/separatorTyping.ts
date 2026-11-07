import { useEffect, useRef, type RefObject } from 'react';

/**
 * `converted`: the text's decimal came from a typed `.`.
 * `grouped`: a converted `.` was reinterpreted as a group, so typing keeps strict 3-digit groups.
 */
export type SeparatorState = { converted: boolean; grouped: boolean };

/** An edit to apply in place of the typed char, or `block` (cancel it) / `pass` (let it through). */
export type SeparatorTyping =
  | { text: string; caret: number; state: SeparatorState }
  | { block: boolean; state: SeparatorState };

/**
 * What a typed `.`, locale decimal or (while `grouped`) digit means in a locale whose decimal is
 * not `.` (`de`, `es`, `ru`). Returns null when the browser should handle the char unchanged.
 * - `.` with no decimal outside the selection types the decimal (converted).
 * - Where `.` groups: a separator right after a converted decimal + exactly 3 digits means the
 *   dot was a thousands dot — it becomes the group and the decimal is typed (`1.234,5`); a typed
 *   `.` there is again a converted decimal (`1.234.5` is 1234.5, `1.234.567,8` is 1234567.8).
 * - After that (`grouped`), a 4th digit in an integer group, or a separator after an incomplete
 *   group, is blocked, so a reinterpretation never turns into a silent ×10 000.
 * - Any other `.` with a decimal outside the selection is blocked; a typed decimal passes through
 *   (the component rejects or flags the second decimal). Either way it clears `converted`.
 */
export function typeSeparator(
  text: string,
  start: number,
  end: number,
  ch: string,
  decimal: string,
  group: string,
  state: SeparatorState,
): SeparatorTyping | null {
  if (decimal === '.') return null;
  const strict = state.grouped && group === '.';
  const at = [...text].findIndex((c, i) => c === decimal && (i < start || i >= end));
  if (/^\d$/.test(ch)) {
    if (!strict || (at !== -1 && at < start)) return null;
    const int = (text.slice(0, start) + ch + text.slice(end)).split(decimal)[0];
    return int.split(group).some((run) => run.replace(/\D/g, '').length > 3)
      ? { block: true, state }
      : null;
  }
  if (ch !== '.' && ch !== decimal) return null;
  if (at === -1) {
    const head = text.slice(0, start);
    const g = head.lastIndexOf(group);
    if (strict && g !== -1 && !/^\d{3}$/.test(head.slice(g + 1))) return { block: true, state };
    if (ch === decimal) return { block: false, state: { ...state, converted: false } };
    return {
      text: head + decimal + text.slice(end),
      caret: start + 1,
      state: { ...state, converted: true },
    };
  }
  if (
    state.converted &&
    group === '.' &&
    /^\d{3}$/.test(text.slice(at + 1, start)) &&
    !/\d/.test(text[end] ?? '')
  ) {
    const head = text.slice(0, at) + group + text.slice(at + 1, start);
    return {
      text: head + decimal + text.slice(end),
      caret: start + 1,
      state: { converted: ch === '.', grouped: true },
    };
  }
  return { block: ch === '.', state: { ...state, converted: false } };
}

/**
 * Wires `typeSeparator` to the input's native `beforeinput` (mobile keyboards send no usable
 * keydown key); IME composition and non-cancelable events are left alone. `apply` writes an edit
 * and returns whether it was accepted; returns the state ref (MoneyInput's precision rule uses it).
 */
export function useSeparatorTyping(
  ref: RefObject<HTMLInputElement | null>,
  decimal: string,
  group: string,
  apply: (input: HTMLInputElement, text: string, caret: number) => boolean,
) {
  const state = useRef<SeparatorState>({ converted: false, grouped: false });
  const applyRef = useRef(apply);
  applyRef.current = apply;
  useEffect(() => {
    const el = ref.current;
    if (!el || decimal === '.') return;
    let composing = false;
    const onBeforeInput = (e: InputEvent) => {
      const { selectionStart: start, selectionEnd: end, value } = el;
      if (e.inputType !== 'insertText' || !e.data || e.isComposing || composing) return;
      if (!e.cancelable || start === null || end === null) return;
      // A deleted converted decimal / all groups gone ends what they meant.
      const s = state.current;
      if (!value.includes(decimal)) s.converted = false;
      if (!value.includes(group)) s.grouped = false;
      const r = typeSeparator(value, start, end, e.data, decimal, group, s);
      if (!r) return;
      if ('text' in r) {
        e.preventDefault();
        if (applyRef.current(el, r.text, r.caret)) state.current = r.state;
        return;
      }
      if (r.block) e.preventDefault();
      state.current = r.state;
    };
    // A paste, drop or refocus ends what a typed '.' meant.
    const reset = () => {
      state.current = { converted: false, grouped: false };
    };
    const onStart = () => {
      composing = true;
    };
    const onEnd = () => {
      composing = false;
    };
    const listeners: [string, EventListener][] = [
      ['beforeinput', onBeforeInput as EventListener],
      ['paste', reset],
      ['drop', reset],
      ['focus', reset],
      ['compositionstart', onStart],
      ['compositionend', onEnd],
    ];
    for (const [type, fn] of listeners) el.addEventListener(type, fn);
    return () => {
      for (const [type, fn] of listeners) el.removeEventListener(type, fn);
    };
  }, [ref, decimal, group]);
  return state;
}
