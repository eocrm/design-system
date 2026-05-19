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
import { InputDemo } from './pages/components/InputDemo';
import { CardDemo } from './pages/components/CardDemo';
import { StackDemo } from './pages/components/StackDemo';
import { ClusterDemo } from './pages/components/ClusterDemo';
import { AvatarDemo } from './pages/components/AvatarDemo';
import { BadgeDemo } from './pages/components/BadgeDemo';
import { TabsDemo } from './pages/components/TabsDemo';

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
          <Route path="/components/input" element={<InputDemo />} />
          <Route path="/components/card" element={<CardDemo />} />
          <Route path="/components/stack" element={<StackDemo />} />
          <Route path="/components/cluster" element={<ClusterDemo />} />
          <Route path="/components/avatar" element={<AvatarDemo />} />
          <Route path="/components/badge" element={<BadgeDemo />} />
          <Route path="/components/tabs" element={<TabsDemo />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
