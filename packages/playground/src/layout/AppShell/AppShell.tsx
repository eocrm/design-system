import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  Building2,
  LayoutDashboard,
  KanbanSquare,
  Users,
  UserCog,
  UserSquare,
  Bell,
  Plus,
  Component,
  MousePointer2,
  CheckSquare,
  CircleDot,
  TextCursorInput,
  FormInput,
  ChevronsUpDown,
  CalendarRange,
  RectangleHorizontal,
  Rows3,
  Columns3,
  Ruler,
  LayoutGrid,
  CircleUser,
  Tag,
  PanelTop,
  PanelsTopLeft,
  Layers,
  List,
  ExternalLink,
  FileText,
  MessageSquare,
  MessageSquareText,
  AppWindow,
  Minus,
  Monitor,
  Sun,
  Moon,
  MoreHorizontal,
  Command,
  KeyRound,
  PanelLeft,
  PanelRight,
  ShieldCheck,
  CalendarDays,
  Clock,
  Inbox,
  Square,
  Table as TableIcon,
  TableProperties,
  ListOrdered,
  LayoutPanelLeft,
  LayoutPanelTop,
  Network,
  Filter,
  ListCollapse,
  ListFilter,
  MoveRight,
  Sidebar,
  ToggleRight,
  GripVertical,
  Heading,
  Type,
  Code as CodeIcon,
  Activity,
  LogIn,
  LoaderCircle,
  UploadCloud,
  SlidersHorizontal,
  Crop,
  Image as ImageIcon,
  Palette,
  GalleryVerticalEnd,
  Settings as SettingsIcon,
  Fingerprint,
  Hexagon,
  TriangleAlert,
  Compass,
  Shapes,
  SquareMousePointer,
  SquarePen,
  Group,
  Columns2,
  type LucideIcon,
} from 'lucide-react';
import { useState, useEffect } from 'react';
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

const mockupItems = [
  { to: '/mockups', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/mockups/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/mockups/deals', label: 'Deals', icon: KanbanSquare, end: false },
  { to: '/mockups/contacts', label: 'Contacts', icon: Users, end: false },
  { to: '/mockups/members', label: 'Members', icon: UserCog, end: false },
  { to: '/mockups/tenants', label: 'Tenants', icon: Building2, end: false },
  { to: '/mockups/audit', label: 'Audit log', icon: Activity, end: false },
  { to: '/mockups/system-settings', label: 'System settings', icon: SettingsIcon, end: false },
  { to: '/mockups/custom-fields', label: 'Custom fields', icon: SquarePen, end: false },
  { to: '/mockups/login', label: 'Login', icon: LogIn, end: false },
  { to: '/mockups/404', label: 'Not found', icon: Compass, end: false },
  { to: '/mockups/error', label: 'Error', icon: TriangleAlert, end: false },
];

const componentOverview = {
  to: '/components',
  label: 'Overview',
  icon: Component,
  end: true,
};

const tokensReference = {
  to: '/components/tokens',
  label: 'Design tokens',
  icon: Palette,
  end: false,
};

const architectureReference = {
  to: '/components/architecture',
  label: 'Architecture',
  icon: Network,
  end: false,
};

const componentGroups = [
  {
    heading: 'Layout',
    items: [
      { to: '/components/app-layout', label: 'AppLayout', icon: PanelsTopLeft, end: false },
      { to: '/components/stack', label: 'Stack', icon: Rows3, end: false },
      { to: '/components/cluster', label: 'Cluster', icon: Columns3, end: false },
      { to: '/components/constrain', label: 'Constrain', icon: Ruler, end: false },
      { to: '/components/divider', label: 'Divider', icon: Minus, end: false },
      { to: '/components/grid', label: 'Grid', icon: LayoutGrid, end: false },
      { to: '/components/masonry', label: 'Masonry', icon: GalleryVerticalEnd, end: false },
      { to: '/components/card', label: 'Card', icon: RectangleHorizontal, end: false },
      { to: '/components/page-header', label: 'PageHeader', icon: LayoutPanelTop, end: false },
      { to: '/components/page', label: 'Page', icon: FileText, end: false },
      { to: '/components/screen', label: 'Screen', icon: AppWindow, end: false },
    ],
  },
  {
    heading: 'Forms',
    items: [
      { to: '/components/button', label: 'Button', icon: MousePointer2, end: false },
      { to: '/components/button-group', label: 'ButtonGroup', icon: LayoutPanelLeft, end: false },
      { to: '/components/social-button', label: 'SocialButton', icon: LogIn, end: false },
      { to: '/components/checkbox', label: 'Checkbox', icon: CheckSquare, end: false },
      { to: '/components/field', label: 'Field', icon: FormInput, end: false },
      { to: '/components/form-row', label: 'FormRow', icon: Columns2, end: false },
      { to: '/components/form-section', label: 'FormSection', icon: Group, end: false },
      { to: '/components/color-picker', label: 'ColorPicker', icon: Palette, end: false },
      { to: '/components/datepickers', label: 'Date pickers', icon: CalendarRange, end: false },
      { to: '/components/file-upload', label: 'FileUpload', icon: UploadCloud, end: false },
      { to: '/components/image-crop', label: 'ImageCrop', icon: Crop, end: false },
      { to: '/components/input', label: 'Input', icon: TextCursorInput, end: false },
      { to: '/components/password-input', label: 'PasswordInput', icon: KeyRound, end: false },
      {
        to: '/components/password-strength-meter',
        label: 'PasswordStrengthMeter',
        icon: ShieldCheck,
        end: false,
      },
      { to: '/components/options-picker', label: 'OptionsPicker', icon: ListFilter, end: false },
      { to: '/components/radio', label: 'Radio', icon: CircleDot, end: false },
      { to: '/components/select', label: 'Select', icon: ChevronsUpDown, end: false },
      { to: '/components/slider', label: 'Slider', icon: SlidersHorizontal, end: false },
      { to: '/components/kanban', label: 'Kanban', icon: KanbanSquare, end: false },
      { to: '/components/sortable', label: 'Sortable', icon: GripVertical, end: false },
      { to: '/components/switch', label: 'Switch', icon: ToggleRight, end: false },
      { to: '/components/textarea', label: 'Textarea', icon: MessageSquareText, end: false },
      { to: '/components/timefield', label: 'TimeField', icon: Clock, end: false },
    ],
  },
  {
    heading: 'Display',
    items: [
      { to: '/components/avatar', label: 'Avatar', icon: CircleUser, end: false },
      { to: '/components/badge', label: 'Badge', icon: Tag, end: false },
      { to: '/components/brand-icon', label: 'BrandIcon', icon: Fingerprint, end: false },
      { to: '/components/logo', label: 'Logo', icon: Hexagon, end: false },
      { to: '/components/calendar', label: 'Calendar', icon: CalendarDays, end: false },
      {
        to: '/components/circular-progress',
        label: 'CircularProgress',
        icon: LoaderCircle,
        end: false,
      },
      { to: '/components/code', label: 'Code', icon: CodeIcon, end: false },
      { to: '/components/definition-list', label: 'DefinitionList', icon: List, end: false },
      { to: '/components/empty-state', label: 'EmptyState', icon: Inbox, end: false },
      { to: '/components/error-state', label: 'ErrorState', icon: TriangleAlert, end: false },
      { to: '/components/filter-chip', label: 'FilterChip', icon: Filter, end: false },
      { to: '/components/icon-tile', label: 'IconTile', icon: Shapes, end: false },
      { to: '/components/image', label: 'Image', icon: ImageIcon, end: false },
      { to: '/components/kbd', label: 'Kbd', icon: Command, end: false },
      { to: '/components/pagination', label: 'Pagination', icon: ListOrdered, end: false },
      { to: '/components/palette', label: 'Palette', icon: Palette, end: false },
      { to: '/components/person-display', label: 'PersonDisplay', icon: UserSquare, end: false },
      { to: '/components/progress', label: 'Progress', icon: Activity, end: false },
      { to: '/components/skeleton', label: 'Skeleton', icon: Square, end: false },
      { to: '/components/table', label: 'Table', icon: TableIcon, end: false },
      { to: '/components/datatable', label: 'DataTable', icon: TableProperties, end: false },
      { to: '/components/text', label: 'Text', icon: Type, end: false },
      { to: '/components/title', label: 'Title', icon: Heading, end: false },
    ],
  },
  {
    heading: 'Feedback',
    items: [
      { to: '/components/alert', label: 'Alert', icon: AlertCircle, end: false },
      { to: '/components/toast', label: 'Toast', icon: Bell, end: false },
    ],
  },
  {
    heading: 'Navigation',
    items: [
      { to: '/components/accordion', label: 'Accordion', icon: ListCollapse, end: false },
      { to: '/components/breadcrumb', label: 'Breadcrumb', icon: MoveRight, end: false },
      { to: '/components/link', label: 'Link', icon: ExternalLink, end: false },
      { to: '/components/link-card', label: 'LinkCard', icon: SquareMousePointer, end: false },
      { to: '/components/rail', label: 'Rail', icon: Sidebar, end: false },
      { to: '/components/tabs', label: 'Tabs', icon: PanelTop, end: false },
      { to: '/components/topbar', label: 'TopBar', icon: LayoutPanelTop, end: false },
    ],
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
            <TopBar.Search placeholder="Search contacts, deals…" hotkey={['⌘', 'K']} />
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
