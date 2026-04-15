import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginChoice from './pages/LoginChoice';
import AdminLogin from './pages/AdminLogin';
import StaffLogin from './pages/StaffLogin';
import SuperAdminLogin from './pages/SuperAdminLogin';
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
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="app-shell theme-light min-h-screen">
        <Routes>
          <Route path="/" element={<LoginChoice />} />
          <Route path="/login/superadmin" element={<SuperAdminLogin />} />
          <Route path="/login/admin" element={<AdminLogin />} />
          <Route path="/login/staff" element={<StaffLogin />} />
          <Route path="*" element={<Navigate to="/" />} />
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
  const businessType = user?.businessType || 'E_COMMERCE';
  const isEcommerce = businessType === 'E_COMMERCE';
  const isBooking = businessType === 'BOOKING';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [theme, setTheme] = useState(() => localStorage.getItem('app-theme') || 'light');

  useEffect(() => {
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  return (
    <div className={`app-shell theme-${theme} flex h-screen flex-col`}>
      <TopBar
        onToggleSidebar={() => setSidebarOpen(true)}
        onRefreshGlobal={() => setRefreshKey((prev) => prev + 1)}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
      />
      <div className="flex flex-1 min-h-0 bg-app-page pt-20">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div key={refreshKey} className="flex-1 min-h-0 overflow-y-auto md:ml-64 pb-20 md:pb-0">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            
            {/* Common Routes - Protected */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requiredRole={user.role}>
                  {user.role === 'admin' ? <Dashboard /> : <StaffDashboard />}
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
                <ProtectedRoute requiredRole="admin">
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
                <ProtectedRoute requiredRole="admin">
                  <AdvancedAnalytics />
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

            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default App;
