import { createContext, startTransition, useContext, useEffect, useState, type ReactNode } from "react";
// @ts-ignore
import { clearStoredSession, emitAuthChanged, getStoredSession, setStoredSession } from "./auth-storage.js";

export type Role = "admin" | "caregiver" | "officeManager" | "newHire" | "client";

export interface AppUser {
  id: string;
  name: string;
  initials: string;
  role: Role;
  username: string;
  status: string;
  mustChangePassword?: boolean;
  createdAt?: string;
  lastLoginAt?: string | null;
  /** When admin is previewing another role, this is the true role */
  previewRole?: Role | null;
}

interface AuthContextValue {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<AppUser>;
  logout: () => Promise<void>;
  /** Admin-only: enter preview mode as another role */
  enterPreview: (role: Role) => void;
  exitPreview: () => void;
  /** The effective role (may differ from user.role when previewing) */
  effectiveRole: Role | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function apiRequest(path: string, init?: RequestInit) {
  const res = await fetch(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const storedSession = getStoredSession();
  const [user, setUser] = useState<AppUser | null>(storedSession?.user || null);
  const [isLoading, setIsLoading] = useState(Boolean(storedSession?.token));
  const [previewRole, setPreviewRole] = useState<Role | null>(null);

  useEffect(() => {
    const session = getStoredSession();
    if (!session?.token) { setIsLoading(false); return; }
    let cancelled = false;
    apiRequest("/api/auth/me", { headers: { Authorization: `Bearer ${session.token}` } })
      .then((data) => {
        if (cancelled) return;
        const nextSession = { token: session.token, user: data.user };
        setStoredSession(nextSession);
        startTransition(() => setUser(data.user));
      })
      .catch(() => { clearStoredSession(); if (!cancelled) setUser(null); })
      .finally(() => { if (!cancelled) { setIsLoading(false); emitAuthChanged(); } });
    return () => { cancelled = true; };
  }, []);

  const login = async (username: string, password: string) => {
    const data = await apiRequest("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const nextSession = { token: data.token, user: data.user };
    setStoredSession(nextSession);
    emitAuthChanged();
    startTransition(() => setUser(data.user));
    return data.user;
  };

  const logout = async () => {
    const session = getStoredSession();
    try {
      if (session?.token) {
        await apiRequest("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.token}` },
        });
      }
    } catch { /* local cleanup still matters */ }
    clearStoredSession();
    emitAuthChanged();
    setPreviewRole(null);
    setUser(null);
  };

  const enterPreview = (role: Role) => {
    if (user?.role === "admin") setPreviewRole(role);
  };

  const exitPreview = () => setPreviewRole(null);

  const effectiveRole = previewRole ?? user?.role ?? null;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: Boolean(user), isLoading, login, logout, enterPreview, exitPreview, effectiveRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
