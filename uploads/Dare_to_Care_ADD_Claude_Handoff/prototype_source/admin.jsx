// Admin views: Dashboard, Templates list, Upload PDF, Users, Clients, Audit log.
// All views start empty — content appears only after the user creates it via the UI.

function AdminDashboard() {
  const { setView, state } = useApp();
  const { templates, clients, submissions, audit } = state;

  const isEmpty = templates.length === 0 && clients.length === 0 && submissions.length === 0;

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome to Dare to Care</h1>
          <p className="page-sub">
            {isEmpty
              ? "Your workspace is ready. Get started by uploading your first reference form."
              : `${templates.length} template${templates.length === 1 ? "" : "s"} · ${clients.length} client${clients.length === 1 ? "" : "s"} · ${submissions.length} submission${submissions.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn accent" onClick={() => setView("admin/upload")}><Icon name="upload" /> Upload PDF</button>
        </div>
      </div>

      {isEmpty ? (
        <GetStarted />
      ) : (
        <>
          <div className="stat-grid">
            <StatCard label="Published templates"  value={String(templates.length)} delta={templates.length ? "Live" : "—"} up={templates.length > 0} />
            <StatCard label="Clients"               value={String(clients.length)}    delta={clients.length ? "Profiles available" : "Add your first"} />
            <StatCard label="Submissions"           value={String(submissions.length)} delta={submissions.length ? "On record" : "None yet"} />
            <StatCard label="Audit events"          value={String(audit.length)}      delta="This session" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
            <div className="card">
              <div className="card-h">
                <div className="title">Templates</div>
                <div className="right"><button className="btn ghost sm" onClick={() => setView("admin/templates")}>View all <Icon name="chevronR" size={12} /></button></div>
              </div>
              {templates.length === 0 ? (
                <div className="empty"><h3>No templates yet</h3><p>Upload a PDF to draft your first.</p></div>
              ) : (
                <table className="tbl">
                  <thead><tr><th>Template</th><th>Status</th><th>Sections</th><th className="right">Submissions</th></tr></thead>
                  <tbody>
                    {templates.slice(0, 6).map(t => (
                      <tr className="row" key={t.id}>
                        <td><div className="row" style={{ gap: 10 }}>
                          <div className="field-type"><Icon name="doc" size={12} /></div>
                          <div style={{ fontWeight: 500 }}>{t.name}</div>
                        </div></td>
                        <td><StatusBadge status={t.status} /></td>
                        <td className="muted num">{t.sections.length}</td>
                        <td className="right num">{t.submissionCount || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card">
              <div className="card-h">
                <div className="title">Recent activity</div>
                <div className="right"><button className="btn ghost sm" onClick={() => setView("admin/audit")}>Audit log</button></div>
              </div>
              {audit.length === 0 ? (
                <div className="empty"><h3>No activity yet</h3></div>
              ) : (
                <div style={{ padding: "6px 0" }}>
                  {audit.slice(0, 7).map((e, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 18px", borderBottom: i < Math.min(6, audit.length - 1) ? "1px solid var(--border)" : "0" }}>
                      <span className="mono" style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2, minWidth: 38 }}>{e.ts}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, lineHeight: 1.35 }}>
                          <b style={{ fontWeight: 500 }}>{e.actor}</b> <span className="muted">{e.action.toLowerCase()}</span>
                        </div>
                        <div className="muted" style={{ fontSize: 11.5, marginTop: 1 }}>{e.target}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function GetStarted() {
  const { setView } = useApp();
  const steps = [
    { n: 1, icon: "upload",  title: "Upload a reference form",   body: "Drop any blank PDF the agency uses today. AI analyzes its purpose, fields, and layout.",            action: () => setView("admin/upload"),    label: "Upload PDF" },
    { n: 2, icon: "ai",      title: "Review the AI draft",        body: "Approve the interpretation — purpose, audience, sections, fields — and edit anything that's off.", action: () => setView("admin/upload"),    label: "See the flow" },
    { n: 3, icon: "client",  title: "Add a client profile",       body: "Profiles power context-aware autofill — the system distinguishes client name from caregiver name.", action: () => setView("admin/clients"),   label: "Add client" },
    { n: 4, icon: "send",    title: "Publish & let staff complete it", body: "Caregivers fill the form on any device. A branded PDF is generated and filed automatically.",    action: () => setView("admin/templates"), label: "View templates" },
  ];

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div className="card-h">
        <Icon name="sparkle" size={14} style={{ color: "var(--accent)" }} />
        <div className="title">Get started in 4 steps</div>
        <div className="sub">~ 2 minutes</div>
      </div>
      <div className="getstarted">
        {steps.map(s => (
          <div key={s.n} className="gs-step">
            <div className="gs-n">{s.n}</div>
            <div className="gs-ico"><Icon name={s.icon} size={18} /></div>
            <div className="gs-body">
              <div className="gs-title">{s.title}</div>
              <div className="gs-text">{s.body}</div>
            </div>
            <button className="btn sm" onClick={s.action}>{s.label} <Icon name="chevronR" size={12} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, delta, up, warn, suffix = "" }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value}<span style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 500 }}>{suffix}</span></div>
      {delta && <div className={"delta " + (warn ? "down" : up ? "up" : "")}>{delta}</div>}
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === "published") return <span className="badge ok dot">Published</span>;
  if (status === "draft")     return <span className="badge dot">Draft</span>;
  if (status === "review")    return <span className="badge ai dot">In review</span>;
  if (status === "complete")  return <span className="badge ok dot">Complete</span>;
  return <span className="badge">{status}</span>;
}

function TemplatesList() {
  const { setView, state, actions } = useApp();
  const { templates } = state;
  const [q, setQ] = useState("");

  const items = templates.filter(t => !q || t.name.toLowerCase().includes(q.toLowerCase()));

  if (templates.length === 0) {
    return (
      <div className="content narrow">
        <div className="page-header">
          <div><h1 className="page-title">Templates</h1><p className="page-sub">Reusable digital forms. Upload a PDF to draft your first.</p></div>
          <div className="page-actions"><button className="btn accent" onClick={() => setView("admin/upload")}><Icon name="upload" /> Upload PDF</button></div>
        </div>
        <EmptyCard
          icon="templates"
          title="No templates yet"
          body="Upload a reference PDF and AI will draft a template with sections, fields, and field meanings. You stay in control — nothing publishes without your approval."
          action={{ label: "Upload your first PDF", onClick: () => setView("admin/upload") }}
        />
      </div>
    );
  }

  return (
    <div className="content">
      <div className="page-header">
        <div><h1 className="page-title">Templates</h1><p className="page-sub">{templates.length} published template{templates.length === 1 ? "" : "s"}</p></div>
        <div className="page-actions"><button className="btn accent" onClick={() => setView("admin/upload")}><Icon name="upload" /> Upload PDF</button></div>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 12 }}>
        <div className="topbar-search" style={{ width: 320, margin: 0 }}>
          <Icon name="search" size={14} />
          <input placeholder="Search templates…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="card card-tight">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: "30%" }}>Template</th>
              <th>Category</th>
              <th>Status</th>
              <th>Published</th>
              <th className="right">Sections</th>
              <th className="right">Fields</th>
              <th className="right">Submissions</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(t => {
              const fields = t.sections.reduce((n, s) => n + s.fields.length, 0);
              return (
                <tr className="row" key={t.id} onClick={() => { actions.setDraftTemplate(t); setView("admin/builder"); }}>
                  <td><div className="row" style={{ gap: 10 }}>
                    <div className="field-type"><Icon name="doc" size={12} /></div>
                    <div><div style={{ fontWeight: 500 }}>{t.name}</div><div className="muted" style={{ fontSize: 11.5 }}>by {t.author}</div></div>
                  </div></td>
                  <td><span className="tag">{t.category}</span></td>
                  <td><StatusBadge status={t.status} /></td>
                  <td className="muted">{t.publishedAt ? relTime(t.publishedAt) : "—"}</td>
                  <td className="right num">{t.sections.length}</td>
                  <td className="right num">{fields}</td>
                  <td className="right num">{t.submissionCount || 0}</td>
                  <td className="right"><button className="icon-btn" onClick={(e) => e.stopPropagation()}><Icon name="more" size={14} /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function relTime(d) {
  const ms = Date.now() - (d instanceof Date ? d.getTime() : new Date(d).getTime());
  const m = Math.floor(ms / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  return `${Math.floor(h / 24)} day${Math.floor(h / 24) === 1 ? "" : "s"} ago`;
}

function UploadPDF() {
  const { setView, actions } = useApp();
  const [phase, setPhase] = useState("idle"); // idle | uploading | analyzing | done
  const [progress, setProgress] = useState(0);
  const [over, setOver] = useState(false);
  const [filename, setFilename] = useState("");
  const [schema, setSchema] = useState(null);

  const steps = [
    { id: "ocr",      label: "Extracting text & layout",            done: progress >= 100 },
    { id: "fields",   label: "Detecting form fields",                done: phase === "analyzing" || phase === "done" },
    { id: "groups",   label: "Grouping fields into sections",        done: phase === "analyzing" || phase === "done" },
    { id: "purpose",  label: "Inferring purpose & workflow",         done: phase === "analyzing" || phase === "done" },
    { id: "tables",   label: "Preserving tables, scales & signatures", done: phase === "analyzing" || phase === "done" },
    { id: "autofill", label: "Mapping context-aware autofill",       done: phase === "analyzing" || phase === "done" },
  ];

  useEffect(() => {
    if (phase === "uploading") {
      const timer = setInterval(() => {
        setProgress(p => {
          if (p >= 100) { clearInterval(timer); setPhase("analyzing"); return 100; }
          return p + 8;
        });
      }, 70);
      return () => clearInterval(timer);
    }
    if (phase === "analyzing") {
      const t = setTimeout(() => { setPhase("done"); }, 2400);
      return () => clearTimeout(t);
    }
    if (phase === "done" && schema) {
      const t = setTimeout(() => {
        actions.setDraftTemplate({
          ...schema,
          uploadedAt: new Date(),
          status: "review",
          version: 1,
          author: window.ROLE_DEFAULTS.admin.label,
          interpretationApproved: { purpose: false, audience: false, recordType: false, output: false },
        });
        setView("admin/builder");
      }, 350);
      return () => clearTimeout(t);
    }
  }, [phase, schema, actions, setView]);

  const start = () => {
    setProgress(0);
    const s = actions.startUpload();
    setSchema(s);
    setFilename(s.sourceFilename);
    setPhase("uploading");
  };

  if (phase === "idle") {
    return (
      <div className="content narrow">
        <div className="page-header">
          <div>
            <h1 className="page-title">Upload a reference form</h1>
            <p className="page-sub">AI analyzes layout, detects fields and tables, infers purpose, and drafts a digital template. You approve before anything is published.</p>
          </div>
        </div>

        <div className={"dropzone" + (over ? " over" : "")}
          onClick={start}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); start(); }}>
          <div className="ico"><Icon name="upload" size={22} /></div>
          <h3>Drop a PDF here, or click to browse</h3>
          <p>Up to 25 MB. Your forms are never used to train models.</p>
        </div>

        <div className="row" style={{ marginTop: 24, gap: 12 }}>
          <UploadPromise icon="ai"     accent="ai"     title="Structure-aware extraction"   body="Tables stay tables. Scoring scales stay scales. Signatures stay signatures. Nothing flattened to plain text." />
          <UploadPromise icon="link"   accent="accent" title="Context-aware autofill mapping" body="Detects whether a name is the client, employee, or emergency contact — and tags fields with semantic meaning." />
          <UploadPromise icon="shield" accent="accent" title="You approve before publish"     body="The AI suggests; an admin reviews purpose, fields, and field meanings. Nothing goes live without sign-off." />
        </div>
      </div>
    );
  }

  if (phase === "uploading") {
    return (
      <div className="content narrow" style={{ maxWidth: 700 }}>
        <div className="page-header"><div><h1 className="page-title">Uploading…</h1><p className="page-sub">{filename}</p></div></div>
        <div className="card"><div className="card-body">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Icon name="pdf" size={28} style={{ color: "var(--danger)" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{filename}</div>
              <div className="muted" style={{ fontSize: 12 }}>Uploading…</div>
              <div style={{ marginTop: 8, height: 6, background: "var(--bg-2)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: progress + "%", height: "100%", background: "var(--accent)", transition: "width .08s" }}></div>
              </div>
            </div>
            <span className="mono" style={{ minWidth: 36 }}>{progress}%</span>
          </div>
        </div></div>
      </div>
    );
  }

  // analyzing / done
  return (
    <div className="content narrow" style={{ maxWidth: 760 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title row" style={{ gap: 10 }}><span className="pulse-dot"></span> Analyzing form</h1>
          <p className="page-sub">Reading layout, detecting fields, preserving structure, inferring purpose.</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card"><div className="card-body">
          <div className="kicker">Pipeline</div>
          <div className="col" style={{ gap: 8, marginTop: 10 }}>
            {steps.map((s, i) => (
              <div key={s.id} className="row" style={{ gap: 10 }}>
                <div className={"step-dot " + (s.done ? "done" : "active")}>
                  {s.done ? <Icon name="check" size={11} /> : <span className="pulse-dot"></span>}
                </div>
                <span style={{ fontSize: 13, color: s.done ? "var(--text-2)" : "var(--text)", fontWeight: s.done ? 400 : 500 }}>{s.label}</span>
                <div className="spacer"></div>
                {s.done && <span className="muted mono" style={{ fontSize: 10 }}>{(0.3 + i * 0.18).toFixed(2)}s</span>}
              </div>
            ))}
          </div>
        </div></div>
        <div className="card"><div className="card-body">
          <div className="kicker">Detected so far</div>
          <div className="col" style={{ gap: 7, marginTop: 10 }}>
            <DetectLine label="Form title"             value={schema?.name || "…"} />
            <DetectLine label="Record type"            value={schema?.interpretation?.recordType || "…"} />
            <DetectLine label="Sections"               value={String(schema?.sections?.length || "…")} />
            <DetectLine label="Fields"                 value={String(schema?.sections?.reduce((n, s) => n + s.fields.length, 0) || "…")} />
            <DetectLine label="Tables preserved"       value={String(schema?.sections?.flatMap(s => s.fields).filter(f => f.type === "table").length || 0)} />
            <DetectLine label="Signature blocks"       value={String(schema?.sections?.flatMap(s => s.fields).filter(f => f.type === "signature").length || 0)} />
            <DetectLine label="Autofill candidates"    value={String(schema?.sections?.flatMap(s => s.fields).filter(f => f.autofill).length || 0)} />
          </div>
        </div></div>
      </div>
    </div>
  );
}

function UploadPromise({ icon, accent, title, body }) {
  const ink = accent === "ai" ? "var(--ai-ink)" : "var(--accent-ink)";
  const soft = accent === "ai" ? "var(--ai-soft)" : "var(--accent-soft)";
  return (
    <div className="card" style={{ flex: 1 }}>
      <div className="card-body" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div className="field-type" style={{ background: soft, color: ink, borderColor: "transparent" }}>
          <Icon name={icon} size={14} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{body}</div>
        </div>
      </div>
    </div>
  );
}

function DetectLine({ label, value }) {
  return (
    <div className="row" style={{ justifyContent: "space-between", fontSize: 12.5 }}>
      <span className="muted">{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function UsersView() {
  return (
    <div className="content narrow">
      <div className="page-header">
        <div><h1 className="page-title">Users & roles</h1><p className="page-sub">Role-based access. Caregivers see only their assigned clients and forms.</p></div>
        <div className="page-actions"><button className="btn accent"><Icon name="plus" /> Invite user</button></div>
      </div>
      <div className="card card-tight">
        <table className="tbl">
          <thead><tr><th>Role</th><th>Permissions</th><th>Members</th><th></th></tr></thead>
          <tbody>
            <RoleRow role="Admin"          perms="Upload PDFs, approve AI drafts, publish templates, manage users & access" members={1} active />
            <RoleRow role="Office Manager" perms="View submissions, manage clients & team, run reports, view audit log"     members={0} />
            <RoleRow role="Caregiver"      perms="Complete assigned forms, view own submissions, see own client roster"      members={0} />
            <RoleRow role="Client / Family"perms="View own profile, download own documents (future)"                         members={0} />
          </tbody>
        </table>
      </div>
      <div className="empty" style={{ marginTop: 16 }}>
        <Icon name="users" size={20} />
        <h3>Invite your team</h3>
        <p>Members you invite will receive a secure activation link.</p>
      </div>
    </div>
  );
}

function RoleRow({ role, perms, members, active }) {
  return (
    <tr className="row">
      <td>
        <div className="row" style={{ gap: 10 }}>
          <span className="role-avatar" style={{ background: active ? "var(--accent-soft)" : "var(--bg-2)", color: active ? "var(--accent-ink)" : "var(--text-2)" }}>
            {role.split(/\s|\//).map(w => w[0]).slice(0, 2).join("").toUpperCase()}
          </span>
          <div><div style={{ fontWeight: 500 }}>{role}</div>{active && <div className="muted" style={{ fontSize: 11.5 }}>You</div>}</div>
        </div>
      </td>
      <td className="muted" style={{ fontSize: 12.5 }}>{perms}</td>
      <td className="num">{members}</td>
      <td className="right"><button className="btn ghost sm">Manage</button></td>
    </tr>
  );
}

function ClientsView() {
  const { state, actions } = useApp();
  const { clients } = state;
  const [adding, setAdding] = useState(false);

  if (clients.length === 0 && !adding) {
    return (
      <div className="content narrow">
        <div className="page-header">
          <div><h1 className="page-title">Clients</h1><p className="page-sub">Client profiles drive context-aware autofill into forms.</p></div>
          <div className="page-actions"><button className="btn accent" onClick={() => setAdding(true)}><Icon name="plus" /> Add client</button></div>
        </div>
        <EmptyCard
          icon="client"
          title="No clients yet"
          body="Add a client profile and their name, DOB, MRN, and physician become available as audited autofill suggestions in compatible forms."
          action={{ label: "Add your first client", onClick: () => setAdding(true) }}
        />
      </div>
    );
  }

  return (
    <div className="content">
      <div className="page-header">
        <div><h1 className="page-title">Clients</h1><p className="page-sub">{clients.length} client{clients.length === 1 ? "" : "s"}</p></div>
        <div className="page-actions"><button className="btn accent" onClick={() => setAdding(true)}><Icon name="plus" /> Add client</button></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {clients.map(c => (
          <div className="card" key={c.id} style={{ padding: 16 }}>
            <div className="row" style={{ gap: 12 }}>
              <div className="role-avatar" style={{ width: 42, height: 42, fontSize: 14, background: "var(--bg-2)", color: "var(--text)" }}>{c.initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>{c.dob ? `DOB ${c.dob}` : ""}{c.mrn ? ` · ${c.mrn}` : ""}</div>
              </div>
            </div>
            {c.physician && <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Primary physician: {c.physician}</div>}
            {c.notes && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{c.notes}</div>}
          </div>
        ))}
      </div>
      {adding && <AddClientModal onClose={() => setAdding(false)} onSave={(c) => { actions.addClient(c); setAdding(false); }} />}
    </div>
  );
}

function AddClientModal({ onClose, onSave }) {
  const [name, setName]           = useState("");
  const [dob, setDob]             = useState("");
  const [mrn, setMrn]             = useState("");
  const [physician, setPhysician] = useState("");
  const [phone, setPhone]         = useState("");
  const [address, setAddress]     = useState("");
  const [notes, setNotes]         = useState("");

  const submit = (e) => {
    e?.preventDefault?.();
    if (!name.trim()) return;
    onSave({ name: name.trim(), dob, mrn, physician, phone, address, notes });
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-h">
          <Icon name="client" size={14} />
          <div className="title">Add a client</div>
          <div className="right"><button className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button></div>
        </div>
        <form className="card-body" onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <div className="label">Full legal name <span className="req">*</span></div>
            <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="As it appears on government ID" />
            <div className="hint">Semantic: <span className="mono">client.fullName</span></div>
          </div>
          <div className="field">
            <div className="label">Date of birth</div>
            <input className="input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            <div className="hint"><span className="mono">client.dateOfBirth</span></div>
          </div>
          <div className="field">
            <div className="label">Medical record number</div>
            <input className="input" value={mrn} onChange={(e) => setMrn(e.target.value)} placeholder="MRN-…" />
            <div className="hint"><span className="mono">client.mrn</span></div>
          </div>
          <div className="field">
            <div className="label">Primary physician</div>
            <input className="input" value={physician} onChange={(e) => setPhysician(e.target.value)} placeholder="Dr. …" />
            <div className="hint"><span className="mono">client.primaryPhysician</span></div>
          </div>
          <div className="field">
            <div className="label">Phone</div>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 000-0000" />
            <div className="hint"><span className="mono">client.phone</span></div>
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <div className="label">Home address</div>
            <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
            <div className="hint"><span className="mono">client.address</span></div>
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <div className="label">Care notes</div>
            <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tags, conditions, special instructions…" />
          </div>
          <div className="row" style={{ gridColumn: "1 / -1", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn accent" disabled={!name.trim()}><Icon name="check" size={12} /> Add client</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AuditLog() {
  const { state } = useApp();
  const D = state.audit;
  if (D.length === 0) {
    return (
      <div className="content narrow">
        <div className="page-header"><div><h1 className="page-title">Audit log</h1><p className="page-sub">Every read, write, and PDF access is recorded.</p></div></div>
        <EmptyCard icon="shield" title="No activity yet" body="Audit entries appear here as you and your team use the platform." />
      </div>
    );
  }
  return (
    <div className="content narrow">
      <div className="page-header">
        <div><h1 className="page-title">Audit log</h1><p className="page-sub">{D.length} event{D.length === 1 ? "" : "s"} this session · retained 7 years.</p></div>
        <div className="page-actions"><button className="btn"><Icon name="download" /> Export CSV</button></div>
      </div>
      <div className="card card-tight">
        <table className="tbl">
          <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>IP</th></tr></thead>
          <tbody>
            {D.map((e, i) => (
              <tr key={i}>
                <td className="mono muted">{e.ts}</td>
                <td style={{ fontWeight: 500 }}>{e.actor}</td>
                <td>{e.action}</td>
                <td className="muted">{e.target}</td>
                <td className="mono muted">{e.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyCard({ icon, title, body, action }) {
  return (
    <div className="empty-card">
      <div className="empty-icon"><Icon name={icon} size={22} /></div>
      <div className="empty-title">{title}</div>
      <div className="empty-body">{body}</div>
      {action && <button className="btn accent" onClick={action.onClick}>{action.label} <Icon name="chevronR" size={12} /></button>}
    </div>
  );
}

window.AdminDashboard = AdminDashboard;
window.TemplatesList = TemplatesList;
window.UploadPDF = UploadPDF;
window.UsersView = UsersView;
window.ClientsView = ClientsView;
window.AuditLog = AuditLog;
window.StatCard = StatCard;
window.StatusBadge = StatusBadge;
window.EmptyCard = EmptyCard;
window.relTime = relTime;
