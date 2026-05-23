import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  UserCog,
  Search,
  Bell,
  Plus,
  Component,
  MousePointer2,
  CheckSquare,
  CircleDot,
  TextCursorInput,
  ChevronsUpDown,
  CalendarRange,
  RectangleHorizontal,
  Rows3,
  Columns3,
  CircleUser,
  Tag,
  PanelTop,
  Layers,
  ArrowRight,
  MessageSquare,
  AppWindow,
  MoreHorizontal,
  KeyRound,
  PanelLeft,
  PanelRight,
  ShieldCheck,
  CalendarDays,
  Inbox,
  Square,
  Table as TableIcon,
  TableProperties,
  ListOrdered,
  type LucideIcon,
} from 'lucide-react';
import { Avatar } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import styles from './AppShell.module.scss';

const mockupItems = [
  { to: '/mockups', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/mockups/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/mockups/deals', label: 'Deals', icon: KanbanSquare, end: false },
  { to: '/mockups/contacts', label: 'Contacts', icon: Users, end: false },
  { to: '/mockups/members', label: 'Members', icon: UserCog, end: false },
];

const componentOverview = {
  to: '/components',
  label: 'Overview',
  icon: Component,
  end: true,
};

const componentGroups = [
  {
    heading: 'Layout',
    items: [
      { to: '/components/stack', label: 'Stack', icon: Rows3, end: false },
      { to: '/components/cluster', label: 'Cluster', icon: Columns3, end: false },
      { to: '/components/card', label: 'Card', icon: RectangleHorizontal, end: false },
    ],
  },
  {
    heading: 'Forms',
    items: [
      { to: '/components/button', label: 'Button', icon: MousePointer2, end: false },
      { to: '/components/checkbox', label: 'Checkbox', icon: CheckSquare, end: false },
      { to: '/components/datepickers', label: 'Date pickers', icon: CalendarRange, end: false },
      { to: '/components/input', label: 'Input', icon: TextCursorInput, end: false },
      { to: '/components/password-input', label: 'PasswordInput', icon: KeyRound, end: false },
      {
        to: '/components/password-strength-meter',
        label: 'PasswordStrengthMeter',
        icon: ShieldCheck,
        end: false,
      },
      { to: '/components/radio', label: 'Radio', icon: CircleDot, end: false },
      { to: '/components/select', label: 'Select', icon: ChevronsUpDown, end: false },
    ],
  },
  {
    heading: 'Display',
    items: [
      { to: '/components/avatar', label: 'Avatar', icon: CircleUser, end: false },
      { to: '/components/badge', label: 'Badge', icon: Tag, end: false },
      { to: '/components/calendar', label: 'Calendar', icon: CalendarDays, end: false },
      { to: '/components/empty-state', label: 'EmptyState', icon: Inbox, end: false },
      { to: '/components/pagination', label: 'Pagination', icon: ListOrdered, end: false },
      { to: '/components/skeleton', label: 'Skeleton', icon: Square, end: false },
      { to: '/components/table', label: 'Table', icon: TableIcon, end: false },
      { to: '/components/datatable', label: 'DataTable', icon: TableProperties, end: false },
    ],
  },
  {
    heading: 'Navigation',
    items: [{ to: '/components/tabs', label: 'Tabs', icon: PanelTop, end: false }],
  },
  {
    heading: 'Overlays',
    items: [
      { to: '/components/drawer', label: 'Drawer', icon: PanelRight, end: false },
      { to: '/components/dropdown-menu', label: 'DropdownMenu', icon: MoreHorizontal, end: false },
      { to: '/components/modal', label: 'Modal', icon: AppWindow, end: false },
      { to: '/components/tooltip', label: 'Tooltip', icon: MessageSquare, end: false },
      { to: '/components/popover', label: 'Popover', icon: PanelLeft, end: false },
      {
        to: '/components/confirmation-popover',
        label: 'ConfirmationPopover',
        icon: ShieldCheck,
        end: false,
      },
    ],
  },
];

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end: boolean;
}

function renderItem({ to, label, icon: Icon, end }: NavItem) {
  return (
    <NavLink
      key={to}
      to={to}
      end={end}
      className={({ isActive }) =>
        isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem
      }
    >
      <Icon size={16} />
      {label}
    </NavLink>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const inComponents = pathname.startsWith('/components');

  const switchLink = inComponents
    ? { to: '/mockups', label: 'Mockups', icon: Layers }
    : { to: '/components', label: 'Components', icon: Component };

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>OC</div>
          <div className={styles.brandText}>
            <div className={styles.brandName}>Orbit CRM</div>
            <div className={styles.brandPlan}>Free trial</div>
          </div>
        </div>

        <nav className={styles.nav}>
          {inComponents ? (
            <>
              {renderItem(componentOverview)}
              {componentGroups.map(({ heading, items }) => (
                <div key={heading} className={styles.navGroup}>
                  <div className={styles.navSection}>{heading}</div>
                  {items.map(renderItem)}
                </div>
              ))}
            </>
          ) : (
            <>
              <div className={styles.navSection}>Mockups</div>
              {mockupItems.map(renderItem)}
            </>
          )}
        </nav>

        <div className={styles.navFooter}>
          <NavLink to={switchLink.to} className={styles.switchLink}>
            <switchLink.icon size={16} />
            <span>{switchLink.label}</span>
            <ArrowRight size={14} className={styles.switchArrow} aria-hidden />
          </NavLink>
        </div>
      </aside>

      <header className={styles.topbar}>
        <Cluster gap="md" align="center" wrap={false}>
          <div className={styles.searchWrap}>
            <Search size={14} className={styles.searchIcon} aria-hidden />
            <input
              type="search"
              placeholder="Search contacts, deals…"
              className={styles.search}
              aria-label="Search"
              // Tell password managers (1Password, Bitwarden) and browser autofill
              // to leave this alone — it's a free-text search, not a username field.
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
            <kbd className={styles.searchKbd}>⌘K</kbd>
          </div>
        </Cluster>

        <Cluster gap="sm" align="center" wrap={false}>
          <button className={styles.iconBtn} aria-label="Create new">
            <Plus size={16} />
          </button>
          <button className={styles.iconBtn} aria-label="Notifications">
            <Bell size={16} />
            <span className={styles.notifDot} aria-hidden />
          </button>
          <Avatar name="Alex Rivera" size="sm" />
        </Cluster>
      </header>

      <main className={styles.content}>{children}</main>
    </div>
  );
}
