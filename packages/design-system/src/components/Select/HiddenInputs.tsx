export interface HiddenInputsProps {
  name?: string;
  value: string | string[];
  multiple: boolean;
  required: boolean;
  form?: string;
  disabled: boolean;
}

/**
 * Renders the hidden `<input>`(s) so native `FormData` picks up the Select's
 * value. Single mode renders one input. Multi mode renders one per selected
 * value; or, when empty and required, a single empty required input so native
 * validation blocks submit.
 */
export function HiddenInputs(props: HiddenInputsProps) {
  if (!props.name) return null;
  const { name, value, multiple, required, form, disabled } = props;

  if (!multiple) {
    const v = typeof value === 'string' ? value : '';
    return (
      <input
        type="hidden"
        name={name}
        value={v}
        required={required}
        form={form}
        disabled={disabled}
      />
    );
  }
  const arr = Array.isArray(value) ? value : [];
  if (arr.length === 0 && required) {
    return <input type="hidden" name={name} value="" required form={form} disabled={disabled} />;
  }
  return (
    <>
      {arr.map((v) => (
        <input key={v} type="hidden" name={name} value={v} form={form} disabled={disabled} />
      ))}
    </>
  );
}
