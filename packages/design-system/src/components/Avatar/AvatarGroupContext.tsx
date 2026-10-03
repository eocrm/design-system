import { createContext, useContext } from 'react';
import type { AvatarSize } from './Avatar';

export interface AvatarGroupContextValue {
  /** Uniform size for every avatar in the group. */
  size: Exclude<AvatarSize, 'inline'>;
  /** Default tooltip behavior for child avatars. */
  tooltip: boolean;
}

/**
 * Internal context shared by `<AvatarGroup>` with its descendant `<Avatar>`s; `null` means standalone.
 * @see docs/components/Avatar.md
 */
export const AvatarGroupContext = createContext<AvatarGroupContextValue | null>(null);

/** Read the surrounding group context; `null` when standalone. */
export function useAvatarGroup(): AvatarGroupContextValue | null {
  return useContext(AvatarGroupContext);
}
