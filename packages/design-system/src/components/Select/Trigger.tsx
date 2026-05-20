import clsx from 'clsx';
import { useSelectContext } from './context';
import styles from './Select.module.scss';

export interface TriggerProps {
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  invalid?: boolean;
  clearable?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

/**
 * Button-styled trigger for the single, non-searchable Select mode.
 *
 * Phase 2 scope only — Phase 4 will add the searchable combobox-input
 * variant and Phase 6 the chips-input shell. The current implementation
 * stays focused on the button.
 */
export function Trigger(props: TriggerProps) {
  const ctx = useSelectContext('Trigger');
  const selectedRow =
    !ctx.multiple && typeof ctx.value === 'string' && ctx.value !== ''
      ? ctx.allRows.find((r) => r.kind === 'option' && r.option.value === ctx.value)
      : null;
  const hasValue = selectedRow !== null && selectedRow !== undefined;
  const label =
    hasValue && selectedRow.kind === 'option'
      ? selectedRow.option.label
      : (props.placeholder ?? '');

  return (
    <button
      type="button"
      id={ctx.triggerId}
      ref={ctx.triggerRef as React.Ref<HTMLButtonElement>}
      className={clsx(styles.trigger, styles.triggerButton, !hasValue && styles.placeholder)}
      aria-haspopup="listbox"
      aria-expanded={ctx.open}
      aria-controls={ctx.open ? ctx.listboxId : undefined}
      aria-label={props['aria-label']}
      aria-labelledby={props['aria-labelledby']}
      aria-describedby={props['aria-describedby']}
      aria-invalid={props.invalid || undefined}
      aria-readonly={props.readOnly || undefined}
      disabled={props.disabled}
      onClick={() => {
        if (props.disabled || props.readOnly) return;
        ctx.setOpen(!ctx.open);
      }}
    >
      {label}
    </button>
  );
}
