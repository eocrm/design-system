import { forwardRef, type ReactNode } from 'react';
import { Button, type ButtonProps, type ButtonSize } from '../Button';
import { BrandIcon, type BrandName } from '../BrandIcon';

const ICON_SIZE: Record<ButtonSize, number> = { xs: 14, sm: 16, md: 18, lg: 20 };

export interface SocialButtonProps extends Omit<ButtonProps, 'children' | 'iconOnly' | 'selected'> {
  /**
   * Which provider's brand mark to show. Tied to `<BrandIcon>`'s set, so it
   * grows as BrandIcon does (today: `'google'` / `'yandex'`).
   */
  provider: BrandName;
  /** The button text — e.g. `"Continue with Google"`. Required (consumer-supplied). */
  label: ReactNode;
}

/**
 * A provider sign-in button: a `<Button>` with the provider brand mark and a label.
 * @see docs/components/SocialButton.md
 */
export const SocialButton = forwardRef<HTMLButtonElement, SocialButtonProps>(function SocialButton(
  { provider, label, variant = 'secondary', size = 'md', ...props },
  ref,
) {
  return (
    <Button ref={ref} variant={variant} size={size} {...props}>
      <BrandIcon name={provider} size={ICON_SIZE[size]} />
      {label}
    </Button>
  );
});
