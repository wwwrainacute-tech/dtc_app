/* ============================================================
   Dare to Care — Connected Prototype: Admin app.
   Dashboard · Templates · Upload→Extract→Builder→Publish · Clients · Audit
   Exposes window.DTCAdmin.
   ============================================================ */
(function () {
  const { useState, useEffect, useRef } = React;
  const { Icon } = window.DTCFields;
  const Store = window.DTCStore;
  const D = window.DTC;
  const { fmtDate } = window.DTCCaregiver;

  const relTime = (iso) => {
    const diff = (Date.now() - new Date(iso)) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    return fmtDate(iso.slice(0, 10));
  };

  /* ---------- Dashboard ---------- */
  function Dashboard({ onNav }) {
    const templates = Store.getTemplates();
    const pub = templates.filter((t) => t.status === "published");
    const subs = Store.getSubmissions();
    const audit = Store.getAudit().slice(0, 6);
    const stats = [
      { ic: "layers", n: pub.length, l: "Published templates" },
      { ic: "users", n: Store.clients.length, l: "Active clients" },
      { ic: "inbox", n: subs.length, l: "Submissions" },
      { ic: "fileText", n: templates.filter((t) => t.status === "draft").length, l: "Drafts pending" },
    ];
    return (
      <div>
        <div className="ds-ph">
          <div><h1>Dashboard</h1><p>Overview of templates, clients, and form activity.</p></div>
          <div className="actions"><button className="dbtn dbtn-primary" onClick={() => onNav("upload")}><Icon n="upload" s={15} />Upload PDF</button></div>
        </div>
        <div className="ds-stats">
          {stats.map((s, i) => (
            <div className="ds-statcard" key={i}>
              <div className="ic"><Icon n={s.ic} s={17} /></div>
              <div className="n">{s.n}</div><div className="l">{s.l}</div>
            </div>
          ))}
        </div>
        <div className="ds-cols">
          <div className="ds-panel">
            <div className="ds-panel-h"><h3>Recent activity</h3><span className="sub">Audit log</span></div>
            <div className="ds-feed">
              {audit.map((a) => (
                <div className="ds-feed-item" key={a.id}>
                  <div className={"fi" + (a.action === "published" ? " pub" : a.action === "submitted" ? " sub" : "")}>
                    <Icon n={a.action === "published" ? "check" : a.action === "submitted" ? "inbox" : a.action.indexOf("import") > -1 ? "upload" : "edit"} s={14} />
                  </div>
                  <div className="ft">
                    <div><b>{a.actor}</b> {a.action} <b>{a.target}</b>{a.meta ? " · " + a.meta : ""}</div>
                    <div className="when">{relTime(a.timestamp)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="ds-panel">
            <div className="ds-panel-h"><h3>Templates</h3><button className="dbtn dbtn-ghost" style={{ padding: "5px 11px", fontSize: 12 }} onClick={() => onNav("templates")}>View all</button></div>
            <div style={{ padding: "6px 0" }}>
              {templates.slice(0, 5).map((t) => (
                <div className="ds-feed-item" key={t.key} style={{ cursor: "pointer" }} onClick={() => onNav("templates")}>
                  <div className="fi pub"><Icon n={t.icon} s={14} /></div>
                  <div className="ft"><div><b>{t.name}</b></div><div className="when">{t.category} · {t.fieldCount} fields</div></div>
                  <span className={"spill " + (t.status === "published" ? "pub" : "draft")}><span className="pip" />{t.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Templates list ---------- */
  function Templates({ onEdit, onNav, onToast }) {
    const [, force] = useState(0);
    useEffect(() => Store.subscribe(() => force((n) => n + 1)), []);
    const templates = Store.getTemplates();
    return (
      <div>
        <div className="ds-ph">
          <div><h1>Templates</h1><p>Form templates digitized from source PDFs. Publish to release to caregivers.</p></div>
          <div className="actions"><button className="dbtn dbtn-primary" onClick={() => onNav("upload")}><Icon n="upload" s={15} />Import PDF</button></div>
        </div>
        <div className="ds-panel">
          <table className="ds-table">
            <thead><tr><th>Template</th><th>Category</th><th>Fields</th><th>Version</th><th>Status</th><th>Updated</th><th></th></tr></thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.key} onClick={() => onEdit(t.key)}>
                  <td><span className="row-ic"><span className="ti"><Icon n={t.icon} s={16} /></span><span><span className="cell-main">{t.name}</span></span></span></td>
                  <td>{t.category}</td>
                  <td>{t.fieldCount}</td>
                  <td><span className="spill ver">v{t.version}</span></td>
                  <td><span className={"spill " + (t.status === "published" ? "pub" : "draft")}><span className="pip" />{t.status}</span></td>
                  <td style={{ color: "var(--ink-3)", fontSize: 12 }}>{relTime(t.updatedAt)}</td>
                  <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                    {t.status === "published" ? (
                      <button className="dbtn dbtn-ghost" style={{ padding: "6px 11px", fontSize: 12 }} onClick={() => { Store.unpublishTemplate(t.key); onToast(t.name + " unpublished"); }}>Unpublish</button>
                    ) : (
                      <button className="dbtn dbtn-primary" style={{ padding: "6px 11px", fontSize: 12 }} onClick={() => { Store.publishTemplate(t.key); onToast(t.name + " published"); }}>Publish</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ---------- Upload / library ---------- */
  function Upload({ onImport }) {
    const [, force] = useState(0);
    useEffect(() => Store.subscribe(() => force((n) => n + 1)), []);
    const lib = Store.getLibrary();
    return (
      <div>
        <div className="ds-ph"><div><h1>Upload PDF</h1><p>Import a source form. Fields, tables, scoring &amp; autofill are detected into a draft template.</p></div></div>
        <div className="dropzone">
          <Icon n="upload" s={30} />
          <div className="dt">Drop a source PDF to import</div>
          <div className="dd">or choose one from the reference library below</div>
        </div>
        <div className="ds-navlabel" style={{ padding: "2px 2px 12px" }}>Reference library</div>
        <div className="upload-grid">
          {lib.map((l) => (
            <div className="lib-card" key={l.id}>
              <div className="lh">
                <div className="pdf-ic"><span className="corner" /></div>
                <div className="li">
                  <div className="fn">{l.file}</div>
                  <div className="fm">{l.pages} page{l.pages > 1 ? "s" : ""} · {Store.schemaName(l.schemaKey)}</div>
                </div>
              </div>
              <div className="la">
                {l.imported ? (
                  <span className="spill pub"><Icon n="check" s={11} />Imported</span>
                ) : <span className="spill draft">Not imported</span>}
                <button className="dbtn dbtn-primary" style={{ padding: "7px 13px", fontSize: 12 }} onClick={() => onImport(l)} disabled={false}>
                  <Icon n="sparkle" s={13} />{l.imported ? "Re-extract" : "Import & extract"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ---------- Extraction animation ---------- */
  function Extracting({ lib, onDone }) {
    const steps = ["Reading PDF structure", "Detecting fields & tables", "Inferring types, scoring & autofill", "Building draft template"];
    const [active, setActive] = useState(0);
    useEffect(() => {
      let i = 0;
      const iv = setInterval(() => { i += 1; setActive(i); if (i >= steps.length) { clearInterval(iv); setTimeout(onDone, 500); } }, 620);
      return () => clearInterval(iv);
    }, []);
    return (
      <div>
        <div className="ds-ph"><div><h1>Importing</h1><p>{lib.file}</p></div></div>
        <div className="extracting">
          <div className="spin" />
          <h3>Interpreting the form</h3>
          <p>Turning the PDF into an editable, data-driven template.</p>
          <div className="steps">
            {steps.map((s, i) => (
              <div className={"est" + (i < active ? " done" : "")} key={i}>
                <span className="tk">{i < active ? <Icon n="check" s={12} /> : i + 1}</span>{s}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Builder ---------- */
  function Builder({ templateKey, onClose, onToast }) {
    const [tpl, setTpl] = useState(() => JSON.parse(JSON.stringify(Store.getTemplate(templateKey))));
    const [sel, setSel] = useState(null); // {si, fi}
    const fieldList = [];
    tpl.sections.forEach((sec, si) => sec.fields.forEach((f, fi) => { if (f.type !== "policyText") fieldList.push({ f, si, fi }); }));
    const selField = sel ? tpl.sections[sel.si].fields[sel.fi] : null;

    const patchField = (patch) => {
      setTpl((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        Object.assign(next.sections[sel.si].fields[sel.fi], patch);
        return next;
      });
    };

    const saveDraft = () => { Store.saveTemplate(tpl); onToast("Draft saved"); };
    const publish = () => { Store.saveTemplate(tpl); Store.publishTemplate(tpl.key); onToast(tpl.name + " published — now live for caregivers"); onClose(); };

    return (
      <div>
        <div className="ds-ph">
          <div>
            <button className="dbtn dbtn-ghost" style={{ marginBottom: 10, padding: "6px 12px", fontSize: 12 }} onClick={onClose}><Icon n="arrowLeft" s={14} />All templates</button>
            <h1>{tpl.name}</h1>
            <p>{tpl.category} · v{tpl.version} · <span className={"spill " + (tpl.status === "published" ? "pub" : "draft")} style={{ marginLeft: 4 }}><span className="pip" />{tpl.status}</span></p>
          </div>
          <div className="actions">
            <button className="dbtn dbtn-ghost" onClick={saveDraft}>Save draft</button>
            <button className="dbtn dbtn-primary" onClick={publish}><Icon n="check" s={15} />{tpl.status === "published" ? "Re-publish" : "Publish"}</button>
          </div>
        </div>

        <div className="builder">
          <div className="builder-main">
            <div className="interp-card">
              <div className="ih"><Icon n="sparkle" s={15} />AI interpretation</div>
              <div className="ig">
                <div className="iitem"><div className="k">Purpose</div><div className="v">{tpl.interpretation.purpose}</div></div>
                <div className="iitem"><div className="k">Cadence</div><div className="v">{tpl.interpretation.cadence}</div></div>
                <div className="iitem"><div className="k">Fields detected</div><div className="v">{tpl.fieldCount} across {tpl.sections.length} sections</div></div>
                <div className="iitem"><div className="k">Completed by</div><div className="v">{(tpl.completedBy || ["caregiver"]).join(", ")}</div></div>
              </div>
            </div>

            {tpl.sections.map((sec, si) => (
              <div className="bsec" key={sec.id}>
                <div className="bsec-h"><span className="sn">SECTION {si + 1}</span> {sec.title}</div>
                {sec.fields.map((f, fi) => {
                  if (f.type === "policyText") {
                    return <div className="bfield" key={f.id} style={{ cursor: "default" }}><span className="bf-type">policy</span><span className="bf-label">{f.label}</span></div>;
                  }
                  const isSel = sel && sel.si === si && sel.fi === fi;
                  return (
                    <div className={"bfield" + (isSel ? " sel" : "")} key={f.id} onClick={() => setSel({ si, fi })}>
                      <span className="bf-type">{f.type}</span>
                      <span className="bf-label">{f.label}</span>
                      {f.autofill ? <span className="bf-af" title="has autofill"><Icon n="sparkle" s={13} /></span> : null}
                      {f.required ? <span className="bf-req">*</span> : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="inspector">
            <div className="inspector-h"><div className="t">Field inspector</div><div className="nm">{selField ? selField.label : "No field selected"}</div></div>
            {selField ? (
              <div className="inspector-b">
                <div className="insp-row"><label className="il">Label</label><input className="insp-input" value={selField.label} onChange={(e) => patchField({ label: e.target.value })} /></div>
                <div className="insp-row"><label className="il">Type</label><input className="insp-input" value={selField.type} readOnly style={{ color: "var(--ink-3)" }} /></div>
                <div className="insp-toggle"><label className="il">Required</label><button className={"tgl" + (selField.required ? " on" : "")} onClick={() => patchField({ required: !selField.required })} /></div>
                {selField.semantic ? <div className="insp-row"><label className="il">Semantic key</label><div className="insp-input" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ai)" }}>{selField.semantic}</div></div> : null}
                {selField.options ? (
                  <div className="insp-row"><label className="il">Options</label>
                    {selField.options.map((o, i) => <div className="insp-opt" key={i}><Icon n="chevron" s={11} style={{ color: "var(--ink-4)" }} />{o.label}{typeof o.score === "number" ? <span className="sc">+{o.score}</span> : null}</div>)}
                  </div>
                ) : null}
                {selField.columns ? (
                  <div className="insp-row"><label className="il">Table columns</label>
                    {selField.columns.map((c, i) => <div className="insp-opt" key={i}><Icon n="grid" s={11} style={{ color: "var(--ink-4)" }} />{c.label} <span className="sc">{c.type}</span></div>)}
                  </div>
                ) : null}
                <div className="insp-row"><label className="il">Autofill</label>
                  {selField.autofill ? (
                    <div className="insp-opt" style={{ color: "var(--ai)" }}><Icon n="sparkle" s={11} />{selField.autofill.source}<span className="sc">{selField.autofill.safe ? "safe" : "manual"}</span></div>
                  ) : <div style={{ fontSize: 12, color: "var(--ink-4)" }}>None</div>}
                </div>
              </div>
            ) : (
              <div className="insp-empty"><Icon n="edit" s={26} /><div>Select a field to inspect &amp; edit its label, type, required flag, options, and autofill.</div></div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Clients (shared) ---------- */
  function Clients() {
    return (
      <div>
        <div className="ds-ph"><div><h1>Clients</h1><p>Shared client directory used for form autofill. Sample data.</p></div></div>
        <div className="ds-panel">
          <table className="ds-table">
            <thead><tr><th>Client</th><th>DOB</th><th>MRN</th><th>Physician</th><th>Allergies</th></tr></thead>
            <tbody>
              {Store.clients.map((c) => (
                <tr key={c.id} style={{ cursor: "default" }}>
                  <td><span className="row-ic"><span className="ti">{c.initials}</span><span className="cell-main">{c.name}</span></span></td>
                  <td>{fmtDate(c.dob)}</td><td>{c.mrn}</td><td>{c.physician}</td>
                  <td style={{ color: "var(--ink-3)" }}>{c.allergies}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ---------- Audit log ---------- */
  function AuditLog() {
    const [, force] = useState(0);
    useEffect(() => Store.subscribe(() => force((n) => n + 1)), []);
    const audit = Store.getAudit();
    return (
      <div>
        <div className="ds-ph"><div><h1>Audit log</h1><p>Immutable record of every meaningful action. {audit.length} events.</p></div></div>
        <div className="ds-panel">
          <table className="ds-table">
            <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th></tr></thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id} style={{ cursor: "default" }}>
                  <td style={{ color: "var(--ink-3)", fontSize: 12, whiteSpace: "nowrap" }}>{relTime(a.timestamp)}</td>
                  <td><span className="cell-main">{a.actor}</span> <span className="spill ver" style={{ marginLeft: 4 }}>{a.role}</span></td>
                  <td>{a.action}</td>
                  <td>{a.target}{a.meta ? <span style={{ color: "var(--ink-3)" }}> · {a.meta}</span> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ---------- Admin shell ---------- */
  function AdminApp({ page, onNav, onToast }) {
    const [importLib, setImportLib] = useState(null);
    const [extracting, setExtracting] = useState(false);
    const [editingKey, setEditingKey] = useState(null);

    // reset transient state when sidebar page changes
    useEffect(() => { setImportLib(null); setExtracting(false); setEditingKey(null); }, [page]);

    if (editingKey) return <Builder templateKey={editingKey} onClose={() => { setEditingKey(null); onNav("templates"); }} onToast={onToast} />;
    if (extracting && importLib) return <Extracting lib={importLib} onDone={() => { const tpl = Store.importTemplate(importLib.schemaKey); setExtracting(false); setEditingKey(tpl.key); }} />;

    switch (page) {
      case "templates": return <Templates onEdit={setEditingKey} onNav={onNav} onToast={onToast} />;
      case "upload": return <Upload onImport={(l) => { setImportLib(l); setExtracting(true); }} />;
      case "clients": return <Clients />;
      case "audit": return <AuditLog />;
      default: return <Dashboard onNav={onNav} />;
    }
  }

  window.DTCAdmin = { AdminApp };
})();
