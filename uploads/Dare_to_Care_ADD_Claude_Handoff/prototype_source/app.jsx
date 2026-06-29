// App shell with auth, role switching, runtime app state, and view routing.
//
// Auth: starts at the login screen. Sign-in chooses a role, which determines
// which nav and default view the user lands on.
//
// State: clients/templates/submissions/audit/assigned/drafts all live here.
// Views read & mutate via useApp() — no fake seed data anywhere.

const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } = React;

const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

const ROLE_DEFAULTS = {
  admin: {
    label: "Admin",          initials: "AD",
    nav: [
      { group: "Workspace", items: [
        { id: "admin/dashboard", label: "Dashboard", icon: "dashboard" },
      ]},
      { group: "Forms", items: [
        { id: "admin/templates", label: "Templates", icon: "templates" },
        { id: "admin/upload",    label: "Upload PDF", icon: "upload" },
      ]},
      { group: "People & access", items: [
        { id: "admin/users",   label: "Users",     icon: "users" },
        { id: "admin/clients", label: "Clients",   icon: "client" },
        { id: "admin/audit",   label: "Audit log", icon: "shield" },
      ]},
    ],
    home: "admin/dashboard",
  },
  manager: {
    label: "Office Manager", initials: "OM",
    nav: [
      { group: "Workspace", items: [
        { id: "om/dashboard", label: "Dashboard",   icon: "dashboard" },
        { id: "om/records",   label: "Submissions", icon: "records" },
      ]},
      { group: "Roster", items: [
        { id: "om/clients", label: "Clients",   icon: "client" },
        { id: "om/team",    label: "Team",      icon: "users" },
        { id: "om/audit",   label: "Audit log", icon: "shield" },
      ]},
    ],
    home: "om/dashboard",
  },
  caregiver: {
    label: "Caregiver", initials: "CG",
    nav: [
      { group: "Today", items: [
        { id: "cg/today", label: "My day",         icon: "home" },
        { id: "cg/forms", label: "Available forms",icon: "doc" },
      ]},
      { group: "History", items: [
        { id: "cg/submissions", label: "My submissions", icon: "records" },
        { id: "cg/clients",     label: "My clients",     icon: "client" },
      ]},
    ],
    home: "cg/today",
  },
};

const ROUTES = {
  "admin/dashboard": "AdminDashboard",
  "admin/templates": "TemplatesList",
  "admin/upload":    "UploadPDF",
  "admin/builder":   "FormBuilder",
  "admin/users":     "UsersView",
  "admin/clients":   "ClientsView",
  "admin/audit":     "AuditLog",
  "om/dashboard":    "OMDashboard",
  "om/records":      "Records",
  "om/clients":      "ClientsView",
  "om/team":         "UsersView",
  "om/audit":        "AuditLog",
  "cg/today":        "CaregiverToday",
  "cg/forms":        "CaregiverForms",
  "cg/submissions":  "CaregiverSubmissions",
  "cg/clients":      "CaregiverClients",
  "cg/wizard":       "CaregiverWizard",
};

function App() {
  const [signedIn, setSignedIn] = useState(false);
  const [role, setRole]         = useState(null);
  const [view, setView]         = useState(null);
  const [toasts, setToasts]     = useState([]);

  // Runtime state — starts empty. Every interaction in the prototype is
  // backed by real state mutations, no fake seed data.
  const [templates,     setTemplates]    = useState([]);   // published templates
  const [draftTemplate, setDraftTemplate] = useState(null); // currently in the builder
  const [clients,       setClients]      = useState([]);
  const [submissions,   setSubmissions]  = useState([]);
  const [audit,         setAudit]        = useState([]);
  const [uploadCursor,  setUploadCursor] = useState(0);    // which schema the next "upload" extracts

  // Tweaks
  const [tweaks, setTweaks] = useTweaks(/*EDITMODE-BEGIN*/{
    "accent": "green",
    "density": "comfortable",
    "theme": "light",
    "showAiHints": true,
    "mobilePreview": false
  }/*EDITMODE-END*/);

  // Apply theme + density + accent to <html>
  useEffect(() => {
    document.documentElement.dataset.theme = tweaks.theme;
    document.documentElement.dataset.density = tweaks.density;
    const accents = {
      green:  ["48% 0.12 155", "42% 0.13 155", "95% 0.03 155",  "32% 0.10 155"],
      teal:   ["52% 0.09 195", "46% 0.10 195", "95% 0.025 195", "30% 0.07 195"],
      indigo: ["50% 0.13 270", "44% 0.15 270", "96% 0.03 270",  "32% 0.12 270"],
      slate:  ["35% 0.02 250", "28% 0.02 250", "93% 0.006 250", "22% 0.015 250"],
    };
    const [a, a2, soft, ink] = accents[tweaks.accent] || accents.green;
    document.documentElement.style.setProperty("--accent",      `oklch(${a})`);
    document.documentElement.style.setProperty("--accent-2",    `oklch(${a2})`);
    document.documentElement.style.setProperty("--accent-soft", `oklch(${soft})`);
    document.documentElement.style.setProperty("--accent-ink",  `oklch(${ink})`);
  }, [tweaks]);

  const toast = useCallback((msg, kind = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, []);

  const recordAudit = useCallback((entry) => {
    const now = new Date();
    const ts = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    setAudit(a => [{ ts, actor: ROLE_DEFAULTS[role]?.label || "User", ...entry, ip: "10.0.4." + (12 + a.length) }, ...a]);
  }, [role]);

  const onSignIn = (r) => {
    setRole(r);
    setView(ROLE_DEFAULTS[r].home);
    setSignedIn(true);
    setAudit(a => [{ ts: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }), actor: ROLE_DEFAULTS[r].label, action: "Signed in", target: "Web · Chrome", ip: "10.0.4.11" }, ...a]);
  };
  const onSignOut = () => { setSignedIn(false); setRole(null); setView(null); };

  // Upload: produce the next schema as a draft for the builder.
  const startUpload = () => {
    const queue = window.APP_DATA.uploadQueue;
    const key = queue[uploadCursor % queue.length];
    setUploadCursor(c => c + 1);
    const schema = JSON.parse(JSON.stringify(window.APP_DATA.schemas[key]));
    // Reset table rows to a clean editable seed so the caregiver fills them in.
    schema.sections.forEach(s => s.fields.forEach(f => { if (f.type === "table") f.rows = []; }));
    setDraftTemplate({
      ...schema,
      uploadedAt: new Date(),
      status: "review",
      version: 1,
      author: ROLE_DEFAULTS[role]?.label || "Admin",
    });
    return schema;
  };

  // Publish: move draft into templates list.
  const publishDraft = (finalDraft) => {
    const id = "tpl_" + Math.random().toString(36).slice(2, 8);
    const tpl = { ...finalDraft, id, status: "published", publishedAt: new Date(), submissionCount: 0, version: 1 };
    setTemplates(t => [tpl, ...t]);
    setDraftTemplate(null);
    recordAudit({ action: "Published template", target: `${tpl.name} v${tpl.version}` });
    toast(`Published “${tpl.name}”`);
    return tpl;
  };

  // Save draft (no publish)
  const saveDraft = (draft) => {
    setDraftTemplate(draft);
    recordAudit({ action: "Saved template draft", target: draft.name });
    toast("Draft saved");
  };

  const addClient = (c) => {
    const id = "cli_" + Math.random().toString(36).slice(2, 8);
    const initials = c.name.split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase();
    const client = { id, initials, ...c };
    setClients(prev => [client, ...prev]);
    recordAudit({ action: "Added client", target: c.name });
    toast(`Added ${c.name}`);
    return client;
  };

  const addSubmission = (sub) => {
    const id = "sub_" + Math.random().toString(36).slice(2, 8);
    const submitted = new Date();
    const submission = { id, submittedAt: submitted, ...sub };
    setSubmissions(prev => [submission, ...prev]);
    setTemplates(ts => ts.map(t => t.id === sub.templateId ? { ...t, submissionCount: (t.submissionCount || 0) + 1 } : t));
    recordAudit({ action: "Submitted form", target: `${sub.templateName} — ${sub.clientName}` });
    toast(`Submitted “${sub.templateName}”`);
    return submission;
  };

  const ctx = {
    role, view, setView,
    setRole: (r) => { setRole(r); setView(ROLE_DEFAULTS[r].home); },
    onSignOut, toast, tweaks, setTweaks,
    state: { templates, draftTemplate, clients, submissions, audit },
    actions: {
      startUpload, publishDraft, saveDraft,
      addClient, addSubmission,
      setDraftTemplate, recordAudit,
    },
    currentUser: signedIn ? { ...ROLE_DEFAULTS[role], role } : null,
  };

  if (!signedIn) {
    return (
      <AppCtx.Provider value={ctx}>
        <LoginScreen onSignIn={onSignIn} />
        <Toasts items={toasts} />
      </AppCtx.Provider>
    );
  }

  const shell = (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar />
        <Router />
      </div>
    </div>
  );

  return (
    <AppCtx.Provider value={ctx}>
      {tweaks.mobilePreview && role === "caregiver" ? <MobileFrame>{shell}</MobileFrame> : shell}
      <TweaksPanel title="Tweaks">
        <TweakSection title="Accent color">
          <TweakColor
            label="Accent"
            value={tweaks.accent}
            onChange={(v) => setTweaks("accent", v)}
            options={[
              { value: "green",  color: "oklch(48% 0.12 155)" },
              { value: "teal",   color: "oklch(52% 0.09 195)" },
              { value: "indigo", color: "oklch(50% 0.13 270)" },
              { value: "slate",  color: "oklch(35% 0.02 250)" },
            ]}
          />
        </TweakSection>
        <TweakSection title="Display">
          <TweakRadio label="Theme"   value={tweaks.theme}   onChange={(v) => setTweaks("theme", v)}   options={["light", "dark"]} />
          <TweakRadio label="Density" value={tweaks.density} onChange={(v) => setTweaks("density", v)} options={["comfortable", "compact"]} />
        </TweakSection>
        <TweakSection title="Behavior">
          <TweakToggle label="Show AI confidence hints" value={tweaks.showAiHints} onChange={(v) => setTweaks("showAiHints", v)} />
          <TweakToggle label="Caregiver — phone preview" value={tweaks.mobilePreview} onChange={(v) => setTweaks("mobilePreview", v)} />
        </TweakSection>
      </TweaksPanel>
      <Toasts items={toasts} />
    </AppCtx.Provider>
  );
}

function Sidebar() {
  const { role, setRole, view, setView, onSignOut, state, currentUser } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef(null);
  const cfg = ROLE_DEFAULTS[role];

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const counts = {
    "admin/templates": state.templates.length || null,
    "admin/clients":   state.clients.length || null,
    "om/records":      state.submissions.length || null,
    "cg/forms":        state.templates.length || null,
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><img src="assets/logo.png" alt="Dare to Care" /></div>
        <div>
          <div className="brand-name">Dare to Care</div>
          <div className="brand-sub">Forms Platform</div>
        </div>
      </div>

      <div className="role-switch" ref={ref} onClick={() => setMenuOpen(o => !o)}>
        <div className="role-avatar">{cfg.initials}</div>
        <div className="role-info">
          <div className="role-name">{cfg.label}</div>
          <div className="role-role">signed in · switch role</div>
        </div>
        <Icon name="chevron" size={14} className="role-chevron" />
        {menuOpen && (
          <div className="role-menu" onClick={(e) => e.stopPropagation()}>
            {Object.entries(ROLE_DEFAULTS).map(([key, val]) => (
              <div
                key={key}
                className={"role-menu-item" + (key === role ? " active" : "")}
                onClick={() => { setRole(key); setMenuOpen(false); }}
              >
                <div className="role-avatar" style={{ width: 22, height: 22, fontSize: 10 }}>{val.initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 12.5 }}>{val.label}</div>
                  <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>{key === "admin" ? "Full admin access" : key === "manager" ? "Operations & records" : "Field worker"}</div>
                </div>
                {key === role && <Icon name="check" size={14} />}
              </div>
            ))}
            <div className="role-menu-item" style={{ borderTop: "1px solid var(--border)" }} onClick={onSignOut}>
              <div style={{ width: 22, height: 22, display: "grid", placeItems: "center" }}><Icon name="lock" size={13} /></div>
              <div style={{ flex: 1, fontSize: 12.5 }}>Sign out</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
        {cfg.nav.map((grp) => (
          <div key={grp.group}>
            <div className="nav-section">{grp.group}</div>
            <div className="nav">
              {grp.items.map((it) => (
                <div
                  key={it.id}
                  className={"nav-item" + (view === it.id ? " active" : "")}
                  onClick={() => setView(it.id)}
                >
                  <Icon name={it.icon} />
                  <span>{it.label}</span>
                  {counts[it.id] != null && <span className="count">{counts[it.id]}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <span className="status-dot"></span>
        <span>HIPAA-aware · Encrypted</span>
      </div>
    </aside>
  );
}

function Topbar() {
  const { view, state } = useApp();
  const draft = state.draftTemplate;
  const crumbs = useMemo(() => {
    const map = {
      "admin/dashboard": ["Workspace", "Dashboard"],
      "admin/templates": ["Forms", "Templates"],
      "admin/upload":    ["Forms", "Upload PDF"],
      "admin/builder":   ["Forms", "Form Builder", draft ? `${draft.name} · draft` : "Draft"],
      "admin/users":     ["People", "Users"],
      "admin/clients":   ["People", "Clients"],
      "admin/audit":     ["People", "Audit log"],
      "om/dashboard":    ["Workspace", "Dashboard"],
      "om/records":      ["Workspace", "Submissions"],
      "om/clients":      ["Roster", "Clients"],
      "om/team":         ["Roster", "Team"],
      "om/audit":        ["Roster", "Audit log"],
      "cg/today":        ["Today", "My day"],
      "cg/forms":        ["Today", "Available forms"],
      "cg/submissions":  ["History", "My submissions"],
      "cg/clients":      ["History", "My clients"],
      "cg/wizard":       ["Today", "Fill form"],
    };
    return map[view] || ["…"];
  }, [view, draft]);

  return (
    <div className="topbar">
      <div className="crumb">
        {crumbs.flatMap((c, i) => {
          const items = [];
          if (i > 0) items.push(<Icon key={`s${i}`} name="chevronR" size={12} className="sep" />);
          items.push(<span key={`c${i}`} className={i === crumbs.length - 1 ? "current" : ""}>{c}</span>);
          return items;
        })}
      </div>
      <div className="topbar-search">
        <Icon name="search" size={14} />
        <input placeholder="Search clients, forms, submissions…" />
        <span className="kbd">⌘K</span>
      </div>
      <div className="icon-btn" title="Notifications"><Icon name="bell" /></div>
      <div className="icon-btn" title="Settings"><Icon name="settings" /></div>
    </div>
  );
}

function Router() {
  const { view } = useApp();
  const name = ROUTES[view];
  const Comp = name && window[name];
  if (!Comp) return <div className="content"><div className="empty"><h3>View not found</h3></div></div>;
  return <Comp />;
}

function Toasts({ items }) {
  return (
    <div className="toasts">
      {items.map((t) => (
        <div key={t.id} className="toast">
          <Icon name={t.kind === "ok" ? "check" : "warn"} size={14} />
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// Mobile preview frame — wraps the caregiver app in a phone-shaped chrome.
function MobileFrame({ children }) {
  return (
    <div className="mobile-stage">
      <div className="mobile-frame">
        <div className="mobile-notch"></div>
        <div className="mobile-screen">
          {children}
        </div>
      </div>
      <div className="mobile-caption">Caregiver — phone preview · 390 × 844</div>
    </div>
  );
}

window.App = App;
window.useApp = useApp;
window.AppCtx = AppCtx;
window.ROLE_DEFAULTS = ROLE_DEFAULTS;
