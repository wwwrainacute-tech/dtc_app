import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth, type Role } from "./AuthContext";

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

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

            return (
              <NavLink key={item.to} to={item.to} end={isRootPath} className={({ isActive }) => `shell-nav-item${active || isActive ? " active" : ""}`}>
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
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
        <div className="shell-main-inner">{children}</div>
        <footer className="shell-footer">
          <span>Dare to Care · Forms Platform</span>
          <span>Role-based access · Stored PDFs</span>
        </footer>
      </main>
    </div>
  );
}
