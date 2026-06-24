import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import { MockupsIndex } from './pages/mockups/MockupsIndex';
import { Audit } from './pages/mockups/Audit/Audit';
import { Dashboard } from './pages/mockups/Dashboard/Dashboard';
import { Deals } from './pages/mockups/Deals/Deals';
import { Contacts } from './pages/mockups/Contacts/Contacts';
import { ContactDetail } from './pages/mockups/ContactDetail/ContactDetail';
import { Members } from './pages/mockups/Members/Members';
import { MemberProfile } from './pages/mockups/MemberProfile/MemberProfile';
import { Tenants } from './pages/mockups/Tenants/Tenants';
import { TenantDetail } from './pages/mockups/Tenants/TenantDetail';
import { Settings } from './pages/mockups/Settings/Settings';
import { CustomFields } from './pages/mockups/CustomFields/CustomFields';
import { Roles } from './pages/mockups/Roles/Roles';
import { Login } from './pages/mockups/Login/Login';
import { NotFound } from './pages/mockups/NotFound/NotFound';
import { NotFoundStandalone } from './pages/mockups/NotFound/NotFoundStandalone';
import { AppError } from './pages/mockups/AppError/AppError';
import { AppErrorStandalone } from './pages/mockups/AppError/AppErrorStandalone';
import { ComponentsIndex } from './pages/components/ComponentsIndex';
import { TokensPage } from './pages/Tokens/TokensPage';
import { ArchitecturePage } from './pages/Architecture/ArchitecturePage';
import { AccordionDemo } from './pages/components/AccordionDemo';
import { AlertDemo } from './pages/components/AlertDemo';
import { BreadcrumbDemo } from './pages/components/BreadcrumbDemo';
import { ButtonDemo } from './pages/components/ButtonDemo';
import { SocialButtonDemo } from './pages/components/SocialButtonDemo';
import { ButtonGroupDemo } from './pages/components/ButtonGroupDemo';
import { DatePickersDemo } from './pages/components/DatePickersDemo';
import { InputDemo } from './pages/components/InputDemo';
import { LiquidEditorDemo } from './pages/components/LiquidEditorDemo';
import { KanbanDemo } from './pages/components/KanbanDemo';
import { KbdDemo } from './pages/components/KbdDemo';
import { PasswordInputDemo } from './pages/components/PasswordInputDemo';
import { PasswordStrengthMeterDemo } from './pages/components/PasswordStrengthMeterDemo';
import { PhoneInputDemo } from './pages/components/PhoneInputDemo';
import { PaginationDemo } from './pages/components/PaginationDemo';
import { ProgressDemo } from './pages/components/ProgressDemo';
import { CircularProgressDemo } from './pages/components/CircularProgressDemo';
import { SelectDemo } from './pages/components/SelectDemo';
import { SkeletonDemo } from './pages/components/SkeletonDemo';
import { SliderDemo } from './pages/components/SliderDemo';
import { SortableDemo } from './pages/components/SortableDemo';
import { SortableGroupDemo } from './pages/components/SortableGroupDemo';
import { SwitchDemo } from './pages/components/SwitchDemo';
import { TableDemo } from './pages/components/TableDemo';
import { TextareaDemo } from './pages/components/TextareaDemo';
import { TimeFieldDemo } from './pages/components/TimeFieldDemo';
import { CardDemo } from './pages/components/CardDemo';
import { CodeDemo } from './pages/components/CodeDemo';
import { TextDemo } from './pages/components/TextDemo';
import { RichTextDemo } from './pages/components/RichTextDemo';
import { RichTextEditorDemo } from './pages/components/RichTextEditorDemo';
import { TitleDemo } from './pages/components/TitleDemo';
import { CheckboxDemo } from './pages/components/CheckboxDemo';
import { FieldDemo } from './pages/components/FieldDemo';
import { FormRowDemo } from './pages/components/FormRowDemo';
import { FormSectionDemo } from './pages/components/FormSectionDemo';
import { ColorPickerDemo } from './pages/components/ColorPickerDemo';
import { StackDemo } from './pages/components/StackDemo';
import { ClusterDemo } from './pages/components/ClusterDemo';
import { AvatarDemo } from './pages/components/AvatarDemo';
import { BadgeDemo } from './pages/components/BadgeDemo';
import { DotDemo } from './pages/components/DotDemo';
import { BrandIconDemo } from './pages/components/BrandIconDemo';
import { LogoDemo } from './pages/components/LogoDemo';
import { TabsDemo } from './pages/components/TabsDemo';
import { DropdownMenuDemo } from './pages/components/DropdownMenuDemo';
import { TooltipDemo } from './pages/components/TooltipDemo';
import { ModalDemo } from './pages/components/ModalDemo';
import { LightboxDemo } from './pages/components/LightboxDemo';
import { OptionsPickerDemo } from './pages/components/OptionsPickerDemo';
import { PageDemo } from './pages/components/PageDemo';
import { PaletteDemo } from './pages/components/PaletteDemo';
import { PageHeaderDemo } from './pages/components/PageHeaderDemo';
import { PopoverDemo } from './pages/components/PopoverDemo';
import { RadioDemo } from './pages/components/RadioDemo';
import { CalendarDemo } from './pages/components/CalendarDemo';
import { ConfirmationPopoverDemo } from './pages/components/ConfirmationPopoverDemo';
import { AppLayoutDemo } from './pages/components/AppLayoutDemo';
import { ConstrainDemo } from './pages/components/ConstrainDemo';
import { IndentDemo } from './pages/components/IndentDemo';
import { DataTableDemo } from './pages/components/DataTableDemo';
import { DefinitionListDemo } from './pages/components/DefinitionListDemo';
import { EmptyStateDemo } from './pages/components/EmptyStateDemo';
import { ErrorStateDemo } from './pages/components/ErrorStateDemo';
import { ScreenDemo } from './pages/components/ScreenDemo';
import { FileUploadDemo } from './pages/components/FileUploadDemo';
import { FilterChipDemo } from './pages/components/FilterChipDemo';
import { PersonDisplayDemo } from './pages/components/PersonDisplayDemo';
import { IconTileDemo } from './pages/components/IconTileDemo';
import { ImageDemo } from './pages/components/ImageDemo';
import { ImageCropDemo } from './pages/components/ImageCropDemo';
import { DividerDemo } from './pages/components/DividerDemo';
import { DrawerDemo } from './pages/components/DrawerDemo';
import { GridDemo } from './pages/components/GridDemo';
import { SplitDemo } from './pages/components/SplitDemo';
import { StickyDemo } from './pages/components/StickyDemo';
import { MasonryDemo } from './pages/components/MasonryDemo';
import { LinkDemo } from './pages/components/LinkDemo';
import { LinkCardDemo } from './pages/components/LinkCardDemo';
import { RailDemo } from './pages/components/RailDemo';
import { ToastDemo } from './pages/components/ToastDemo';
import { TopBarDemo } from './pages/components/TopBarDemo';
import { AppProvider } from '@eocrm/design-system';

export default function App() {
  return (
    <AppProvider locale="en" intlLocale="en-US" toast={{ position: 'bottom-right' }}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AppShell>
          <Routes>
            <Route path="/" element={<Navigate to="/mockups" replace />} />

            <Route path="/mockups" element={<MockupsIndex />} />
            <Route path="/mockups/dashboard" element={<Dashboard />} />
            <Route path="/mockups/deals" element={<Deals />} />
            <Route path="/mockups/contacts" element={<Contacts />} />
            <Route path="/mockups/contacts/:id" element={<ContactDetail />} />
            <Route path="/mockups/members" element={<Members />} />
            <Route path="/mockups/members/:id" element={<MemberProfile />} />
            <Route path="/mockups/tenants" element={<Tenants />} />
            <Route path="/mockups/tenants/:slug" element={<TenantDetail />} />
            <Route path="/mockups/system-settings" element={<Settings />} />
            <Route path="/mockups/custom-fields" element={<CustomFields />} />
            <Route path="/mockups/roles" element={<Roles />} />
            <Route path="/mockups/audit" element={<Audit />} />
            <Route path="/mockups/login" element={<Login />} />
            <Route path="/mockups/404" element={<NotFound />} />
            <Route path="/mockups/404-standalone" element={<NotFoundStandalone />} />
            <Route path="/mockups/error" element={<AppError />} />
            <Route path="/mockups/error-standalone" element={<AppErrorStandalone />} />

            <Route path="/components" element={<ComponentsIndex />} />
            <Route path="/components/tokens" element={<TokensPage />} />
            <Route path="/components/architecture" element={<ArchitecturePage />} />
            <Route path="/components/accordion" element={<AccordionDemo />} />
            <Route path="/components/alert" element={<AlertDemo />} />
            <Route path="/components/breadcrumb" element={<BreadcrumbDemo />} />
            <Route path="/components/button" element={<ButtonDemo />} />
            <Route path="/components/social-button" element={<SocialButtonDemo />} />
            <Route path="/components/button-group" element={<ButtonGroupDemo />} />
            <Route path="/components/datepickers" element={<DatePickersDemo />} />
            <Route path="/components/input" element={<InputDemo />} />
            <Route path="/components/liquid-editor" element={<LiquidEditorDemo />} />
            <Route path="/components/kanban" element={<KanbanDemo />} />
            <Route path="/components/kbd" element={<KbdDemo />} />
            <Route path="/components/pagination" element={<PaginationDemo />} />
            <Route path="/components/person-display" element={<PersonDisplayDemo />} />
            <Route path="/components/progress" element={<ProgressDemo />} />
            <Route path="/components/circular-progress" element={<CircularProgressDemo />} />
            <Route path="/components/password-input" element={<PasswordInputDemo />} />
            <Route
              path="/components/password-strength-meter"
              element={<PasswordStrengthMeterDemo />}
            />
            <Route path="/components/phone-input" element={<PhoneInputDemo />} />
            <Route path="/components/select" element={<SelectDemo />} />
            <Route path="/components/skeleton" element={<SkeletonDemo />} />
            <Route path="/components/slider" element={<SliderDemo />} />
            <Route path="/components/sortable" element={<SortableDemo />} />
            <Route path="/components/sortable-group" element={<SortableGroupDemo />} />
            <Route path="/components/switch" element={<SwitchDemo />} />
            <Route path="/components/table" element={<TableDemo />} />
            <Route path="/components/card" element={<CardDemo />} />
            <Route path="/components/code" element={<CodeDemo />} />
            <Route path="/components/text" element={<TextDemo />} />
            <Route path="/components/rich-text" element={<RichTextDemo />} />
            <Route path="/components/rich-text-editor" element={<RichTextEditorDemo />} />
            <Route path="/components/title" element={<TitleDemo />} />
            <Route path="/components/checkbox" element={<CheckboxDemo />} />
            <Route path="/components/field" element={<FieldDemo />} />
            <Route path="/components/form-row" element={<FormRowDemo />} />
            <Route path="/components/form-section" element={<FormSectionDemo />} />
            <Route path="/components/color-picker" element={<ColorPickerDemo />} />
            <Route path="/components/stack" element={<StackDemo />} />
            <Route path="/components/cluster" element={<ClusterDemo />} />
            <Route path="/components/avatar" element={<AvatarDemo />} />
            <Route path="/components/badge" element={<BadgeDemo />} />
            <Route path="/components/dot" element={<DotDemo />} />
            <Route path="/components/brand-icon" element={<BrandIconDemo />} />
            <Route path="/components/logo" element={<LogoDemo />} />
            <Route path="/components/tabs" element={<TabsDemo />} />
            <Route path="/components/dropdown-menu" element={<DropdownMenuDemo />} />
            <Route path="/components/tooltip" element={<TooltipDemo />} />
            <Route path="/components/modal" element={<ModalDemo />} />
            <Route path="/components/lightbox" element={<LightboxDemo />} />
            <Route path="/components/options-picker" element={<OptionsPickerDemo />} />
            <Route path="/components/page" element={<PageDemo />} />
            <Route path="/components/palette" element={<PaletteDemo />} />
            <Route path="/components/page-header" element={<PageHeaderDemo />} />
            <Route path="/components/popover" element={<PopoverDemo />} />
            <Route path="/components/radio" element={<RadioDemo />} />
            <Route path="/components/calendar" element={<CalendarDemo />} />
            <Route path="/components/confirmation-popover" element={<ConfirmationPopoverDemo />} />
            <Route path="/components/app-layout" element={<AppLayoutDemo />} />
            <Route path="/components/constrain" element={<ConstrainDemo />} />
            <Route path="/components/indent" element={<IndentDemo />} />
            <Route path="/components/datatable" element={<DataTableDemo />} />
            <Route path="/components/definition-list" element={<DefinitionListDemo />} />
            <Route path="/components/empty-state" element={<EmptyStateDemo />} />
            <Route path="/components/error-state" element={<ErrorStateDemo />} />
            <Route path="/components/screen" element={<ScreenDemo />} />
            <Route path="/components/file-upload" element={<FileUploadDemo />} />
            <Route path="/components/filter-chip" element={<FilterChipDemo />} />
            <Route path="/components/icon-tile" element={<IconTileDemo />} />
            <Route path="/components/image" element={<ImageDemo />} />
            <Route path="/components/image-crop" element={<ImageCropDemo />} />
            <Route path="/components/divider" element={<DividerDemo />} />
            <Route path="/components/drawer" element={<DrawerDemo />} />
            <Route path="/components/grid" element={<GridDemo />} />
            <Route path="/components/split" element={<SplitDemo />} />
            <Route path="/components/sticky" element={<StickyDemo />} />
            <Route path="/components/masonry" element={<MasonryDemo />} />
            <Route path="/components/link" element={<LinkDemo />} />
            <Route path="/components/link-card" element={<LinkCardDemo />} />
            <Route path="/components/rail" element={<RailDemo />} />
            <Route path="/components/topbar" element={<TopBarDemo />} />
            <Route path="/components/textarea" element={<TextareaDemo />} />
            <Route path="/components/timefield" element={<TimeFieldDemo />} />
            <Route path="/components/toast" element={<ToastDemo />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </AppProvider>
  );
}
