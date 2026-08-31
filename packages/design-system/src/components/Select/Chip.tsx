import clsx from 'clsx';
import styles from './Select.module.scss';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * Internal subcomponent rendered inside chips-mode Select triggers
 * (`multiple + triggerDisplay='chips'`). Each Chip represents one selected
 * option: a label plus a ✕ button that removes it.
 *
 * The ✕ is a real `<button>` so keyboard / AT users can focus and activate
 * it. `onPointerDown` is stopped so the click doesn't bubble to the chips
 * trigger wrapper (which would toggle the popover open/closed); `onClick`
 * is also stopped so the wrapper's click handler doesn't fire.
 *
 * Not exported from the package. The chips trigger is the only call site.
 */
export interface ChipProps {
  label: string;
  onRemove: () => void;
  disabled?: boolean;
}

export function Chip({ label, onRemove, disabled }: ChipProps) {
  const t = useTranslation();
  return (
    <span className={clsx(styles.chip, disabled && styles.chipDisabled)}>
      <span className={styles.chipLabel}>{label}</span>
      <button
        type="button"
        className={styles.chipRemove}
        aria-label={t('select.removeChip', { label })}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M1 1 L9 9 M9 1 L1 9" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
    </span>
  );
}
