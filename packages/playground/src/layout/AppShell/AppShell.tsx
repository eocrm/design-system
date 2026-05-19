import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  UserCog,
  Settings,
  Search,
  Bell,
  Plus,
  Component,
  MousePointer2,
  TextCursorInput,
  RectangleHorizontal,
  Rows3,
  Columns3,
  CircleUser,
  Tag,
  PanelTop,
} from 'lucide-react';
import { Avatar } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import styles from './AppShell.module.scss';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/deals', label: 'Deals', icon: KanbanSquare, end: false },
  { to: '/contacts', label: 'Contacts', icon: Users, end: false },
];

const settingsItems = [{ to: '/members', label: 'Members', icon: UserCog, end: false }];

const demoItems = [
  { to: '/demo', label: 'Overview', icon: Component, end: true },
  { to: '/demo/button', label: 'Button', icon: MousePointer2, end: false },
  { to: '/demo/input', label: 'Input', icon: TextCursorInput, end: false },
  { to: '/demo/card', label: 'Card', icon: RectangleHorizontal, end: false },
  { to: '/demo/stack', label: 'Stack', icon: Rows3, end: false },
  { to: '/demo/cluster', label: 'Cluster', icon: Columns3, end: false },
  { to: '/demo/avatar', label: 'Avatar', icon: CircleUser, end: false },
  { to: '/demo/badge', label: 'Badge', icon: Tag, end: false },
  { to: '/demo/tabs', label: 'Tabs', icon: PanelTop, end: false },
];

export function AppShell({ children }: { children: ReactNode }) {
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
          <div className={styles.navSection}>Workspace</div>
          {navItems.map(({ to, label, icon: Icon, end }) => (
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
          ))}

          <div className={styles.navSection}>Demo</div>
          {demoItems.map(({ to, label, icon: Icon, end }) => (
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
          ))}

          <div className={styles.navSection}>Settings</div>
          {settingsItems.map(({ to, label, icon: Icon, end }) => (
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
          ))}
          <a className={styles.navItem} href="#" onClick={(e) => e.preventDefault()}>
            <Settings size={16} />
            Preferences
          </a>
        </nav>
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
