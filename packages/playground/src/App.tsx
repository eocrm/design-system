import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import { MockupsIndex } from './pages/mockups/MockupsIndex';
import { Dashboard } from './pages/mockups/Dashboard/Dashboard';
import { Deals } from './pages/mockups/Deals/Deals';
import { Contacts } from './pages/mockups/Contacts/Contacts';
import { ContactDetail } from './pages/mockups/ContactDetail/ContactDetail';
import { Members } from './pages/mockups/Members/Members';
import { ComponentsIndex } from './pages/components/ComponentsIndex';
import { ButtonDemo } from './pages/components/ButtonDemo';
import { DatePickersDemo } from './pages/components/DatePickersDemo';
import { InputDemo } from './pages/components/InputDemo';
import { PasswordInputDemo } from './pages/components/PasswordInputDemo';
import { PasswordStrengthMeterDemo } from './pages/components/PasswordStrengthMeterDemo';
import { SelectDemo } from './pages/components/SelectDemo';
import { SkeletonDemo } from './pages/components/SkeletonDemo';
import { TableDemo } from './pages/components/TableDemo';
import { CardDemo } from './pages/components/CardDemo';
import { CheckboxDemo } from './pages/components/CheckboxDemo';
import { StackDemo } from './pages/components/StackDemo';
import { ClusterDemo } from './pages/components/ClusterDemo';
import { AvatarDemo } from './pages/components/AvatarDemo';
import { BadgeDemo } from './pages/components/BadgeDemo';
import { TabsDemo } from './pages/components/TabsDemo';
import { DropdownMenuDemo } from './pages/components/DropdownMenuDemo';
import { TooltipDemo } from './pages/components/TooltipDemo';
import { PopoverDemo } from './pages/components/PopoverDemo';
import { RadioDemo } from './pages/components/RadioDemo';
import { CalendarDemo } from './pages/components/CalendarDemo';
import { ConfirmationPopoverDemo } from './pages/components/ConfirmationPopoverDemo';
import { EmptyStateDemo } from './pages/components/EmptyStateDemo';

export default function App() {
  return (
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

          <Route path="/components" element={<ComponentsIndex />} />
          <Route path="/components/button" element={<ButtonDemo />} />
          <Route path="/components/datepickers" element={<DatePickersDemo />} />
          <Route path="/components/input" element={<InputDemo />} />
          <Route path="/components/password-input" element={<PasswordInputDemo />} />
          <Route
            path="/components/password-strength-meter"
            element={<PasswordStrengthMeterDemo />}
          />
          <Route path="/components/select" element={<SelectDemo />} />
          <Route path="/components/skeleton" element={<SkeletonDemo />} />
          <Route path="/components/table" element={<TableDemo />} />
          <Route path="/components/card" element={<CardDemo />} />
          <Route path="/components/checkbox" element={<CheckboxDemo />} />
          <Route path="/components/stack" element={<StackDemo />} />
          <Route path="/components/cluster" element={<ClusterDemo />} />
          <Route path="/components/avatar" element={<AvatarDemo />} />
          <Route path="/components/badge" element={<BadgeDemo />} />
          <Route path="/components/tabs" element={<TabsDemo />} />
          <Route path="/components/dropdown-menu" element={<DropdownMenuDemo />} />
          <Route path="/components/tooltip" element={<TooltipDemo />} />
          <Route path="/components/popover" element={<PopoverDemo />} />
          <Route path="/components/radio" element={<RadioDemo />} />
          <Route path="/components/calendar" element={<CalendarDemo />} />
          <Route path="/components/confirmation-popover" element={<ConfirmationPopoverDemo />} />
          <Route path="/components/empty-state" element={<EmptyStateDemo />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
