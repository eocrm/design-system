import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Select.module.scss';

export interface SelectProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * Scaffold root for the Select component. Phase 1 only renders an empty
 * forwardRef'd `<div>` so the rest of the foundation work (types, utils,
 * state hook) can land before Trigger / Listbox / Content are wired in
 * Phase 2.
 */
export const Select = forwardRef<HTMLDivElement, SelectProps>(function Select(
  { className, ...props },
  ref,
) {
  return <div ref={ref} data-select="" className={clsx(styles.root, className)} {...props} />;
});
