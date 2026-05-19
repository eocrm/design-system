// Public API of the design system. The CRM consumes from here.
export { Button } from './components/Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/Button';

export { Input } from './components/Input';
export type { InputProps } from './components/Input';

export { Card } from './components/Card';
export type { CardProps, CardPadding } from './components/Card';

export { Stack } from './components/Stack';
export type { StackProps, StackGap, StackAlign } from './components/Stack';

export { Cluster } from './components/Cluster';
export type {
  ClusterProps,
  ClusterGap,
  ClusterJustify,
  ClusterAlign,
} from './components/Cluster';

export { Avatar } from './components/Avatar';
export type { AvatarProps, AvatarSize } from './components/Avatar';

export { Badge } from './components/Badge';
export type { BadgeProps, BadgeTone } from './components/Badge';

export { Tabs } from './components/Tabs';
export type {
  TabsProps,
  TabItem,
  TabsActivationMode,
  TabsOrientation,
} from './components/Tabs';
