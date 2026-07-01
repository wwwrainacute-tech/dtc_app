import { useAuth } from "../../app/AuthContext";

const clientForms = [
  {
    id: "service_agreement",
    title: "Service Agreement",
    desc: "Review and sign your home care service agreement.",
    icon: "doc",
  },
  {
    id: "care_preferences",
    title: "Care Preferences",
    desc: "Tell us your daily preferences, routine, and any special requests.",
    icon: "heart",
  },
  {
    id: "emergency_contacts",
    title: "Emergency Contacts",
    desc: "Keep your emergency contacts and physician info up to date.",
    icon: "phone",
  },
  {
    id: "hipaa",
    title: "HIPAA Authorization",
    desc: "Authorize sharing of your health information with your care team.",
    icon: "shield",
  },
  {
    id: "satisfaction",
    title: "Satisfaction Survey",
    desc: "Share feedback about your recent care visits.",
    icon: "star",
  },
];

function FormIcon({ name }: { name: string }) {
  const props = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, width: 22, height: 22 };
  const icons: Record<string, React.ReactNode> = {
    doc: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/></>,
    heart: <><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></>,
    phone: <><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.91a16 16 0 006.18 6.18l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    star: <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>,
  };
  return <svg {...props}>{icons[name] || icons.doc}</svg>;
}

export default function ClientPortal() {
  const { user } = useAuth();

  return (
    <div className="client-portal">
      {/* Hero */}
      <div className="client-hero">
        <div className="client-hero-eyebrow">Client Portal</div>
        <h1>Hello, {user?.name?.split(" ")[0] || "there"}</h1>
        <p>Access your forms and documents, or reach out to your care team anytime.</p>
      </div>

      {/* Forms */}
      <div className="newhire-section-title" style={{ marginTop: 0 }}>Your forms</div>
      <div className="client-forms-grid">
        {clientForms.map((form) => (
          <button key={form.id} className="client-form-card">
            <div className="client-form-icon">
              <FormIcon name={form.icon} />
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <strong>{form.title}</strong>
              <span>{form.desc}</span>
            </div>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" style={{ color: "var(--ink-4)", flexShrink: 0 }}>
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
            </svg>
          </button>
        ))}
      </div>

      {/* Contact card */}
      <div className="client-contact-card">
        <div className="client-contact-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.91a16 16 0 006.18 6.18l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
          </svg>
        </div>
        <div>
          <strong>Need help?</strong>
          <span>
            Contact the DARE to Care office to speak with your care coordinator, update your schedule, or ask any questions about your care plan.
          </span>
        </div>
      </div>
    </div>
  );
}
