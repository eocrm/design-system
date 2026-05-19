import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
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
          <Route path="/" element={<Dashboard />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/contacts/:id" element={<ContactDetail />} />
          <Route path="/members" element={<Members />} />
          <Route path="/demo" element={<ComponentsIndex />} />
          <Route path="/demo/button" element={<ButtonDemo />} />
          <Route path="/demo/input" element={<InputDemo />} />
          <Route path="/demo/card" element={<CardDemo />} />
          <Route path="/demo/stack" element={<StackDemo />} />
          <Route path="/demo/cluster" element={<ClusterDemo />} />
          <Route path="/demo/avatar" element={<AvatarDemo />} />
          <Route path="/demo/badge" element={<BadgeDemo />} />
          <Route path="/demo/tabs" element={<TabsDemo />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
