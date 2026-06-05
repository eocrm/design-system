import { forwardRef, type ReactNode } from 'react';
import { Button, type ButtonProps, type ButtonSize } from '../Button';
import { BrandIcon, type BrandName } from '../BrandIcon';

const ICON_SIZE: Record<ButtonSize, number> = { xs: 14, sm: 16, md: 18, lg: 20 };

export interface SocialButtonProps extends Omit<ButtonProps, 'children' | 'iconOnly'> {
  /**
   * Which provider's brand mark to show. Tied to `<BrandIcon>`'s set, so it
   * grows as BrandIcon does (today: `'google'` / `'yandex'`).
   */
  provider: BrandName;
  /** The button text — e.g. `"Continue with Google"`. Required (consumer-supplied). */
  label: ReactNode;
}

/**
 * A provider sign-in button: a `<Button>` with the provider's brand mark
 * (`<BrandIcon>`) and a label — the common SSO row ("Continue with Google").
 *
 * Defaults to `variant="secondary"` and spreads the rest of `<Button>`'s props
 * (`onClick`, `size`, `disabled`, `type`, …). The brand mark is decorative; the
 * `label` is the accessible name. Width comes from the parent (stack/grid).
 *
 * @example
 * <SocialButton provider="google" label="Continue with Google" onClick={signInWithGoogle} />
 *
 * @example
 * // Stack a few providers:
 * <Stack gap="sm">
 *   <SocialButton provider="google" label="Continue with Google" onClick={...} />
 *   <SocialButton provider="yandex" label="Continue with Yandex" onClick={...} />
 * </Stack>
 *
 * @remarks When NOT to use
 * - For a generic action with an icon → use `<Button>` with a `lucide-react` icon.
 * - This is specifically for SSO provider marks from `<BrandIcon>`; for any other
 *   leading glyph, use `<Button>` directly.
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
