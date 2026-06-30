import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth, type Role } from "./AuthContext";
// @ts-ignore
import { DTCStore as Store } from "../components/store";

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const navByRole: Record<Role, NavItem[]> = {
  admin: [
    { to: "/admin", label: "Dashboard", icon: "grid" },
    { to: "/admin/templates", label: "Templates", icon: "layers" },
    { to: "/admin/upload", label: "Upload PDF", icon: "upload" },
    { to: "/admin/users", label: "Users", icon: "users" },
    { to: "/admin/clients", label: "Clients", icon: "clients" },
    { to: "/admin/audit", label: "Audit log", icon: "clock" },
  ],
  caregiver: [
    { to: "/caregiver", label: "My Day", icon: "home" },
    { to: "/caregiver/forms", label: "Available Forms", icon: "file" },
    { to: "/caregiver/records", label: "Records", icon: "inbox" },
    { to: "/caregiver/clients", label: "Clients", icon: "users" },
  ],
  officeManager: [
    { to: "/office-manager", label: "Dashboard", icon: "grid" },
    { to: "/office-manager/submissions", label: "Submissions", icon: "inbox" },
    { to: "/office-manager/clients", label: "Clients", icon: "clients" },
    { to: "/office-manager/team", label: "Team", icon: "users" },
    { to: "/office-manager/audit", label: "Audit log", icon: "clock" },
  ],
};

const roleLabels: Record<Role, string> = {
  admin: "Admin",
  caregiver: "Caregiver",
  officeManager: "Office Manager",
};

function NavIcon({ name }: { name: string }) {
  const svgProps = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const icons: Record<string, React.ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </>
    ),
    layers: (
      <>
        <path d="M12 2L2 7l10 5 10-5z" />
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
      </>
    ),
    upload: (
      <>
        <path d="M12 3v12" />
        <path d="M8 7l4-4 4 4" />
        <path d="M4 21h16" />
      </>
    ),
    users: (
      <>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
      </>
    ),
    clients: (
      <>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    home: (
      <>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <path d="M9 22V12h6v10" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6" />
      </>
    ),
    inbox: (
      <>
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
      </>
    ),
    logout: (
      <>
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
        <path d="M16 17l5-5-5-5" />
        <path d="M21 12H9" />
      </>
    ),
    chevDown: <path d="M6 9l6 6 6-6" />,
  };

  return <svg {...svgProps}>{icons[name] || null}</svg>;
}

function useBadgeCounts(role: Role, userId: string) {
  const [counts, setCounts] = useState({ corrections: 0, pendingReview: 0, queued: 0 });
  useEffect(() => {
    const update = () => {
      const subs = Store.getSubmissions();
      const queued = Store.getQueuedSubmissions?.() ?? [];
      if (role === "caregiver") {
        const corrections = subs.filter((s: any) => s.caregiverId === userId && s.status === "needsCorrection").length;
        setCounts({ corrections, pendingReview: 0, queued: queued.length });
      } else {
        const pendingReview = subs.filter((s: any) => s.status === "submitted").length;
        setCounts({ corrections: 0, pendingReview, queued: 0 });
      }
    };
    const unsub = Store.subscribe(update);
    return unsub;
  }, [role, userId]);
  return counts;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => { window.removeEventListener("offline", goOffline); window.removeEventListener("online", goOnline); };
  }, []);

  const badges = useBadgeCounts(user?.role as Role, user?.id ?? "");

  React.useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (!user) {
    return <>{children}</>;
  }

  const items = navByRole[user.role] || [];

  return (
    <div className="shell">
      <header className="shell-mobile-topbar">
        <button className="shell-menu-btn" onClick={() => setSidebarOpen(true)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="shell-brand-mini">
          <img src="/logo.png" alt="Dare to Care" />
          <strong>Dare to Care</strong>
        </div>
      </header>

      {sidebarOpen ? <div className="shell-overlay" onClick={() => setSidebarOpen(false)} /> : null}

      <aside className={`shell-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="shell-brand">
          <img src="/logo.png" alt="Dare to Care" />
          <div>
            <strong>Dare to Care</strong>
            <span>Forms Platform</span>
          </div>
        </div>
        <div className="shell-role-label">{roleLabels[user.role]}</div>
        <nav className="shell-nav">
          {items.map((item) => {
            const isRootPath = item.to.split("/").length <= 2;
            const active = isRootPath
              ? location.pathname === item.to || location.pathname === `${item.to}/`
              : location.pathname.startsWith(item.to);

            // Compute badge count for this specific nav item
            let badge = 0;
            if (user?.role === "caregiver" && item.to.includes("/caregiver") && isRootPath) {
              badge = badges.corrections + badges.queued;
            } else if (item.label === "Records") {
              badge = badges.corrections;
            } else if (item.label === "Submissions") {
              badge = badges.pendingReview;
            }

            return (
              <NavLink key={item.to} to={item.to} end={isRootPath} className={({ isActive }) => `shell-nav-item${active || isActive ? " active" : ""}`}>
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
                {badge > 0 && <span className="nav-badge">{badge > 99 ? "99+" : badge}</span>}
              </NavLink>
            );
          })}
        </nav>
        <div className="shell-sidebar-foot">
          <div className="shell-user" onClick={() => setUserMenuOpen((open) => !open)}>
            <span className="shell-avatar">{user.initials}</span>
            <span className="shell-user-info">
              <strong>{user.name}</strong>
              <span>{user.username}</span>
            </span>
            <NavIcon name="chevDown" />
          </div>
          {userMenuOpen ? (
            <button
              className="shell-logout"
              onClick={async () => {
                await logout();
                navigate("/login", { replace: true });
              }}
            >
              <NavIcon name="logout" />
              Sign out
            </button>
          ) : null}
        </div>
      </aside>

      <main className="shell-main">
        {isOffline && (
          <div className="offline-banner" role="status">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23" /><path d="M16.72 11.06A10.94 10.94 0 0119 12.55" /><path d="M5 12.55a10.94 10.94 0 015.17-2.39" /><path d="M10.71 5.05A16 16 0 0122.56 9" /><path d="M1.42 9a15.91 15.91 0 014.7-2.88" /><path d="M8.53 16.11a6 6 0 016.95 0" /><circle cx="12" cy="20" r="1" />
            </svg>
            You're offline — forms will be queued and submitted when you reconnect
          </div>
        )}
        <div className="shell-main-inner">{children}</div>
        <footer className="shell-footer">
          <span>Dare to Care · Forms Platform</span>
          <span>Role-based access · Stored PDFs</span>
        </footer>
      </main>
    </div>
  );
}
