import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Deals } from './pages/Deals/Deals';
import { Contacts } from './pages/Contacts/Contacts';
import { ContactDetail } from './pages/ContactDetail/ContactDetail';
import { Members } from './pages/Members/Members';
import { DemoIndex } from './pages/demo/DemoIndex';
import { ButtonDemo } from './pages/demo/ButtonDemo';
import { InputDemo } from './pages/demo/InputDemo';
import { CardDemo } from './pages/demo/CardDemo';
import { StackDemo } from './pages/demo/StackDemo';
import { ClusterDemo } from './pages/demo/ClusterDemo';
import { AvatarDemo } from './pages/demo/AvatarDemo';
import { BadgeDemo } from './pages/demo/BadgeDemo';
import { TabsDemo } from './pages/demo/TabsDemo';

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
          <Route path="/demo" element={<DemoIndex />} />
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
