// Login screen — entry point of the app.
// In demo mode (no backend), the three role tiles below the form sign you in directly.

function LoginScreen({ onSignIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const submit = (e) => {
    e?.preventDefault?.();
    setError("");
    if (!email) { setError("Enter your work email."); return; }
    if (!password) { setError("Enter your password."); return; }
    setWorking(true);
    setTimeout(() => {
      // Demo: any credentials sign in as admin.
      onSignIn("admin");
    }, 700);
  };

  return (
    <div className="login-page">
      <div className="login-bg"></div>

      <div className="login-shell">
        <div className="login-side">
          <div className="login-brand">
            <img src="assets/logo.png" alt="Dare to Care" />
          </div>
          <div className="login-pitch">
            <div className="login-kicker">Dare to Care · Forms</div>
            <h1 className="login-headline">Paperwork that fills itself, signs itself, and files itself.</h1>
            <p className="login-sub">Upload your existing forms. The agency's AI converts them into clean digital templates, your team fills them on any device, and a branded PDF is filed automatically.</p>
            <ul className="login-points">
              <li><span className="login-tick"><Icon name="check" size={11} /></span>HIPAA-aware storage, audit trails, role-based access</li>
              <li><span className="login-tick"><Icon name="check" size={11} /></span>Context-aware autofill — never silent, always sourced</li>
              <li><span className="login-tick"><Icon name="check" size={11} /></span>Branded PDFs preserve tables, scoring, signatures</li>
            </ul>
          </div>
          <div className="login-meta">
            <span className="status-dot"></span>
            <span>All systems operational · v1.0</span>
          </div>
        </div>

        <div className="login-card">
          <div className="login-card-head">
            <div className="login-card-title">Sign in</div>
            <div className="login-card-sub">Welcome back. Continue to your workspace.</div>
          </div>

          <form className="login-form" onSubmit={submit}>
            <div className="field">
              <label className="label">Work email</label>
              <input className="input" type="email" autoComplete="email"
                placeholder="you@youragency.com"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <div className="row">
                <label className="label" style={{ flex: 1 }}>Password</label>
                <a className="login-link" href="#" onClick={(e) => e.preventDefault()}>Forgot?</a>
              </div>
              <input className="input" type="password" autoComplete="current-password"
                placeholder="••••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <label className="login-row" onClick={(e) => e.preventDefault()}>
              <span className="checkbox checked"></span>
              <span>Keep me signed in on this device</span>
            </label>

            {error && <div className="login-error"><Icon name="warn" size={12} /> {error}</div>}

            <button className="btn accent lg" type="submit" disabled={working} style={{ width: "100%", justifyContent: "center" }}>
              {working ? "Signing in…" : <>Sign in <Icon name="arrow" size={14} /></>}
            </button>
          </form>

          <div className="login-divider"><span>or continue as</span></div>

          <div className="login-roles">
            <button className="login-role" onClick={() => onSignIn("admin")}>
              <span className="role-avatar" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>AD</span>
              <span className="login-role-text">
                <b>Admin</b>
                <em>Upload PDFs, approve AI drafts, publish templates</em>
              </span>
              <Icon name="chevronR" size={14} className="muted" />
            </button>
            <button className="login-role" onClick={() => onSignIn("manager")}>
              <span className="role-avatar" style={{ background: "var(--bg-2)", color: "var(--text)" }}>OM</span>
              <span className="login-role-text">
                <b>Office Manager</b>
                <em>Operations, submissions, audit trail</em>
              </span>
              <Icon name="chevronR" size={14} className="muted" />
            </button>
            <button className="login-role" onClick={() => onSignIn("caregiver")}>
              <span className="role-avatar" style={{ background: "var(--bg-2)", color: "var(--text)" }}>CG</span>
              <span className="login-role-text">
                <b>Caregiver</b>
                <em>Fill assigned forms in a guided wizard</em>
              </span>
              <Icon name="chevronR" size={14} className="muted" />
            </button>
          </div>

          <div className="login-foot">
            <span><Icon name="lock" size={11} /> Encrypted at rest · TLS in transit</span>
            <span>·</span>
            <a className="login-link" href="#" onClick={(e) => e.preventDefault()}>Privacy</a>
            <a className="login-link" href="#" onClick={(e) => e.preventDefault()}>Terms</a>
          </div>
        </div>
      </div>
    </div>
  );
}

window.LoginScreen = LoginScreen;
