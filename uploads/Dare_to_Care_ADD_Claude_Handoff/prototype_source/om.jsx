// Office Manager views: dashboard + records (submissions search)

function OMDashboard() {
  const { setView } = useApp();
  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Operations dashboard</h1>
          <p className="page-sub">Submissions, completion rates, and team activity.</p>
        </div>
      </div>
      <div className="stat-grid">
        <StatCard label="Submissions today"    value="42" delta="+9" up />
        <StatCard label="Drafts in-flight"     value="18" delta="6 stale (>24h)" warn />
        <StatCard label="Caregivers active"    value="11" delta="2 clocked out" />
        <StatCard label="Compliance"           value="98%" delta="+1.2 pts" up />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card">
          <div className="card-h"><div className="title">Submission volume · last 14 days</div></div>
          <div style={{ padding: "20px 18px 8px", height: 200 }}>
            <Bars />
          </div>
        </div>
        <div className="card">
          <div className="card-h"><div className="title">Top forms this week</div></div>
          <div style={{ padding: "8px 0" }}>
            <BarRow label="Medication List"          n={47} max={50} />
            <BarRow label="Fall Risk Assessment"     n={31} max={50} />
            <BarRow label="Caregiver Activity"       n={28} max={50} />
            <BarRow label="Supervisory Visit"        n={14} max={50} />
            <BarRow label="Emergency Prep Plan"      n={6}  max={50} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Bars() {
  const data = [12, 18, 16, 22, 14, 8, 6, 24, 28, 26, 32, 30, 38, 42];
  const max = Math.max(...data);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: "100%" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%" }}>
          <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
            <div style={{ width: "100%", height: `${(d / max) * 100}%`, background: i === data.length - 1 ? "var(--accent)" : "color-mix(in oklch, var(--accent) 35%, var(--bg-2))", borderRadius: "3px 3px 0 0" }}></div>
          </div>
          <div className="mono" style={{ fontSize: 9, color: "var(--text-3)" }}>{i + 3}</div>
        </div>
      ))}
    </div>
  );
}

function BarRow({ label, n, max }) {
  return (
    <div style={{ padding: "9px 18px" }}>
      <div className="row" style={{ marginBottom: 4 }}>
        <span style={{ fontSize: 13 }}>{label}</span>
        <span className="spacer"></span>
        <span className="mono muted" style={{ fontSize: 12 }}>{n}</span>
      </div>
      <div style={{ height: 5, background: "var(--bg-2)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${(n / max) * 100}%`, height: "100%", background: "var(--accent)" }}></div>
      </div>
    </div>
  );
}

function Records() {
  const D = window.APP_DATA.submissions;
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [tpl, setTpl] = useState("all");
  const [range, setRange] = useState("30d");

  const items = D.filter(s => {
    if (status !== "all" && s.status !== status) return false;
    if (tpl !== "all" && !s.template.toLowerCase().includes(tpl.toLowerCase())) return false;
    if (q) {
      const hay = (s.template + " " + s.client + " " + s.by).toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Submissions</h1>
          <p className="page-sub">Every completed form, with its branded PDF on record.</p>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="download" /> Export</button>
          <button className="btn"><Icon name="archive" /> Archive</button>
        </div>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div className="topbar-search" style={{ width: 320, margin: 0 }}>
          <Icon name="search" size={14} />
          <input placeholder="Search by client, caregiver, or form…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select" style={{ width: 180 }} value={tpl} onChange={(e) => setTpl(e.target.value)}>
          <option value="all">All forms</option>
          <option value="Fall">Fall Risk Assessment</option>
          <option value="Medication">Medication List</option>
          <option value="Supervisory">Supervisory Visit</option>
          <option value="Care">Care Plan</option>
        </select>
        <select className="select" style={{ width: 140 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Any status</option>
          <option value="complete">Complete</option>
          <option value="review">In review</option>
          <option value="draft">Draft</option>
        </select>
        <div className="segmented">
          {[["24h", "Today"], ["7d", "7d"], ["30d", "30d"], ["all", "All"]].map(([v, l]) => (
            <button key={v} className={range === v ? "active" : ""} onClick={() => setRange(v)}>{l}</button>
          ))}
        </div>
        <div className="spacer"></div>
        <span className="muted" style={{ fontSize: 12 }}>{items.length} of {D.length}</span>
      </div>

      <div className="card card-tight">
        <table className="tbl">
          <thead>
            <tr>
              <th>Form</th>
              <th>Client</th>
              <th>Caregiver</th>
              <th>Submitted</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(s => (
              <tr className="row" key={s.id}>
                <td>
                  <div className="row" style={{ gap: 10 }}>
                    <Icon name="pdf" size={14} style={{ color: "var(--danger)" }} />
                    <span style={{ fontWeight: 500 }}>{s.template}</span>
                  </div>
                </td>
                <td>{s.client}</td>
                <td className="muted">{s.by}</td>
                <td className="muted">{s.date}</td>
                <td>
                  <StatusBadge status={s.status} />
                  {s.flag && <span className="badge warn dot" style={{ marginLeft: 6 }}>{s.flag}</span>}
                </td>
                <td className="right">
                  <button className="btn ghost sm"><Icon name="eye" size={12} /> View</button>
                  <button className="btn ghost sm"><Icon name="download" size={12} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.OMDashboard = OMDashboard;
window.Records = Records;
