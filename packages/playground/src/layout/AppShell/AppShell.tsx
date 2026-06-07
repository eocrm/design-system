import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Bell, Plus, Component, Layers, Monitor, Sun, Moon, type LucideIcon } from 'lucide-react';
import {
  type NavItem,
  mockupItems,
  componentOverview,
  tokensReference,
  architectureReference,
  componentGroups,
} from './navItems';
import { useState, useEffect, useRef } from 'react';
import { CommandSearch, type CommandSearchHandle } from './CommandSearch';
import { Avatar, Logo, Rail, TopBar, Tooltip, useRail } from '@eocrm/design-system';
import styles from './AppShell.module.scss';
import eocrmLogo from '../../assets/eocrm-logo.svg';

const SIDEBAR_COLLAPSED_KEY = 'eocrm-playground-sidebar-collapsed';

const THEME_KEY = 'eocrm-playground-theme';

type Theme = 'system' | 'light' | 'dark';

// Cycle order for the footer toggle: System → Light → Dark → System.
const THEME_ORDER: Theme[] = ['system', 'light', 'dark'];

// Icon + label per state. Icon doubles as the collapsed-rail tooltip trigger;
// the label is the accessible name (expanded) and the tooltip text (collapsed).
const THEME_META: Record<Theme, { icon: LucideIcon; label: string }> = {
  system: { icon: Monitor, label: 'Theme: System' },
  light: { icon: Sun, label: 'Theme: Light' },
  dark: { icon: Moon, label: 'Theme: Dark' },
};

// Routes that render OUTSIDE the shell chrome (no Rail / TopBar) so they read
// like real standalone screens — login + the standalone 404 / error variants.
const FULL_BLEED_PATHS = new Set([
  '/mockups/login',
  '/mockups/404-standalone',
  '/mockups/error-standalone',
]);

/** Renders a `Rail.Item` polymorphic as the NavLink so active styling
    (aria-current="page") flows through automatically. */
function renderRailItem({ to, label, icon: Icon, end }: NavItem) {
  return (
    <Rail.Item key={to} as={NavLink} to={to} end={end} icon={<Icon size={16} />}>
      {label}
    </Rail.Item>
  );
}

/** Brand: the eocrm logo + wordmark when expanded, just the mark when
    collapsed. Reads collapsed state from RailContext. */
function BrandMark() {
  const { collapsed } = useRail();
  return (
    <div className={styles.brand} data-collapsed={collapsed || undefined}>
      {collapsed ? (
        <Logo src={eocrmLogo} size="sm" />
      ) : (
        <Logo src={eocrmLogo} size="sm" text="eocrm" subtext="Free trial" />
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  // Persisted collapsed state — survives reload, syncs across tabs.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  // Persisted theme: 'system' (follow OS) | 'light' | 'dark' (forced).
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    const stored = window.localStorage.getItem(THEME_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(THEME_KEY, theme);
    const root = document.documentElement;
    if (theme === 'system') {
      delete root.dataset.theme;
    } else {
      root.dataset.theme = theme;
    }
  }, [theme]);

  const cycleTheme = () =>
    setTheme((prev) => THEME_ORDER[(THEME_ORDER.indexOf(prev) + 1) % THEME_ORDER.length]);
  const ThemeIcon = THEME_META[theme].icon;

  // ⌘K / Ctrl+K focuses the component search (the TopBar hotkey hint, made real).
  const searchRef = useRef<CommandSearchHandle>(null);
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Full-bleed routes render outside the shell chrome (no Rail / TopBar) so they
  // read like real standalone screens, not pages inside the CRM.
  if (FULL_BLEED_PATHS.has(pathname)) {
    return <>{children}</>;
  }

  const inComponents = pathname.startsWith('/components');

  const switchLink = inComponents
    ? { to: '/mockups', label: 'Mockups', icon: Layers }
    : { to: '/components', label: 'Components', icon: Component };

  return (
    <div className={styles.shell} data-rail-collapsed={collapsed || undefined}>
      <div className={styles.sidebarWrap}>
        <Rail
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          aria-label={inComponents ? 'Component navigation' : 'Mockup navigation'}
          className={styles.appRail}
        >
          <Rail.Header>
            <BrandMark />
          </Rail.Header>

          {inComponents ? (
            <>
              <Rail.Section>
                {renderRailItem(componentOverview)}
                {renderRailItem(tokensReference)}
                {renderRailItem(architectureReference)}
              </Rail.Section>
              {componentGroups.map(({ heading, items }) => (
                <Rail.Section key={heading} title={heading}>
                  {items.map(renderRailItem)}
                </Rail.Section>
              ))}
            </>
          ) : (
            <Rail.Section title="Mockups">{mockupItems.map(renderRailItem)}</Rail.Section>
          )}

          {/* Spacer + Footer pinned to the bottom. Footer is position:sticky
              so the mode-switch link (Mockups ↔ Components) and the
              collapse-toggle stay visible even when the section list above
              overflows and the rail scrolls. */}
          <Rail.Spacer />

          <Rail.Footer>
            <Rail.Item as={NavLink} to={switchLink.to} icon={<switchLink.icon size={16} />}>
              {switchLink.label}
            </Rail.Item>
            <Rail.CollapseToggle />
          </Rail.Footer>
        </Rail>
      </div>

      <div className={styles.topbarWrap}>
        <TopBar>
          <TopBar.Start>
            <CommandSearch ref={searchRef} />
          </TopBar.Start>
          <TopBar.End>
            <TopBar.IconButton aria-label="Create new">
              <Plus size={16} />
            </TopBar.IconButton>
            <TopBar.IconButton aria-label="Notifications" indicator>
              <Bell size={16} />
            </TopBar.IconButton>
            <Tooltip content={THEME_META[theme].label} side="bottom">
              <TopBar.IconButton aria-label={THEME_META[theme].label} onClick={cycleTheme}>
                <ThemeIcon size={16} />
              </TopBar.IconButton>
            </Tooltip>
            <Avatar name="Alex Rivera" size="sm" />
          </TopBar.End>
        </TopBar>
      </div>

      <main className={styles.content}>{children}</main>
    </div>
  );
}
