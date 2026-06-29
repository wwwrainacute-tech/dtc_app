import { useState, useCallback, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './app/AuthContext';
import LoginPage from './app/LoginPage';
import AppShell from './app/AppShell';
import ProtectedRoute from './app/ProtectedRoute';
import { CaregiverDashboard } from './features/caregiver/CaregiverDashboard';
// @ts-ignore
import { AdminApp } from './components/admin.jsx';
import { OfficeManagerApp } from './features/office-manager/OfficeManagerApp';

import './styles/shell.css';
import './styles/desktop.css';
import './styles/wizard.css';

/* ===== Toast ===== */
function Toast({ msg, onClear }: { msg: string | null; onClear: () => void }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onClear, 3000);
    return () => clearTimeout(t);
  }, [msg, onClear]);
  if (!msg) return null;
  return <div className="app-toast">{msg}</div>;
}

/* ===== Admin page router ===== */
function AdminRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);

  // Derive page from URL
  const segments = location.pathname.split('/').filter(Boolean);
  const page = segments[1] || 'dashboard';

  const onNav = useCallback((p: string) => {
    navigate(`/admin${p === 'dashboard' ? '' : '/' + p}`);
  }, [navigate]);

  return (
    <>
      <AdminApp page={page} onNav={onNav} onToast={setToast} />
      <Toast msg={toast} onClear={() => setToast(null)} />
    </>
  );
}

/* ===== Caregiver route ===== */
function CaregiverRoute() {
  const location = useLocation();
  const navigate = useNavigate();

  const segments = location.pathname.split('/').filter(Boolean);
  const page = segments[1] || 'today';

  const onNav = useCallback((p: string) => {
    navigate(`/caregiver${p === 'today' ? '' : '/' + p}`);
  }, [navigate]);

  return <CaregiverDashboard page={page} onNav={onNav} />;
}

/* ===== Office Manager page router ===== */
function OfficeManagerRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);

  const segments = location.pathname.split('/').filter(Boolean);
  const page = segments[1] || 'dashboard';

  const onNav = useCallback((p: string) => {
    navigate(`/office-manager${p === 'dashboard' ? '' : '/' + p}`);
  }, [navigate]);

  return (
    <>
      <OfficeManagerApp page={page} onNav={onNav} onToast={setToast} />
      <Toast msg={toast} onClear={() => setToast(null)} />
    </>
  );
}

/* ===== Root redirect based on role ===== */
function RoleRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return null;
  }
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  const paths = { admin: '/admin', caregiver: '/caregiver', officeManager: '/office-manager' };
  return <Navigate to={paths[user.role]} replace />;
}

/* ===== Main app ===== */
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RoleRedirect />} />

          {/* Admin */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppShell><AdminRoute /></AppShell>
            </ProtectedRoute>
          } />
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppShell><AdminRoute /></AppShell>
            </ProtectedRoute>
          } />

          {/* Caregiver */}
          <Route path="/caregiver" element={
            <ProtectedRoute allowedRoles={['caregiver']}>
              <AppShell><CaregiverRoute /></AppShell>
            </ProtectedRoute>
          } />
          <Route path="/caregiver/*" element={
            <ProtectedRoute allowedRoles={['caregiver']}>
              <AppShell><CaregiverRoute /></AppShell>
            </ProtectedRoute>
          } />

          {/* Office Manager */}
          <Route path="/office-manager" element={
            <ProtectedRoute allowedRoles={['officeManager']}>
              <AppShell><OfficeManagerRoute /></AppShell>
            </ProtectedRoute>
          } />
          <Route path="/office-manager/*" element={
            <ProtectedRoute allowedRoles={['officeManager']}>
              <AppShell><OfficeManagerRoute /></AppShell>
            </ProtectedRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={<RoleRedirect />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
