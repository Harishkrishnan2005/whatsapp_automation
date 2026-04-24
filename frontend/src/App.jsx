import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminLogin from './pages/AdminLogin';
import StaffLogin from './pages/StaffLogin';
import SuperAdminLogin from './pages/SuperAdminLogin';
import HomePage from './pages/HomePage';
import ProtectedRoute from './components/ProtectedRoute';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import Campaigns from './pages/Campaigns';
import Analytics from './pages/Analytics';
import Products from './pages/Products';
import Sidebar from './components/Sidebar';

// Admin pages
import StaffManagement from './pages/admin/StaffManagement';
import ChatbotManagement from './pages/admin/ChatbotManagement';
import ChatManagement from './pages/admin/ChatManagement';
import AppointmentManagement from './pages/admin/AppointmentManagement';
import AdvancedAnalytics from './pages/admin/AdvancedAnalytics';
import Pricing from './pages/admin/Pricing';
import SimulationChat from './pages/admin/SimulationChat';
import SupportTickets from './pages/admin/SupportTickets';
import Settings from './pages/admin/Settings';
import StaffChat from './pages/staff/StaffChat';
import StaffBookings from './pages/staff/StaffBookings';
import StaffDashboard from './pages/staff/StaffDashboard';
import StaffOrders from './pages/staff/StaffOrders';
import StaffNotes from './pages/staff/StaffNotes';

// Super Admin pages
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import Businesses from './pages/superadmin/Businesses';
import Subscriptions from './pages/superadmin/Subscriptions';

function App() {
  return (
    <AuthProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50" />
    );
  }

  if (location.pathname === '/') {
    return (
      <div className="app-shell theme-light min-h-screen">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-shell theme-light min-h-screen">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/superadmin/login" element={<SuperAdminLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/staff/login" element={<StaffLogin />} />
          <Route path="/login/superadmin" element={<Navigate to="/superadmin/login" />} />
          <Route path="/login/admin" element={<Navigate to="/admin/login" />} />
          <Route path="/login/staff" element={<Navigate to="/staff/login" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    );
  }

  return (
    <AppShell />
  );
}

function AppShell() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const businessType = user?.businessType || 'E_COMMERCE';
  const isEcommerce = businessType === 'E_COMMERCE';
  const isBooking = businessType === 'BOOKING';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex h-screen w-full bg-[#f1f5f9] overflow-hidden font-inter">
      {/* Sidebar: Fixed left, blue gradient */}
      <Sidebar 
        open={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        isHovered={isHovered}
        setIsHovered={setIsHovered}
      />

      <div className={`flex flex-1 flex-col min-w-0 overflow-hidden transition-all duration-300 ${isHovered ? 'md:pl-72' : 'md:pl-24'}`}>
        {/* Header: White with search */}
        <TopBar 
          onToggleSidebar={() => setSidebarOpen(true)} 
          onRefreshGlobal={() => setRefreshKey((prev) => prev + 1)}
        />

        {/* Dynamic Route Container */}
        <main 
          key={refreshKey}
          className="flex-1 overflow-y-auto p-4 md:p-8"
        >
          <Routes>
            <Route path="/" element={<Navigate to={isSuperAdmin ? '/superadmin/dashboard' : '/dashboard'} />} />
            
            {/* Common Routes - Protected */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requiredRole={user.role}>
                  {isSuperAdmin ? <Navigate to="/superadmin/dashboard" /> : user.role === 'admin' ? <Dashboard /> : <StaffDashboard />}
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute requiredRole={user.role}>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Customers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute requiredRole="admin">
                  {isEcommerce ? <Orders /> : <Navigate to="/dashboard" />}
                </ProtectedRoute>
              }
            />
            <Route
              path="/campaigns"
              element={
                <ProtectedRoute requiredRole="admin" requiredFeature="allowCampaigns">
                  {isEcommerce ? <Campaigns /> : <Navigate to="/dashboard" />}
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute requiredRole="admin">
                  {isEcommerce ? <Products /> : <Navigate to="/dashboard" />}
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Analytics />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes - Protected */}
            <Route
              path="/admin/staff"
              element={
                <ProtectedRoute requiredRole="admin">
                  <StaffManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/chatbot"
              element={
                <ProtectedRoute requiredRole="admin">
                  <ChatbotManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/chat-management"
              element={
                <ProtectedRoute requiredRole="admin">
                  {isEcommerce ? <ChatManagement /> : <Navigate to="/dashboard" />}
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/simulation-chat"
              element={
                <ProtectedRoute requiredRole="admin">
                  <SimulationChat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/appointments"
              element={
                <ProtectedRoute requiredRole="admin">
                  {isBooking ? <AppointmentManagement /> : <Navigate to="/dashboard" />}
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/advanced-analytics"
              element={
                <ProtectedRoute requiredRole="admin" requiredFeature="allowAdvancedAnalytics">
                  <AdvancedAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/support"
              element={
                <ProtectedRoute requiredRole="admin">
                  <SupportTickets />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pricing"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Pricing />
                </ProtectedRoute>
              }
            />

            {/* Staff Routes - Protected */}
            <Route
              path="/staff/chat"
              element={
                <ProtectedRoute requiredRole="staff">
                  <StaffChat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/bookings"
              element={
                <ProtectedRoute requiredRole="staff">
                  {isBooking ? <StaffBookings /> : <Navigate to="/dashboard" />}
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/orders"
              element={
                <ProtectedRoute requiredRole="staff">
                  {isEcommerce ? <StaffOrders /> : <Navigate to="/dashboard" />}
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/notes"
              element={
                <ProtectedRoute requiredRole="staff">
                  <StaffNotes />
                </ProtectedRoute>
              }
            />

            {/* Super Admin Routes - Protected */}
            <Route
              path="/superadmin/dashboard"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/businesses"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <Businesses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/subscriptions"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <Subscriptions />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to={isSuperAdmin ? '/superadmin/dashboard' : '/dashboard'} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
