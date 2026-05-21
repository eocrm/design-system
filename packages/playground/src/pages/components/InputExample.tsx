import type { ReactNode } from 'react';
import { Cluster } from '@eocrm/design-system';

export interface InputExampleProps {
  /**
   * Fixed width (in px or any CSS length) of the inner column. Defaults
   * to `320` — enough to fit `<Input>` / `<Select>` / `<DatePicker>` /
   * `<DateRangePicker>` with a realistic placeholder + suffix buttons.
   * Pass a larger value for compound rows (form + submit button beside
   * the field), or `'auto'` for intrinsically-sized content (e.g.
   * inline calendars) — the inner column then doesn't impose a width
   * and the `<Cluster>` still centers the children.
   */
  width?: number | string;
  /** The field (single component) or composed row (Stack / form) to render inside. */
  children: ReactNode;
}

/**
 * Demo helper. Wraps an input-shaped component (Input, Select,
 * DatePicker, DateRangePicker, InlineDatePicker, …) in a centered,
 * width-limited container so every field-component demo lays out
 * consistently.
 *
 * - Default width 320px centers the field at a realistic CRM-form size.
 * - `width="auto"` skips the inner width constraint so intrinsically
 *   sized children (inline calendars) render at their natural size,
 *   still centered.
 */
export function InputExample({ width = 320, children }: InputExampleProps) {
  if (width === 'auto') {
    return (
      <Cluster gap="md" justify="center">
        {children}
      </Cluster>
    );
  }
  return (
    <Cluster gap="md" justify="center">
      <div style={{ width }}>{children}</div>
    </Cluster>
  );
}
