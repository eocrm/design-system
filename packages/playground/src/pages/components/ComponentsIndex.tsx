import { Link } from 'react-router';
import { Stack } from '@eocrm/design-system';
import { ArrowRight } from 'lucide-react';
import { SCHEMATICS } from './overviewSchematics';
import styles from './ComponentsIndex.module.scss';

// Previews are blueprint-accent schematics (see overviewSchematics.tsx), not
// live component renders — uniform thumbnails with no theme/portal edge cases.
// Spec: docs/superpowers/specs/2026-07-03-overview-schematics-design.md
const items: { to: string; name: string; description: string; preview: React.ReactNode }[] = [
  {
    to: '/components/accordion',
    name: 'Accordion',
    description: 'Stacked collapsible panels. Single-open or multi-open mode.',
    preview: SCHEMATICS['Accordion'],
  },
  {
    to: '/components/alert',
    name: 'Alert',
    description: 'Persistent in-flow notification with four tones.',
    preview: SCHEMATICS['Alert'],
  },
  {
    to: '/components/button',
    name: 'Button',
    description: 'Action triggers with variants and sizes.',
    preview: SCHEMATICS['Button'],
  },
  {
    to: '/components/social-button',
    name: 'SocialButton',
    description: 'Provider sign-in button — brand mark + label.',
    preview: SCHEMATICS['SocialButton'],
  },
  {
    to: '/components/button-group',
    name: 'ButtonGroup',
    description:
      'Joined Buttons (toolbar action group) or single-select segmented control with arrow-key navigation.',
    preview: SCHEMATICS['ButtonGroup'],
  },
  {
    to: '/components/datepickers',
    name: 'Date pickers',
    description:
      'Four variants of the same month grid — DatePicker, DateRangePicker, and inline counterparts.',
    preview: SCHEMATICS['Date pickers'],
  },
  {
    to: '/components/empty-state',
    name: 'EmptyState',
    description:
      'Opinionated "nothing here" container — icon, title, description, actions. Three sizes for inline / card / hero use.',
    preview: SCHEMATICS['EmptyState'],
  },
  {
    to: '/components/error-state',
    name: 'ErrorState',
    description: 'Page-level 404 / error status block — icon, title, actions, error ID.',
    preview: SCHEMATICS['ErrorState'],
  },
  {
    to: '/components/screen',
    name: 'Screen',
    description: 'Full-bleed / centered screen layout for auth, 404, and error pages.',
    preview: SCHEMATICS['Screen'],
  },
  {
    to: '/components/file-upload',
    name: 'FileUpload',
    description:
      'Controlled dropzone-style file picker with built-in validation, drag/click both supported, per-row Progress for uploading status.',
    preview: SCHEMATICS['FileUpload'],
  },
  {
    to: '/components/image-crop',
    name: 'ImageCrop',
    description:
      'Controlled image-crop primitive on <canvas>. Pattern-A drag (centered box, draggable image, slider-controlled zoom). Top-level extractCropBlob utility for the Save handler.',
    preview: SCHEMATICS['ImageCrop'],
  },
  {
    to: '/components/icon-tile',
    name: 'IconTile',
    description: 'Decorative tile framing an icon, tinted by a Palette color.',
    preview: SCHEMATICS['IconTile'],
  },
  {
    to: '/components/image',
    name: 'Image',
    description:
      'Remote image with Skeleton loading state, fade-in on load, and an accessible broken-image placeholder with retry.',
    preview: SCHEMATICS['Image'],
  },
  {
    to: '/components/media-tile',
    name: 'MediaTile',
    description: 'Media tile — image/icon body with hover-revealed name/size + controls bars.',
    preview: SCHEMATICS['MediaTile'],
  },
  {
    to: '/components/input',
    name: 'Input',
    description: 'Single-line text field with focus + invalid states.',
    preview: SCHEMATICS['Input'],
  },
  {
    to: '/components/liquid-editor',
    name: 'LiquidEditor',
    description: 'Liquid template editor with highlighting, autocomplete, and a preview pane.',
    preview: SCHEMATICS['LiquidEditor'],
  },
  {
    to: '/components/kbd',
    name: 'Kbd',
    description:
      'Inline keyboard-shortcut chip: one <kbd> per key joined by a faint + separator. Two sizes (sm matches TopBar, md for command palettes).',
    preview: SCHEMATICS['Kbd'],
  },
  {
    to: '/components/pagination',
    name: 'Pagination',
    description:
      'Numbered nav with windowing, plus a cursor variant for streams without total. Both controlled, no built-in page size.',
    preview: SCHEMATICS['Pagination'],
  },
  {
    to: '/components/palette',
    name: 'Palette',
    description: '30 categorical bg + fg color pairs for consumer-defined domain → color mappings.',
    preview: SCHEMATICS['Palette'],
  },
  {
    to: '/components/person-display',
    name: 'PersonDisplay',
    description:
      'Avatar + name (+ optional description lines). Three sizes drive Avatar + Text scales.',
    preview: SCHEMATICS['PersonDisplay'],
  },
  {
    to: '/components/password-input',
    name: 'PasswordInput',
    description:
      'Password field with eye toggle, opt-in caps-lock + wrong-keyboard-layout warnings.',
    preview: SCHEMATICS['PasswordInput'],
  },
  {
    to: '/components/password-strength-meter',
    name: 'PasswordStrengthMeter',
    description:
      '4-segment strength visualization. Default heuristic for prototypes; pass `score` for production scoring.',
    preview: SCHEMATICS['PasswordStrengthMeter'],
  },
  {
    to: '/components/phone-input',
    name: 'PhoneInput',
    description: 'International phone field — country picker + national number, emitting E.164.',
    preview: SCHEMATICS['PhoneInput'],
  },
  {
    to: '/components/progress',
    name: 'Progress',
    description:
      'Linear progress bar — determinate via value/max, indeterminate when value is omitted. Sizes / tones / optional label.',
    preview: SCHEMATICS['Progress'],
  },
  {
    to: '/components/radio',
    name: 'Radio',
    description:
      'Native-input-backed radio with custom paint, plus a RadioGroup wrapper for fieldset/legend semantics and group state propagation.',
    preview: SCHEMATICS['Radio'],
  },
  {
    to: '/components/select',
    name: 'Select',
    description:
      'Value picker — single, multi (chips and summary), searchable, async, creatable. The generalist.',
    preview: SCHEMATICS['Select'],
  },
  {
    to: '/components/switch',
    name: 'Switch',
    description: 'Binary on/off toggle. Three tones + async loading state.',
    preview: SCHEMATICS['Switch'],
  },
  {
    to: '/components/status-menu',
    name: 'StatusMenu',
    description:
      'Status-transition dropdown — colored pill trigger, each menu row colored to its own status. Composes DropdownMenu; read-only chip when options is omitted.',
    preview: SCHEMATICS['StatusMenu'],
  },
  {
    to: '/components/skeleton',
    name: 'Skeleton',
    description:
      'Placeholder rectangle for loading states. Three variants (text / circular / rectangular), pulse animation respects prefers-reduced-motion.',
    preview: SCHEMATICS['Skeleton'],
  },
  {
    to: '/components/slider',
    name: 'Slider',
    description:
      'Controlled slider: single-thumb or range (two-thumb), horizontal or vertical. Custom-painted with marks + value bubble.',
    preview: SCHEMATICS['Slider'],
  },
  {
    to: '/components/kanban',
    name: 'Kanban',
    description: 'Multi-column board with live cross-column drag.',
    preview: SCHEMATICS['Kanban'],
  },
  {
    to: '/components/flow-canvas',
    name: 'FlowCanvas',
    description: 'Pan/zoom canvas for directed node-edge diagrams.',
    preview: SCHEMATICS['FlowCanvas'],
  },
  {
    to: '/components/dashboard-canvas',
    name: 'DashboardCanvas',
    description:
      '2D snap-grid dashboard — drag-to-move, resize, collapsible sections, band reorder.',
    preview: SCHEMATICS['DashboardCanvas'],
  },
  {
    to: '/components/sortable',
    name: 'Sortable',
    description: 'Drag-to-reorder list with optional keyboard handle.',
    preview: SCHEMATICS['Sortable'],
  },
  {
    to: '/components/sortable-group',
    name: 'SortableGroup',
    description:
      'Drag items between multiple sortable lists (cross-container), with a live handoff.',
    preview: SCHEMATICS['SortableGroup'],
  },
  {
    to: '/components/datatable',
    name: 'DataTable',
    description: 'Tabular data with sortable / resizable / reorderable columns and row selection.',
    preview: SCHEMATICS['DataTable'],
  },
  {
    to: '/components/definition-list',
    name: 'DefinitionList',
    description: 'Semantic key/value pairs with optional icon on the value.',
    preview: SCHEMATICS['DefinitionList'],
  },
  {
    to: '/components/table',
    name: 'Table',
    description:
      'Tabular data primitive — compound subcomponents over native HTML semantics with density, hover, striped, and sortable-header visuals.',
    preview: SCHEMATICS['Table'],
  },
  {
    to: '/components/card',
    name: 'Card',
    description: 'Bordered container that groups related content.',
    preview: SCHEMATICS['Card'],
  },
  {
    to: '/components/checkbox',
    name: 'Checkbox',
    description:
      'Native-input-backed checkbox with custom paint — sizes, indeterminate, label, invalid, full form integration.',
    preview: SCHEMATICS['Checkbox'],
  },
  {
    to: '/components/field',
    name: 'Field',
    description: 'Labeled-control unit — label, help, error, required, a11y wiring.',
    preview: SCHEMATICS['Field'],
  },
  {
    to: '/components/form-row',
    name: 'FormRow',
    description: 'Fields side by side; reflows to stacked when narrow.',
    preview: SCHEMATICS['FormRow'],
  },
  {
    to: '/components/form-section',
    name: 'FormSection',
    description: 'Titled group of fields with heading + description.',
    preview: SCHEMATICS['FormSection'],
  },
  {
    to: '/components/color-picker',
    name: 'ColorPicker',
    description:
      'Controlled HEX color picker with two shapes — popover trigger for form fields and an inline <ColorPicker.Panel> for theme builders. SV square + hue slider + HEX input + optional presets.',
    preview: SCHEMATICS['ColorPicker'],
  },
  {
    to: '/components/stack',
    name: 'Stack',
    description: 'Vertical layout with consistent gap.',
    preview: SCHEMATICS['Stack'],
  },
  {
    to: '/components/cluster',
    name: 'Cluster',
    description: 'Horizontal wrapping layout with gap + alignment.',
    preview: SCHEMATICS['Cluster'],
  },
  {
    to: '/components/app-layout',
    name: 'AppLayout',
    description: 'Viewport-filling app shell — topBar + sidebar + content.',
    preview: SCHEMATICS['AppLayout'],
  },
  {
    to: '/components/constrain',
    name: 'Constrain',
    description: 'Width / flex constraint — cap a width or fill a flex row.',
    preview: SCHEMATICS['Constrain'],
  },
  {
    to: '/components/indent',
    name: 'Indent',
    description:
      'Indent nested content by level × gutter — token-based, RTL-aware. For tree/thread depth.',
    preview: SCHEMATICS['Indent'],
  },
  {
    to: '/components/code',
    name: 'Code',
    description:
      'Inline <code> chip — monospace text with subtle bg. Use for inline identifiers / snippets.',
    preview: SCHEMATICS['Code'],
  },
  {
    to: '/components/divider',
    name: 'Divider',
    description: 'Thin separator. Horizontal/vertical, solid/dashed, optional label.',
    preview: SCHEMATICS['Divider'],
  },
  {
    to: '/components/grid',
    name: 'Grid',
    description:
      '2D layout primitive with token-driven gap, auto-fit responsive columns, and equal-width fixed columns.',
    preview: SCHEMATICS['Grid'],
  },
  {
    to: '/components/split',
    name: 'Split',
    description:
      'Master–detail layout: an intrinsic-width aside beside a filling main pane (CSS grid auto 1fr). For a vertical Tabs rail + detail panel.',
    preview: SCHEMATICS['Split'],
  },
  {
    to: '/components/sticky',
    name: 'Sticky',
    description:
      'Pins its box to the top of the scroll container while the page scrolls — for a record-detail sidebar that stays in view.',
    preview: SCHEMATICS['Sticky'],
  },
  {
    to: '/components/masonry',
    name: 'Masonry',
    description: 'Height-balanced columns for variable-height items.',
    preview: SCHEMATICS['Masonry'],
  },
  {
    to: '/components/avatar',
    name: 'Avatar',
    description: 'Profile circle with image or auto-colored initials.',
    preview: SCHEMATICS['Avatar'],
  },
  {
    to: '/components/badge',
    name: 'Badge',
    description: 'Small status/category pill with semantic tones.',
    preview: SCHEMATICS['Badge'],
  },
  {
    to: '/components/entity-chip',
    name: 'EntityChip',
    description:
      'Inline entity-link chip — icon + muted prefix + name + colored status, safe inside a sentence. Polymorphic: <a>, <span>, <button>, or a custom `as`.',
    preview: SCHEMATICS['EntityChip'],
  },
  {
    to: '/components/dot',
    name: 'Dot',
    description: 'Bare palette/tone colored circle for color-coding affordances.',
    preview: SCHEMATICS['Dot'],
  },
  {
    to: '/components/timeline',
    name: 'Timeline',
    description:
      'Vertical activity feed — connector line through avatar/dot/icon nodes; compact variant.',
    preview: SCHEMATICS['Timeline'],
  },
  {
    to: '/components/thread',
    name: 'Thread',
    description:
      'Nested-reply threading — per-level left rail connecting a comment to its replies; depth-capped.',
    preview: SCHEMATICS['Thread'],
  },
  {
    to: '/components/rich-text',
    name: 'RichText',
    description: 'Read-only renderer for the in-house rich-text model.',
    preview: SCHEMATICS['RichText'],
  },
  {
    to: '/components/rich-text-editor',
    name: 'RichTextEditor',
    description: 'Controlled contentEditable rich-text editor over the in-house engine.',
    preview: SCHEMATICS['RichTextEditor'],
  },
  {
    to: '/components/brand-icon',
    name: 'BrandIcon',
    description: 'Full-color brand marks (Google, Yandex) for SSO buttons.',
    preview: SCHEMATICS['BrandIcon'],
  },
  {
    to: '/components/logo',
    name: 'Logo',
    description: 'The eocrm brand logo — mark + optional wordmark.',
    preview: SCHEMATICS['Logo'],
  },
  {
    to: '/components/breadcrumb',
    name: 'Breadcrumb',
    description: 'Navigation trail with auto-current on the last item.',
    preview: SCHEMATICS['Breadcrumb'],
  },
  {
    to: '/components/link',
    name: 'Link',
    description: 'Polymorphic styled anchor with three visual variants.',
    preview: SCHEMATICS['Link'],
  },
  {
    to: '/components/link-card',
    name: 'LinkCard',
    description: 'A clickable Card — the whole surface navigates or acts.',
    preview: SCHEMATICS['LinkCard'],
  },
  {
    to: '/components/rail',
    name: 'Rail',
    description:
      'Collapsible left-side nav with sections, items, groups, and hover-popover for collapsed groups.',
    preview: SCHEMATICS['Rail'],
  },
  {
    to: '/components/topbar',
    name: 'TopBar',
    description:
      'Sticky application top-bar primitive. Compound API with Start/End clusters, a styled Search input, and an IconButton with optional notification dot.',
    preview: SCHEMATICS['TopBar'],
  },
  {
    to: '/components/tabs',
    name: 'Tabs',
    description: 'Horizontal tab strip with optional count chips.',
    preview: SCHEMATICS['Tabs'],
  },
  {
    to: '/components/text',
    name: 'Text',
    description:
      'Body / inline text primitive with size/tone/weight/align/truncate/lineClamp props.',
    preview: SCHEMATICS['Text'],
  },
  {
    to: '/components/title',
    name: 'Title',
    description: 'Semantic heading primitive — renders h1-h6 from the required `order` prop.',
    preview: SCHEMATICS['Title'],
  },
  {
    to: '/components/dropdown-menu',
    name: 'DropdownMenu',
    description: 'Action menu opened from a trigger button. Compound API.',
    preview: SCHEMATICS['DropdownMenu'],
  },
  {
    to: '/components/textarea',
    name: 'Textarea',
    description: 'Multi-line text with auto-grow + character counter.',
    preview: SCHEMATICS['Textarea'],
  },
  {
    to: '/components/timefield',
    name: 'TimeField',
    description:
      'Standalone time-of-day input — text + popover with hour / minute (+ AM/PM in 12h locales) lists and a Now button. Powers the picker family when granularity="minute".',
    preview: SCHEMATICS['TimeField'],
  },
  {
    to: '/components/toast',
    name: 'Toast',
    description: 'Imperative transient notifications.',
    preview: SCHEMATICS['Toast'],
  },
  {
    to: '/components/tooltip',
    name: 'Tooltip',
    description: 'Small floating label on hover/focus, with a pointer arrow.',
    preview: SCHEMATICS['Tooltip'],
  },
  {
    to: '/components/modal',
    name: 'Modal',
    description: 'Focus-locked dialog with header / body / footer slots and overlay variants.',
    preview: SCHEMATICS['Modal'],
  },
  {
    to: '/components/lightbox',
    name: 'Lightbox',
    description: 'Full-screen image gallery overlay — large image, prev/next, thumbnails, caption.',
    preview: SCHEMATICS['Lightbox'],
  },
  {
    to: '/components/filter-chip',
    name: 'FilterChip',
    description:
      'Dismissible "active filter" pill — Label + tone-dotted Value + auto-rendered × dismiss button.',
    preview: SCHEMATICS['FilterChip'],
  },
  {
    to: '/components/options-picker',
    name: 'OptionsPicker',
    description:
      'Filter-picker UX: popover with search, optional grouping, multi/single select, draft-then-Apply commit.',
    preview: SCHEMATICS['OptionsPicker'],
  },
  {
    to: '/components/emoji-picker',
    name: 'EmojiPicker',
    description:
      'Searchable, categorized emoji grid for reactions and everyday input — lives in a Popover, calls onSelect(emoji).',
    preview: SCHEMATICS['EmojiPicker'],
  },
  {
    to: '/components/page',
    name: 'Page',
    description:
      'Page-root layout primitive. Wraps top-level sections with the canonical CRM rhythm (gap="lg").',
    preview: SCHEMATICS['Page'],
  },
  {
    to: '/components/page-header',
    name: 'PageHeader',
    description:
      'Compound layout primitive for top-of-page headers. Breadcrumb + BackButton + Aside (Avatar) + Title + Subtitle + Meta + Actions.',
    preview: SCHEMATICS['PageHeader'],
  },
  {
    to: '/components/drawer',
    name: 'Drawer',
    description: 'Edge-anchored slide-in panel with drag-to-close on mobile.',
    preview: SCHEMATICS['Drawer'],
  },
  {
    to: '/components/popover',
    name: 'Popover',
    description: 'Non-modal floating panel for arbitrary small surfaces.',
    preview: SCHEMATICS['Popover'],
  },
  {
    to: '/components/calendar',
    name: 'Calendar',
    description:
      'Month view with continuous multi-day event bars, overflow chips, and locale-aware weekday grids.',
    preview: SCHEMATICS['Calendar'],
  },
  {
    to: '/components/circular-progress',
    name: 'CircularProgress',
    description:
      'Circular progress / loading spinner — donut shape for tracked progress, or spinning arc when value is omitted.',
    preview: SCHEMATICS['CircularProgress'],
  },
  {
    to: '/components/confirmation-popover',
    name: 'ConfirmationPopover',
    description: '"Are you sure?" preset on top of Popover, with async-aware Confirm.',
    preview: SCHEMATICS['ConfirmationPopover'],
  },
];

if (import.meta.env.DEV) {
  for (const item of items) {
    if (!item.preview) {
      console.warn(`[ComponentsIndex] no schematic for card "${item.name}"`);
    }
  }
}

export function ComponentsIndex() {
  return (
    <Stack gap="lg">
      <header>
        <span className={styles.eyebrow}>Components</span>
        <h1 className={styles.title}>Component library</h1>
        <p className={styles.description}>
          Every component shipped with this design system. Each page shows the live component, the
          source of <code>.tsx</code> and <code>.module.scss</code>, and usage snippets you can
          copy.
        </p>
      </header>

      <div className={styles.grid}>
        {items.map((item) => (
          <Link key={item.to} to={item.to} className={styles.card}>
            <div className={styles.cardPreview}>{item.preview}</div>
            <div className={styles.cardBody}>
              <div className={styles.cardHeader}>
                <span className={styles.cardName}>{item.name}</span>
                <ArrowRight size={14} className={styles.cardArrow} />
              </div>
              <p className={styles.cardDescription}>{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </Stack>
  );
}
