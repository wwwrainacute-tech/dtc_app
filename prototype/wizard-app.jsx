/* ============================================================
   Dare to Care — Caregiver app (store-backed, embeddable).
   Reads templates/clients/submissions from window.DTCStore so it
   shares one source of truth with Admin + Office Manager.
   Exposes window.DTCCaregiver. Auto-renders standalone unless
   window.__DTC_EMBED is set.
   ============================================================ */
const { useState, useEffect, useMemo, useRef } = React;
const { Icon, FieldRenderer } = window.DTCFields;
const { useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle, TweakRadio } = window;
const D = window.DTC;
const Store = window.DTCStore;

const getSchema = (key) => Store.getTemplate(key) || D.schemas[key];

const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const todayLong = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

/* ===================== Status bar ===================== */
function StatusBar() {
  return (
    <div className="statusbar">
      <span>9:41</span>
      <span className="sb-right"><Icon n="wifi" s={15} sw={2.2} /><Icon n="battery" s={17} sw={2} /></span>
    </div>
  );
}

function Toast({ msg }) {
  if (!msg) return null;
  return <div className="toast"><Icon n="checkCircle" s={16} />{msg}</div>;
}

/* ===================== Today tab ===================== */
function TodayTab({ onStart, submissions }) {
  const clients = Store.clients;
  const pubKeys = Store.publishedKeysFor("caregiver");
  const due = [];
  if (pubKeys.includes("fallRisk")) due.push({ client: clients[0], schema: "fallRisk", label: "Fall Risk — quarterly", late: false });
  if (pubKeys.includes("medicationList")) due.push({ client: clients[1], schema: "medicationList", label: "Medication reconciliation", late: true });
  if (pubKeys.includes("caregiverActivity")) due.push({ client: clients[0], schema: "caregiverActivity", label: "Today's visit log", late: false });
  if (due.length < 3 && pubKeys.includes("workplaceViolence")) due.push({ client: null, schema: "workplaceViolence", label: "Annual policy acknowledgement", late: false });

  return (
    <div className="view">
      <div className="appbar">
        <div className="greet">Good morning</div>
        <div className="title-row">
          <h2>Jordan</h2>
          <div className="avatar">{D.currentUser.initials}</div>
        </div>
        <div className="datestrip"><span className="dot" />{todayLong}</div>
      </div>
      <div className="pad" style={{ paddingTop: 0 }}>
        <div className="statrow">
          <div className="statbox"><div className="n">{due.length}</div><div className="l">Due today</div></div>
          <div className="statbox"><div className="n">{clients.length}</div><div className="l">My clients</div></div>
          <div className="statbox"><div className="n">{submissions.length}</div><div className="l">Filed</div></div>
        </div>
        <div className="section-label">Due today</div>
        <div className="card" style={{ padding: "4px 16px" }}>
          {due.map((t, i) => (
            <button className="task" key={i} onClick={() => onStart(t.schema, t.client)}>
              <span className="ci">{t.client ? t.client.initials : <Icon n="shield" s={16} />}</span>
              <span className="tinfo">
                <span className="who">{t.client ? t.client.name : "All caregivers"}</span>
                <span className="what">{t.label}</span>
              </span>
              <span className={"due" + (t.late ? "" : " ok")}>{t.late ? "Late" : "Today"}</span>
            </button>
          ))}
        </div>
        <div className="section-label">Start a form</div>
        {pubKeys.map((k) => <FormCard key={k} schemaKey={k} onStart={() => onStart(k, null)} />)}
      </div>
    </div>
  );
}

function FormCard({ schemaKey, onStart }) {
  const s = getSchema(schemaKey);
  if (!s) return null;
  const policy = s.category === "Policy";
  return (
    <button className={"card formcard" + (policy ? " policy" : "")} onClick={onStart} style={{ marginTop: 10 }}>
      <span className="ic"><Icon n={s.icon} s={20} /></span>
      <span className="meta">
        <span className="nm">{s.name}</span>
        <span className="sub"><span className="chip">{s.category}</span><span>· {s.estMin} min · {s.sections.length} steps</span></span>
      </span>
      <Icon n="chevron" s={18} style={{ color: "var(--ink-4)" }} />
    </button>
  );
}

function FormsTab({ onStart }) {
  const pubKeys = Store.publishedKeysFor("caregiver");
  return (
    <div className="view">
      <div className="appbar"><div className="title-row"><h2>Forms</h2></div>
        <div className="datestrip"><span className="dot" />{pubKeys.length} published templates available</div>
      </div>
      <div className="pad" style={{ paddingTop: 4 }}>
        {pubKeys.map((k) => <FormCard key={k} schemaKey={k} onStart={() => onStart(k, null)} />)}
        <p style={{ fontSize: 11.5, color: "var(--ink-3)", textAlign: "center", marginTop: 22, lineHeight: 1.5 }}>
          Published by Admin from imported PDFs.<br />Caregivers see only what they can complete.
        </p>
      </div>
    </div>
  );
}

function RecordsTab({ submissions, onOpen }) {
  return (
    <div className="view">
      <div className="appbar"><div className="title-row"><h2>My records</h2></div>
        <div className="datestrip"><span className="dot" />{submissions.length} submitted</div>
      </div>
      <div className="pad" style={{ paddingTop: 4 }}>
        {submissions.length === 0 ? (
          <div className="empty">
            <div className="ei"><Icon n="inbox" s={24} /></div>
            <h4>No records yet</h4>
            <p>Forms you complete and submit will appear here, each with its signed PDF.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: "4px 16px" }}>
            {submissions.map((sub) => {
              const s = getSchema(sub.schemaKey);
              return (
                <button className="subrow" key={sub.id} onClick={() => onOpen(sub)}>
                  <span className="si"><Icon n={s ? s.icon : "file"} s={18} /></span>
                  <span className="sinfo">
                    <span className="nm">{s ? s.name : sub.schemaKey}</span>
                    <span className="meta">{sub.clientName ? sub.clientName + " · " : ""}{fmtDate(sub.submittedAt.slice(0, 10))}</span>
                  </span>
                  <span className="stat">{sub.status === "needsCorrection" ? "Correction" : "Filed"}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ClientsTab() {
  return (
    <div className="view">
      <div className="appbar"><div className="title-row"><h2>My clients</h2></div>
        <div className="datestrip"><span className="dot" />{Store.clients.length} assigned · sample data</div>
      </div>
      <div className="pad" style={{ paddingTop: 4 }}>
        {Store.clients.map((c) => (
          <div className="card" key={c.id} style={{ marginTop: 10 }}>
            <div className="clientcard">
              <span className="ci">{c.initials}</span>
              <span className="cinfo">
                <span className="nm">{c.name}</span>
                <span className="meta">DOB {fmtDate(c.dob)} · MRN {c.mrn}</span>
                <span className="meta">{c.physician} · {c.phone}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabBar({ tab, setTab }) {
  const tabs = [
    { id: "today", label: "Today", icon: "home" },
    { id: "forms", label: "Forms", icon: "file" },
    { id: "records", label: "Records", icon: "inbox" },
    { id: "clients", label: "Clients", icon: "users" },
  ];
  return (
    <div className="tabbar">
      {tabs.map((t) => (
        <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
          <Icon n={t.icon} s={22} sw={tab === t.id ? 2.3 : 2} />{t.label}
        </button>
      ))}
    </div>
  );
}

/* ===================== Wizard ===================== */
function Wizard({ schemaKey, initialClient, onClose, onSubmit, autoApply, actorRole }) {
  const schema = getSchema(schemaKey);
  const needsClient = schema.subject === "client";

  const [client, setClient] = useState(initialClient || null);
  const [values, setValues] = useState({});
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState(false);
  const bodyRef = useRef(null);
  const ctx = { currentUser: D.currentUser, client };

  const appliedRef = useRef(false);
  useEffect(() => {
    if (!autoApply) return;
    if (needsClient && !client) return;
    if (appliedRef.current) return;
    appliedRef.current = true;
    setValues((prev) => {
      const next = { ...prev };
      schema.sections.forEach((sec) => sec.fields.forEach((f) => {
        if (f.autofill && f.autofill.safe) {
          const v = D.resolveAutofill(f, { currentUser: D.currentUser, client });
          if (v != null && next[f.id] === undefined) next[f.id] = v;
        }
      }));
      return next;
    });
  }, [client, autoApply, needsClient]);

  const nSec = schema.sections.length;
  const REVIEW = nSec + 1;
  const PDF = nSec + 2;
  const total = PDF;
  const setField = (id, v) => setValues((p) => ({ ...p, [id]: v }));
  const scrollTop = () => { if (bodyRef.current) bodyRef.current.scrollTop = 0; };
  const score = useMemo(() => D.computeScore(schema, values), [values]);

  const curSection = step >= 1 && step <= nSec ? schema.sections[step - 1] : null;
  const invalidIds = curSection ? D.invalidFieldsInSection(curSection, values) : [];
  const canAdvance = step === 0 ? (!needsClient || !!client) : curSection ? invalidIds.length === 0 : true;

  const goNext = () => { if (!canAdvance) { setTried(true); return; } setTried(false); setStep((s) => Math.min(s + 1, total)); scrollTop(); };
  const goBack = () => { if (step === 0) { onClose(); return; } setTried(false); setStep((s) => s - 1); scrollTop(); };

  const stepLabel = step === 0 ? "Get started" : step <= nSec ? `Step ${step} of ${nSec}` : step === REVIEW ? "Review & sign-off" : "Document preview";
  const sectionTitle = step === 0 ? schema.name : step <= nSec ? schema.sections[step - 1].title : step === REVIEW ? "Review" : "Branded PDF";

  return (
    <div className="wizard">
      <div className="wiz-head">
        <div className="row">
          <button className="x" onClick={onClose} aria-label="Close"><Icon n="x" s={18} /></button>
          <span className="formname">{schema.name}</span>
          <span style={{ width: 34 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 8 }}>
          <span className="step-k">{stepLabel}</span>
          {client ? <span className="step-k" style={{ color: "var(--ink-3)" }}>{client.name}</span> : null}
        </div>
        <div className="sectitle">{sectionTitle}</div>
        <div className="stepper">
          {Array.from({ length: nSec + 2 }).map((_, i) => {
            const segStep = i + 1;
            const done = step > segStep;
            const cur = step === segStep || (i === nSec + 1 && step >= PDF);
            return <span key={i} className={"seg" + (done ? " done" : "") + (cur ? " cur" : "")}><i /></span>;
          })}
        </div>
      </div>
      <div className="wiz-body" ref={bodyRef}>
        {step === 0 ? (
          <WizardIntro schema={schema} needsClient={needsClient} client={client} setClient={setClient} />
        ) : step <= nSec ? (
          <SectionStep section={schema.sections[step - 1]} values={values} setField={setField} ctx={ctx}
            invalidIds={tried ? invalidIds : []} score={score} schema={schema} setValues={setValues} />
        ) : step === REVIEW ? (
          <ReviewStep schema={schema} values={values} score={score} onEdit={(i) => { setStep(i + 1); scrollTop(); }} />
        ) : (
          <PdfPreview schema={schema} values={values} score={score} />
        )}
      </div>
      <div className="wiz-foot">
        <button className="btn btn-ghost" onClick={goBack}>{step === 0 ? "Cancel" : "Back"}</button>
        {step < REVIEW ? (
          <button className="btn btn-primary" onClick={goNext} disabled={step === 0 && needsClient && !client}>Continue</button>
        ) : step === REVIEW ? (
          <button className="btn btn-primary" onClick={goNext}>Preview PDF</button>
        ) : (
          <button className="btn btn-primary" onClick={() => onSubmit({ schema, values, score, client })}><Icon n="check" s={17} /> Submit &amp; file</button>
        )}
      </div>
    </div>
  );
}

function WizardIntro({ schema, needsClient, client, setClient }) {
  return (
    <div>
      <div className="wizintro">
        <div className="ic"><Icon n={schema.icon} s={26} /></div>
        <h3>{schema.name}</h3>
        <p>{schema.interpretation.purpose}</p>
        <div className="facts">
          <div className="f"><b>{schema.estMin} min</b>est. time</div>
          <div className="f"><b>{schema.sections.length}</b>sections</div>
          <div className="f"><b>{schema.category}</b>record</div>
        </div>
      </div>
      {needsClient ? (
        <div>
          <div className="section-label" style={{ marginTop: 6 }}>Select client</div>
          {Store.clients.map((c) => (
            <button key={c.id} className={"clientopt" + (client && client.id === c.id ? " sel" : "")} onClick={() => setClient(c)}>
              <span className="ci">{c.initials}</span>
              <span className="cinfo">
                <span className="nm">{c.name}</span>
                <span className="meta">DOB {fmtDate(c.dob)} · MRN {c.mrn}</span>
                <span className="tags">{c.tags.map((t) => <span key={t}>{t}</span>)}</span>
              </span>
              <Icon n="checkCircle" s={20} style={{ color: "var(--accent)" }} />
              <span className="check" />
            </button>
          ))}
        </div>
      ) : (
        <div className="card" style={{ background: "var(--surface-3)", textAlign: "center", fontSize: 13, color: "var(--ink-2)" }}>
          This acknowledgement is about you as an employee — no client needed.
        </div>
      )}
    </div>
  );
}

function SectionStep({ section, values, setField, ctx, invalidIds, score, schema, setValues }) {
  const pending = section.fields.filter((f) => {
    if (!f.autofill || !f.autofill.safe || f.type === "signature") return false;
    const sug = D.resolveAutofill(f, ctx);
    return sug != null && String(values[f.id] ?? "") !== String(sug);
  });
  const applyAll = () => setValues((p) => { const next = { ...p }; pending.forEach((f) => { next[f.id] = D.resolveAutofill(f, ctx); }); return next; });
  const hasComputed = section.fields.some((f) => f.type === "computed");
  return (
    <div>
      {pending.length > 1 ? (
        <div className="autobulk">
          <Icon n="sparkle" s={18} />
          <span className="t"><b>{pending.length} fields</b> can be autofilled from {ctx.client ? "the client profile" : "your profile"} &amp; today's date.</span>
          <button onClick={applyAll}>Apply all</button>
        </div>
      ) : null}
      {section.fields.map((f) => (
        <FieldRenderer key={f.id} field={f} value={values[f.id]} onChange={setField} ctx={ctx} invalid={invalidIds.includes(f.id)} />
      ))}
      {hasComputed ? <ScoreBlock schema={schema} score={score} /> : null}
    </div>
  );
}

function ScoreBlock({ schema, score }) {
  if (!score.tier) return <div className="scoreblock"><div className="top"><span className="lbl">Total score</span><span className="big">{score.total}</span></div></div>;
  return (
    <div className="scoreblock">
      <div className="top"><span className="lbl">Total score · recalculates live</span><span className="big">{score.total}</span></div>
      <div className={"tier " + score.tier.level}><span className="pip" />{score.tier.label}</div>
    </div>
  );
}

function displayValue(field, value) {
  if (value == null || value === "") return null;
  if (field.type === "date") return fmtDate(value);
  if (field.type === "checkbox") return Array.isArray(value) ? (value.length ? value.join(", ") : null) : null;
  if (field.type === "signature") return value && value.dataUrl ? "signed" : null;
  if (field.type === "table") return Array.isArray(value) ? value.filter((r) => Object.values(r).some((x) => x)).length + " medication(s)" : null;
  return String(value);
}

function ReviewStep({ schema, values, score, onEdit }) {
  return (
    <div>
      {D.hasScoring(schema) ? <ScoreBlock schema={schema} score={score} /> : null}
      {schema.sections.map((sec, i) => {
        const visible = sec.fields.filter((f) => f.type !== "computed" && f.type !== "policyText");
        if (!visible.length) return null;
        return (
          <div className="reviewsec" key={sec.id}>
            <div className="rs-h"><span className="t">{sec.title}</span><button className="edit" onClick={() => onEdit(i)}>Edit</button></div>
            <div className="card">
              {visible.map((f) => {
                const dv = displayValue(f, values[f.id]);
                if (f.type === "signature") {
                  return (
                    <div className="rev-row" key={f.id}>
                      <span className="k">{f.label}</span>
                      {values[f.id] && values[f.id].dataUrl ? <img src={values[f.id].dataUrl} alt="signature" style={{ height: 34 }} /> : <span className="v empty">not signed</span>}
                    </div>
                  );
                }
                return <div className="rev-row" key={f.id}><span className="k">{f.label}</span><span className={"v" + (dv ? "" : " empty")}>{dv || "—"}</span></div>;
              })}
            </div>
          </div>
        );
      })}
      <div className="autofill applied" style={{ marginTop: 4 }}><Icon n="lock" s={13} /><span>On submit, this is filed as an immutable, audited record.</span></div>
    </div>
  );
}

function PdfPreview({ schema, values, score }) {
  const idFields = schema.sections[0].fields.filter((f) => f.type !== "computed" && f.type !== "policyText");
  const sigField = schema.sections.flatMap((s) => s.fields).find((f) => f.type === "signature");
  const sig = sigField ? values[sigField.id] : null;
  const dateField = schema.sections.flatMap((s) => s.fields).filter((f) => f.type === "date").pop();
  const table = schema.sections.flatMap((s) => s.fields).find((f) => f.type === "table");
  const tableRows = table ? (values[table.id] || []).filter((r) => Object.values(r).some((x) => x)) : [];
  return (
    <div>
      <div className="pdfsheet">
        <div className="ph">
          <img src="assets/logo.png" alt="" />
          <div><div className="pt">{schema.name}</div><div className="ps">DARE TO CARE · v{schema.version} · {fmtDate(D.TODAY_ISO)}</div></div>
        </div>
        <div className="pbody">
          <h6>Client &amp; record</h6>
          {idFields.map((f) => { const dv = displayValue(f, values[f.id]); return <div className="pdf-line" key={f.id}><span className="k">{f.label}</span><span className="v">{dv || "—"}</span></div>; })}
          {D.hasScoring(schema) && score.tier ? (
            <><h6>Assessment result</h6><div className="pdf-score"><span style={{ fontSize: 12, color: "var(--ink-3)" }}>Total score &amp; risk level</span><span><span className="sv">{score.total}</span> &nbsp;· {score.tier.label}</span></div></>
          ) : null}
          {tableRows.length ? (
            <><h6>{table.label}</h6>{tableRows.map((r, i) => <div className="pdf-tabline" key={i}><b>{r.name || "—"}</b> · {r.dose || "?"} · {r.route || "?"} · {r.freq || "?"}{r.time ? " · " + r.time : ""}</div>)}</>
          ) : null}
          <h6>Signature</h6>
          {sig && sig.dataUrl ? (
            <div className="pdf-sig"><img src={sig.dataUrl} alt="signature" /><div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>{sig.signedBy ? sig.signedBy + " · " : ""}{dateField ? fmtDate(values[dateField.id]) : ""}</div></div>
          ) : <div className="pdf-line"><span className="v empty">No signature</span></div>}
        </div>
      </div>
      <p style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "center", marginTop: 14, lineHeight: 1.5 }}>
        Prototype preview. The real pipeline generates &amp; stores this branded PDF, stamped with the exact template version.
      </p>
    </div>
  );
}

function RecordViewer({ sub, onClose }) {
  const schema = getSchema(sub.schemaKey);
  return (
    <div className="wizard">
      <div className="wiz-head">
        <div className="row"><button className="x" onClick={onClose}><Icon n="x" s={18} /></button><span className="formname">Filed record</span><span style={{ width: 34 }} /></div>
        <div className="sectitle">{schema.name}</div>
      </div>
      <div className="wiz-body"><PdfPreview schema={schema} values={sub.values} score={sub.score} /></div>
      <div className="wiz-foot"><button className="btn btn-primary btn-block" onClick={onClose}>Done</button></div>
    </div>
  );
}

function DoneScreen({ schema, client, onClose, onViewRecords }) {
  return (
    <div className="done">
      <div className="badge-ok"><Icon n="check" s={38} sw={2.6} /></div>
      <h3>Form submitted</h3>
      <p>{schema.name}{client ? " for " + client.name : ""} has been filed with its signed PDF.</p>
      <div className="filed"><Icon n="lock" s={12} style={{ verticalAlign: "-2px", marginRight: 5 }} />Audit event recorded</div>
      <div className="acts">
        <button className="btn btn-primary btn-block" onClick={onViewRecords}>View my records</button>
        <button className="btn btn-ghost btn-block" onClick={onClose} style={{ flex: 1 }}>Back to today</button>
      </div>
    </div>
  );
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#3a8a5e",
  "autofill": true,
  "density": "regular"
}/*EDITMODE-END*/;

/* ===================== Caregiver root ===================== */
function CaregiverApp({ embedded }) {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tab, setTab] = useState("today");
  const [wizard, setWizard] = useState(null);
  const [submissions, setSubmissions] = useState(() => mySubs());
  const [done, setDone] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [toast, setToast] = useState(null);

  function mySubs() { return Store.getSubmissions().filter((s) => s.caregiverId === D.currentUser.id); }

  useEffect(() => Store.subscribe(() => setSubmissions(mySubs())), []);

  useEffect(() => {
    if (embedded) return;
    const root = document.documentElement.style;
    root.setProperty("--accent", t.accent);
    root.setProperty("--density", t.density === "compact" ? "0.78" : t.density === "comfy" ? "1.25" : "1");
  }, [t.accent, t.density, embedded]);

  const startForm = (schemaKey, client) => setWizard({ schemaKey, client });

  const submit = ({ schema, values, score, client }) => {
    const sub = {
      id: "sub_" + Date.now(), schemaKey: schema.key, templateVersion: schema.version,
      clientId: client ? client.id : null, clientName: client ? client.name : null,
      caregiverId: D.currentUser.id, caregiverName: D.currentUser.label,
      values, score, status: "submitted", submittedAt: new Date().toISOString(),
    };
    Store.addSubmission(sub);
    setWizard(null);
    setDone({ schema, client });
  };

  return (
    <div className="screen">
      <StatusBar />
      {tab === "today" && <TodayTab onStart={startForm} submissions={submissions} />}
      {tab === "forms" && <FormsTab onStart={startForm} />}
      {tab === "records" && <RecordsTab submissions={submissions} onOpen={(s) => setViewing(s)} />}
      {tab === "clients" && <ClientsTab />}
      <TabBar tab={tab} setTab={setTab} />
      {wizard ? <Wizard schemaKey={wizard.schemaKey} initialClient={wizard.client} autoApply={t.autofill} onClose={() => setWizard(null)} onSubmit={submit} /> : null}
      {done ? <DoneScreen schema={done.schema} client={done.client} onClose={() => { setDone(null); setTab("today"); }} onViewRecords={() => { setDone(null); setTab("records"); }} /> : null}
      {viewing ? <RecordViewer sub={viewing} onClose={() => setViewing(null)} /> : null}
      <Toast msg={toast} />
      {!embedded ? (
        <TweaksPanel>
          <TweakSection label="Brand" />
          <TweakColor label="Accent" value={t.accent} options={["#3a8a5e", "#0d8a8a", "#3a6ea5", "#6a5acd", "#b4683a"]} onChange={(v) => setTweak("accent", v)} />
          <TweakSection label="Behavior" />
          <TweakToggle label="Auto-apply safe autofill" value={t.autofill} onChange={(v) => setTweak("autofill", v)} />
          <TweakRadio label="Density" value={t.density} options={["compact", "regular", "comfy"]} onChange={(v) => setTweak("density", v)} />
        </TweaksPanel>
      ) : null}
    </div>
  );
}

window.DTCCaregiver = { CaregiverApp, PdfPreview, ScoreBlock, RecordViewer, displayValue, fmtDate, getSchema };

if (!window.__DTC_EMBED) {
  ReactDOM.createRoot(document.getElementById("root")).render(<CaregiverApp />);
}
