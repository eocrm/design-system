import { useEffect, useRef, type RefObject } from 'react';

/** An edit to apply in place of the typed char, or `block` (cancel it) / `pass` (let it through). */
export type SeparatorTyping =
  | { text: string; caret: number; converted: boolean }
  | { block: boolean; converted: boolean };

/**
 * What a typed `.` or locale decimal means in a locale whose decimal is not `.` (`de`, `es`, `ru`).
 * `converted`: the text's decimal came from a typed `.`. Returns null for any other char/locale.
 * - `.` with no decimal outside the selection types the decimal (converted).
 * - Where `.` groups: `.` or the decimal right after a converted decimal + exactly 3 digits means the
 *   dot was a thousands dot — it becomes the group and the new char is inserted (`1.234,5`, `1.234.567`).
 * - Any other `.` with a decimal outside the selection does nothing; a typed decimal passes through.
 */
export function typeSeparator(
  text: string,
  start: number,
  end: number,
  ch: string,
  decimal: string,
  group: string,
  converted: boolean,
): SeparatorTyping | null {
  if (decimal === '.' || (ch !== '.' && ch !== decimal)) return null;
  const at = [...text].findIndex((c, i) => c === decimal && (i < start || i >= end));
  if (at === -1) {
    if (ch === decimal) return { block: false, converted: false };
    return {
      text: text.slice(0, start) + decimal + text.slice(end),
      caret: start + 1,
      converted: true,
    };
  }
  if (
    converted &&
    group === '.' &&
    /^\d{3}$/.test(text.slice(at + 1, start)) &&
    !/\d/.test(text[end] ?? '')
  ) {
    const head = text.slice(0, at) + group + text.slice(at + 1, start);
    return { text: head + ch + text.slice(end), caret: start + 1, converted: false };
  }
  return { block: ch === '.', converted };
}

/**
 * Wires `typeSeparator` to the input's native `beforeinput` (mobile keyboards send no usable
 * keydown key); IME composition is left alone. `apply` writes an edit; returns the `converted` flag.
 */
export function useSeparatorTyping(
  ref: RefObject<HTMLInputElement | null>,
  decimal: string,
  group: string,
  apply: (input: HTMLInputElement, text: string, caret: number) => void,
) {
  const converted = useRef(false);
  const applyRef = useRef(apply);
  applyRef.current = apply;
  useEffect(() => {
    const el = ref.current;
    if (!el || decimal === '.') return;
    let composing = false;
    const onBeforeInput = (e: InputEvent) => {
      const { selectionStart: start, selectionEnd: end } = el;
      if (e.inputType !== 'insertText' || !e.data || e.isComposing || composing) return;
      if (start === null || end === null) return;
      const r = typeSeparator(el.value, start, end, e.data, decimal, group, converted.current);
      if (!r) return;
      converted.current = r.converted;
      if ('text' in r) {
        e.preventDefault();
        applyRef.current(el, r.text, r.caret);
      } else if (r.block) e.preventDefault();
    };
    // A paste, drop or deleted decimal ends what a typed '.' meant.
    const reset = () => {
      converted.current = false;
    };
    const onInput = () => {
      if (!el.value.includes(decimal)) reset();
    };
    const onStart = () => {
      composing = true;
    };
    const onEnd = () => {
      composing = false;
    };
    const listeners: [string, EventListener][] = [
      ['beforeinput', onBeforeInput as EventListener],
      ['input', onInput],
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
  return converted;
}
