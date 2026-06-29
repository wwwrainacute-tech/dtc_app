import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, type Role } from "./AuthContext";

const accountCards: Array<{
  role: Role;
  title: string;
  email: string;
  password: string;
  summary: string;
  accent: string;
}> = [
  {
    role: "admin",
    title: "Admin",
    email: "admin@daretocare.com",
    password: "admin123",
    summary: "Owns templates, users, clients, and audit oversight.",
    accent: "Strategic control",
  },
  {
    role: "officeManager",
    title: "Office Manager",
    email: "office@daretocare.com",
    password: "office123",
    summary: "Reviews submissions, tracks compliance, and manages records.",
    accent: "Operations review",
  },
  {
    role: "caregiver",
    title: "Caregiver",
    email: "caregiver@daretocare.com",
    password: "care123",
    summary: "Completes guided forms, signs, and files finished visits.",
    accent: "Field workflow",
  },
];

const homeByRole: Record<Role, string> = {
  admin: "/admin",
  caregiver: "/caregiver",
  officeManager: "/office-manager",
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState(accountCards[0].email);
  const [password, setPassword] = useState(accountCards[0].password);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (nextEmail = email, nextPassword = password) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const user = await login(nextEmail, nextPassword);
      navigate(homeByRole[user.role], { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-stage">
        <section className="login-intro">
          <div className="login-brand-row">
            <img src="/logo.png" alt="Dare to Care" className="login-logo-mark" />
            <div>
              <strong>Dare to Care</strong>
              <span>Forms Platform</span>
            </div>
          </div>

          <div className="login-copy">
            <p className="login-overline">Care operations, beautifully organized</p>
            <h1>Finish the paperwork, keep the records, and make every role feel at home.</h1>
            <p className="login-lead">
              Admin, office, and caregiver work now live in one place with real sign-in, durable records, and stored finished forms.
            </p>
          </div>

          <div className="login-highlights">
            <div className="login-highlight-card">
              <span>Role-aware navigation</span>
              <strong>Admin, Office Manager, Caregiver</strong>
            </div>
            <div className="login-highlight-card">
              <span>Stored outputs</span>
              <strong>Signed submissions with downloadable PDFs</strong>
            </div>
            <div className="login-highlight-card">
              <span>Daily pace</span>
              <strong>Mobile-first caregiver flow, desktop-first oversight</strong>
            </div>
          </div>
        </section>

        <section className="login-panel">
          <div className="login-panel-head">
            <div>
              <h2>Sign in</h2>
              <p>Use one of the seeded accounts below or type your credentials directly.</p>
            </div>
          </div>

          <div className="login-role-grid">
            {accountCards.map((account) => {
              const selected = email === account.email;
              return (
                <button
                  key={account.role}
                  type="button"
                  className={`login-role-tile${selected ? " selected" : ""}`}
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                    setError(null);
                  }}
                >
                  <span className="lrt-title">{account.title}</span>
                  <span className="lrt-accent">{account.accent}</span>
                  <span className="lrt-summary">{account.summary}</span>
                  <code>{account.email}</code>
                </button>
              );
            })}
          </div>

          <form
            className="login-form"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <label className="login-field">
              <span>Email</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" />
            </label>

            <label className="login-field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>

            {error ? <div className="login-error">{error}</div> : null}

            <button className="login-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Open workspace"}
            </button>
          </form>

          <div className="login-credential-list">
            {accountCards.map((account) => (
              <button
                key={`${account.role}-quick`}
                type="button"
                className="login-credential-row"
                onClick={() => void submit(account.email, account.password)}
                disabled={isSubmitting}
              >
                <span>{account.title}</span>
                <code>{account.password}</code>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
