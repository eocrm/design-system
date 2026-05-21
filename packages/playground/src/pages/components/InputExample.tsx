import type { ReactNode } from 'react';
import { Cluster } from '@eocrm/design-system';

export interface InputExampleProps {
  /**
   * Fixed width (in px or any CSS length) of the inner column. Defaults to
   * `320` — enough to fit `<Input>` / `<Select>` / `<DatePicker>` with a
   * realistic placeholder + suffix buttons. Pass a larger value for
   * compound rows (form + submit button) or `'100%'` to fill the
   * `<Example>` preview area.
   */
  width?: number | string;
  /** The field (single component) or composed row (Stack / form) to render inside. */
  children: ReactNode;
}

/**
 * Demo helper. Wraps an input-shaped component (Input, Select, DatePicker,
 * DateRangePicker, …) in a centered, width-limited container so every
 * field-component demo lays out consistently:
 *
 * - The field renders at a realistic CRM-form width (≈ 320px) rather than
 *   stretched across the full preview area.
 * - It sits centered horizontally so the eye lands on the control.
 *
 * For multi-field examples (variants stacked vertically, form + submit
 * button beside the field) wrap the children in `<Stack>` / `<form>` /
 * a flex row as you normally would — `<InputExample>` just owns the
 * outer centering + width box.
 */
export function InputExample({ width = 320, children }: InputExampleProps) {
  return (
    <Cluster gap="md" justify="center">
      <div style={{ width }}>{children}</div>
    </Cluster>
  );
}
