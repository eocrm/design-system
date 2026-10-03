import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { Title, type TitleOrder } from '../Title';
import { Text } from '../Text';
import styles from './FormSection.module.scss';

export interface FormSectionProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Section heading. */
  title?: ReactNode;
  /** Secondary text under the heading. */
  description?: ReactNode;
  /** Heading level for `title`. Default `2`. */
  titleOrder?: TitleOrder;
  /** The fields (usually `<Field>` / `<FormRow>`). */
  children: ReactNode;
}

/**
 * Titled group of form fields: a heading + description over a vertical stack.
 * @see docs/components/FormSection.md
 */
export const FormSection = forwardRef<HTMLElement, FormSectionProps>(function FormSection(
  { title, description, titleOrder = 2, className, children, ...rest },
  ref,
) {
  const hasHeader = title != null || description != null;
  return (
    <section ref={ref} className={clsx(styles.section, className)} {...rest}>
      {hasHeader && (
        <div className={styles.header}>
          {title != null && (
            <Title order={titleOrder} size="md">
              {title}
            </Title>
          )}
          {description != null && (
            <Text as="p" size="sm" tone="muted">
              {description}
            </Text>
          )}
        </div>
      )}
      <div className={styles.fields}>{children}</div>
    </section>
  );
});
