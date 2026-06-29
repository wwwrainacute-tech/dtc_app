// Caregiver views: today, available forms, the wizard, submissions, clients.
// The wizard works against whatever template is active and supports:
//   text/date/textarea/radio (scored)/computed/table/signature
// Signatures use a real canvas drawing pad.

function CaregiverToday() {
  const { setView, state, currentUser } = useApp();
  const { templates, submissions } = state;

  return (
    <div className="content narrow">
      <div className="page-header">
        <div>
          <h1 className="page-title">My day</h1>
          <p className="page-sub">{formatToday()} · signed in as {currentUser?.label}</p>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="clock" /> Clock in</button>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <StatCard label="Available forms"  value={String(templates.length)}    delta={templates.length ? "Ready to fill" : "Waiting on admin"} />
        <StatCard label="Submitted"        value={String(submissions.length)}  delta="This session" />
        <StatCard label="Clients on roster" value={String(state.clients.length)} delta={state.clients.length ? "On record" : "None yet"} />
      </div>

      {templates.length === 0 ? (
        <EmptyCard
          icon="doc"
          title="No forms available yet"
          body="Your admin hasn't published any templates. Switch to the Admin role in the sidebar to upload a reference PDF and walk through publishing one."
          action={{ label: "Open admin upload", onClick: () => { /* leave nav to user */ } }}
        />
      ) : (
        <div className="card">
          <div className="card-h">
            <div className="title">Start a form</div>
            <div className="sub">Pick a published template</div>
            <div className="right"><button className="btn ghost sm" onClick={() => setView("cg/forms")}>All forms <Icon name="chevronR" size={12} /></button></div>
          </div>
          <div style={{ padding: "4px 6px 8px" }}>
            {templates.slice(0, 4).map(t => (
              <FormChooser key={t.id} template={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatToday() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function FormChooser({ template }) {
  const { setView, actions, state } = useApp();
  return (
    <div className="row" style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", gap: 12 }}>
      <div className="field-type" style={{ width: 36, height: 36 }}><Icon name="doc" size={16} /></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500 }}>{template.name}</div>
        <div className="muted" style={{ fontSize: 12 }}>{template.sections.length} sections · {template.sections.reduce((n, s) => n + s.fields.length, 0)} fields</div>
      </div>
      <button className="btn accent sm" onClick={() => { actions.setDraftTemplate(template); setView("cg/wizard"); }}>
        Start <Icon name="chevronR" size={12} />
      </button>
    </div>
  );
}

function CaregiverForms() {
  const { state } = useApp();
  const { templates } = state;
  if (templates.length === 0) {
    return (
      <div className="content narrow">
        <div className="page-header"><div><h1 className="page-title">Available forms</h1><p className="page-sub">Templates your admin has published</p></div></div>
        <EmptyCard icon="doc" title="No forms available" body="Once an admin publishes a template, it will appear here for you to fill out." />
      </div>
    );
  }
  return (
    <div className="content narrow">
      <div className="page-header"><div><h1 className="page-title">Available forms</h1><p className="page-sub">{templates.length} published template{templates.length === 1 ? "" : "s"}</p></div></div>
      <div className="card card-tight">
        {templates.map((t, i) => (
          <div key={t.id} style={{ borderBottom: i < templates.length - 1 ? "1px solid var(--border)" : "0" }}>
            <FormChooser template={t} />
          </div>
        ))}
      </div>
    </div>
  );
}

function CaregiverSubmissions() {
  const { state } = useApp();
  const D = state.submissions;
  if (D.length === 0) {
    return (
      <div className="content narrow">
        <div className="page-header"><div><h1 className="page-title">My submissions</h1><p className="page-sub">Forms you've completed</p></div></div>
        <EmptyCard icon="records" title="No submissions yet" body="Complete a form and it'll show up here with its generated PDF." />
      </div>
    );
  }
  return (
    <div className="content narrow">
      <div className="page-header"><div><h1 className="page-title">My submissions</h1><p className="page-sub">{D.length} submission{D.length === 1 ? "" : "s"}</p></div></div>
      <div className="card card-tight">
        <table className="tbl">
          <thead><tr><th>Form</th><th>Client</th><th>Submitted</th><th></th></tr></thead>
          <tbody>
            {D.map(s => (
              <tr className="row" key={s.id}>
                <td style={{ fontWeight: 500 }}>{s.templateName}</td>
                <td>{s.clientName}</td>
                <td className="muted">{relTime(s.submittedAt)}</td>
                <td className="right"><button className="btn ghost sm"><Icon name="pdf" size={12} /> PDF</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CaregiverClients() {
  const { state } = useApp();
  const D = state.clients;
  if (D.length === 0) {
    return (
      <div className="content narrow">
        <div className="page-header"><div><h1 className="page-title">My clients</h1><p className="page-sub">Clients you're assigned to</p></div></div>
        <EmptyCard icon="client" title="No clients on your roster" body="When an admin adds clients and assigns them to you, they'll appear here." />
      </div>
    );
  }
  return (
    <div className="content narrow">
      <div className="page-header"><div><h1 className="page-title">My clients</h1><p className="page-sub">{D.length} client{D.length === 1 ? "" : "s"}</p></div></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {D.map(c => (
          <div className="card" key={c.id} style={{ padding: 16 }}>
            <div className="row" style={{ gap: 12 }}>
              <div className="role-avatar" style={{ width: 42, height: 42, fontSize: 14, background: "var(--bg-2)", color: "var(--text)" }}>{c.initials}</div>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{c.name}</div>{c.dob && <div className="muted" style={{ fontSize: 12 }}>DOB {c.dob}</div>}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   Wizard
   ========================================================= */
function CaregiverWizard() {
  const { setView, state, actions, currentUser } = useApp();
  const tpl = state.draftTemplate || state.templates[0];

  if (!tpl) {
    return (
      <div className="content narrow">
        <EmptyCard icon="doc" title="No template open" body="Choose a published form to fill out." action={{ label: "View available forms", onClick: () => setView("cg/forms") }} />
      </div>
    );
  }

  if (state.clients.length === 0) {
    return (
      <div className="content narrow">
        <EmptyCard icon="client" title="Add a client first" body="Forms in Dare to Care are always filled out for a specific client. Add one to continue." action={{ label: "Add a client", onClick: () => setView("admin/clients") }} />
      </div>
    );
  }

  return <WizardInner key={tpl.id || tpl.key} tpl={tpl} clients={state.clients} currentUser={currentUser} actions={actions} setView={setView} />;
}

function WizardInner({ tpl, clients, currentUser, actions, setView }) {
  const sections = tpl.sections;
  const [step, setStep] = useState(0); // 0 = pick client; 1..N = sections; N+1 = review; N+2 = pdf preview
  const totalSteps = sections.length + 3;
  const [client, setClient] = useState(null);
  const [values, setValues] = useState({});
  const [suggState, setSuggState] = useState({});

  // When a client is picked, initialize pending autofill suggestions.
  useEffect(() => {
    if (!client) return;
    const init = {};
    for (const s of sections) for (const f of s.fields) {
      if (f.autofill) init[f.id] = "pending";
    }
    setSuggState(init);
  }, [client?.id]); // re-init when client changes

  const allFields = sections.flatMap(s => s.fields);
  const setValue = (fid, v) => setValues(p => ({ ...p, [fid]: v }));

  // Resolve autofill value given the picked client + current user.
  const resolveSugg = (field) => {
    return window.resolveAutofill(field, { client, currentUser });
  };

  const acceptSuggestion = (fid) => {
    const f = allFields.find(x => x.id === fid);
    const v = resolveSugg(f);
    if (v == null) return;
    setValues(p => ({ ...p, [fid]: v }));
    setSuggState(p => ({ ...p, [fid]: "accepted" }));
  };
  const rejectSuggestion = (fid) => setSuggState(p => ({ ...p, [fid]: "rejected" }));
  const acceptAllSafe = () => {
    const accepted = { ...values }; const newSugg = { ...suggState };
    for (const f of allFields) {
      if (f.autofill?.safe && suggState[f.id] === "pending") {
        const v = resolveSugg(f);
        if (v != null) { accepted[f.id] = v; newSugg[f.id] = "accepted"; }
      }
    }
    setValues(accepted); setSuggState(newSugg);
  };

  // Compute score & tier for scored forms
  const score = useMemo(() => {
    let s = 0;
    for (const f of allFields) {
      if (f.type === "radio" && Array.isArray(f.options) && typeof f.options[0] === "object") {
        const v = values[f.id];
        const opt = f.options.find(o => o.label === v);
        if (opt && typeof opt.score === "number") s += opt.score;
      }
    }
    return s;
  }, [values, allFields]);
  const hasScoring = allFields.some(f => f.type === "computed" && f.formula === "tier");
  const tier = score >= 45 ? { label: "High", color: "var(--danger)" } : score >= 25 ? { label: "Medium", color: "var(--warn)" } : { label: "Low", color: "var(--ok)" };

  const isPick = step === 0;
  const isSection = step >= 1 && step <= sections.length;
  const isReview = step === sections.length + 1;
  const isPreview = step === sections.length + 2;

  const onSubmit = () => {
    actions.addSubmission({
      templateId: tpl.id || "draft",
      templateName: tpl.name,
      schemaKey: tpl.key,
      clientId: client.id,
      clientName: client.name,
      caregiver: currentUser?.label || "Caregiver",
      values,
      score: hasScoring ? score : null,
      tier: hasScoring ? tier.label : null,
    });
    setView("cg/submissions");
  };

  return (
    <div className="content narrow" style={{ paddingBottom: 32 }}>
      <WizardHeader
        step={step}
        sections={sections}
        onExit={() => setView("cg/forms")}
        title={tpl.name}
        client={client}
      />

      {isPick && (
        <ClientPicker clients={clients} selected={client} onPick={(c) => { setClient(c); setStep(1); }} />
      )}

      {isSection && (
        <WizardSection
          section={sections[step - 1]}
          values={values}
          setValue={setValue}
          suggState={suggState}
          acceptSuggestion={acceptSuggestion}
          rejectSuggestion={rejectSuggestion}
          acceptAllSafe={acceptAllSafe}
          resolveSugg={resolveSugg}
          score={score}
          tier={tier}
          hasScoring={hasScoring}
          client={client}
        />
      )}

      {isReview && (
        <WizardReview
          sections={sections}
          values={values}
          suggState={suggState}
          score={score}
          tier={tier}
          hasScoring={hasScoring}
          client={client}
          onEdit={(sectionIdx) => setStep(sectionIdx + 1)}
        />
      )}

      {isPreview && (
        <WizardPdfPreview tpl={tpl} client={client} values={values} sections={sections} score={score} tier={tier} hasScoring={hasScoring} />
      )}

      <WizardFooter
        step={step}
        totalSteps={totalSteps}
        canAdvance={!isPick || !!client}
        onBack={() => setStep(s => Math.max(0, s - 1))}
        onNext={() => setStep(s => Math.min(totalSteps - 1, s + 1))}
        onSubmit={onSubmit}
      />
    </div>
  );
}

function WizardHeader({ step, sections, onExit, title, client }) {
  const labels = ["Pick client", ...sections.map(s => s.title), "Review", "Preview & sign"];
  return (
    <div style={{ marginBottom: 18 }}>
      <div className="row" style={{ marginBottom: 14 }}>
        <button className="btn ghost sm" onClick={onExit}><Icon name="back" size={12} /> Exit</button>
        <div className="spacer"></div>
        <span className="muted" style={{ fontSize: 12 }}>{title}{client && step > 0 ? ` · ${client.name}` : ""}</span>
      </div>
      <div className="wizard-progress">
        {labels.map((l, i) => (
          <div key={i} className={"wiz-step" + (i < step ? " done" : "") + (i === step ? " current" : "")}>
            <div className="wiz-dot">{i < step ? <Icon name="check" size={10} /> : i + 1}</div>
            <span className="wiz-label">{l}</span>
            {i < labels.length - 1 && <div className="wiz-bar"></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function WizardFooter({ step, totalSteps, canAdvance, onBack, onNext, onSubmit }) {
  const isPreview = step === totalSteps - 1;
  const isReview = step === totalSteps - 2;
  const nextLabel = isReview ? "Preview branded PDF" : isPreview ? "Submit & file PDF" : "Continue";
  return (
    <div className="wizard-footer">
      <button className="btn" onClick={onBack} disabled={step === 0}><Icon name="chevronL" size={12} /> Back</button>
      <div className="spacer"></div>
      {!isPreview && <button className="btn ghost"><Icon name="save" /> Save draft</button>}
      {isPreview ? (
        <button className="btn accent" onClick={onSubmit}><Icon name="send" /> {nextLabel}</button>
      ) : (
        <button className="btn accent" disabled={!canAdvance} onClick={onNext}>{nextLabel} <Icon name="chevronR" size={12} /></button>
      )}
    </div>
  );
}

function ClientPicker({ clients, selected, onPick }) {
  return (
    <div className="card">
      <div className="card-h">
        <div className="title">Who is this form for?</div>
        <div className="sub">Pick a client. Their profile data becomes available as audited autofill suggestions in the next steps.</div>
      </div>
      <div style={{ padding: 12 }}>
        {clients.map(c => (
          <div key={c.id} className={"client-pick" + (selected?.id === c.id ? " selected" : "")} onClick={() => onPick(c)}>
            <div className="role-avatar" style={{ width: 38, height: 38, fontSize: 13, background: "var(--bg-2)", color: "var(--text)" }}>{c.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{c.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>{c.dob && `DOB ${c.dob}`}{c.mrn && ` · ${c.mrn}`}</div>
            </div>
            <Icon name={selected?.id === c.id ? "check" : "chevronR"} size={14} className="muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

function WizardSection({ section, values, setValue, suggState, acceptSuggestion, rejectSuggestion, acceptAllSafe, resolveSugg, score, tier, hasScoring, client }) {
  const pendingCount = section.fields.filter(f => f.autofill && suggState[f.id] === "pending" && resolveSugg(f) != null).length;
  return (
    <>
      {pendingCount > 0 && (
        <div className="autofill-banner">
          <div className="row" style={{ gap: 10 }}>
            <span className="pulse-dot"></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{pendingCount} autofill suggestion{pendingCount > 1 ? "s" : ""} available</div>
              <div className="muted" style={{ fontSize: 12 }}>From <b style={{ color: "var(--text-2)" }}>{client.name}'s</b> profile and today's date. Review each before accepting.</div>
            </div>
            <button className="btn sm" onClick={acceptAllSafe}><Icon name="check" size={12} /> Accept all safe</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-h">
          <div className="title">{section.title}</div>
          <div className="sub">{section.fields.length} fields</div>
          {hasScoring && section.fields.some(f => f.type === "computed") && (
            <div className="right row" style={{ gap: 10 }}>
              <span className="muted" style={{ fontSize: 12 }}>Running total</span>
              <span className="badge accent dot" style={{ fontSize: 12, padding: "2px 10px" }}>Score {score}</span>
              <span className="badge dot" style={{ fontSize: 12, padding: "2px 10px", background: "color-mix(in oklch, " + tier.color + " 15%, transparent)", color: tier.color, borderColor: "transparent" }}>{tier.label} risk</span>
            </div>
          )}
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {section.fields.map(f => (
            <WizardField
              key={f.id}
              field={f}
              value={values[f.id]}
              onChange={(v) => setValue(f.id, v)}
              suggestion={f.autofill ? { ...f.autofill, value: resolveSugg(f) } : null}
              suggestionState={suggState[f.id]}
              onAccept={() => acceptSuggestion(f.id)}
              onReject={() => rejectSuggestion(f.id)}
              computedValue={f.type === "computed" ? (f.formula === "sum" ? String(score) : tier.label + " risk") : undefined}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function WizardField({ field, value, onChange, suggestion, suggestionState, onAccept, onReject, computedValue }) {
  const hasSugg = suggestion && suggestion.value != null;
  const sState = suggestionState;
  const showSugg = hasSugg && sState === "pending";
  const showAccepted = hasSugg && sState === "accepted";

  return (
    <div className="wf">
      <div className="wf-head">
        <div className="wf-label">
          {field.label}
          {field.required && <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>}
        </div>
        {field.semantic && <span className="tag mono">{field.semantic}</span>}
      </div>

      {showSugg && (
        <div className="sugg-card">
          <div className="sugg-head">
            <Icon name="ai" size={12} style={{ color: "var(--ai)" }} />
            <span className="sugg-source">Suggested · <span className="muted">{suggestion.source}</span></span>
            <span className="spacer"></span>
            <span className="badge ai sm">conf {suggestion.confidence.toFixed(2)}</span>
          </div>
          <div className="sugg-row">
            <div className="sugg-value">{formatValue(field, suggestion.value)}</div>
            <div className="sugg-actions">
              <button className="btn ghost sm" onClick={onReject}><Icon name="x" size={12} /> Reject</button>
              <button className="btn accent sm" onClick={onAccept}><Icon name="check" size={12} /> Accept</button>
            </div>
          </div>
        </div>
      )}

      {showAccepted && (
        <div className="sugg-accepted">
          <Icon name="check" size={12} /> Autofilled from {suggestion.source}
          <span className="spacer"></span>
          <button className="btn ghost sm" onClick={onReject}>Edit manually</button>
        </div>
      )}

      <FieldControl field={field} value={value} onChange={onChange} computedValue={computedValue} />
    </div>
  );
}

function FieldControl({ field, value, onChange, computedValue }) {
  if (field.type === "text") {
    return <input className="input" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder || ""} />;
  }
  if (field.type === "date") {
    return <input className="input" type="date" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  }
  if (field.type === "textarea") {
    return <textarea className="textarea" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="Notes…" />;
  }
  if (field.type === "radio" && Array.isArray(field.options)) {
    return (
      <div className="opt-list">
        {field.options.map((o, i) => {
          const opt = typeof o === "object" ? o : { label: o };
          const isObj = typeof o === "object";
          const checked = value === opt.label;
          return (
            <div key={i} className={"opt" + (checked ? " checked" : "")} onClick={() => onChange(opt.label)}>
              <div className={"radio" + (checked ? " checked" : "")}></div>
              <span style={{ flex: 1, fontWeight: checked ? 500 : 400 }}>{opt.label}</span>
              {isObj && typeof opt.score === "number" && <span className="opt-score mono">+{opt.score}</span>}
            </div>
          );
        })}
      </div>
    );
  }
  if (field.type === "signature") {
    return <SignaturePad value={value} onChange={onChange} />;
  }
  if (field.type === "computed") {
    return (
      <div className="input" style={{ background: "var(--bg-2)", color: "var(--text-2)", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="sigma" size={12} style={{ color: "var(--text-3)" }} />
        <span>{computedValue ?? "—"}</span>
        <span className="spacer"></span>
        <span className="muted" style={{ fontSize: 11 }}>Computed · cannot be edited</span>
      </div>
    );
  }
  if (field.type === "table" && field.columns) {
    return <FieldTable field={field} value={value} onChange={onChange} />;
  }
  if (field.type === "select" && Array.isArray(field.options)) {
    return (
      <select className="select" value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  return <input className="input" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
}

/* ---- Table field — preserves the tabular structure from the source ---- */
function FieldTable({ field, value, onChange }) {
  const rows = value || field.rows || [];
  const update = (next) => onChange(next);

  const addRow = () => {
    const empty = {};
    field.columns.forEach(c => { empty[c.id] = ""; });
    update([...rows, empty]);
  };
  const removeRow = (i) => update(rows.filter((_, j) => j !== i));
  const editCell = (i, colId, v) => update(rows.map((r, j) => j === i ? { ...r, [colId]: v } : r));

  const totalW = field.columns.reduce((s, c) => s + (c.width || 1), 0);

  return (
    <div className="ftable">
      <div className="ftable-head">
        <div className="ftable-row-handle"></div>
        {field.columns.map(c => (
          <div key={c.id} className="ftable-th" style={{ flex: c.width || 1 }}>{c.label}</div>
        ))}
        <div className="ftable-actions"></div>
      </div>
      {rows.length === 0 ? (
        <div className="ftable-empty">
          <span className="muted" style={{ fontSize: 12 }}>No rows yet — add one to start.</span>
        </div>
      ) : (
        rows.map((r, i) => (
          <div className="ftable-row" key={i}>
            <div className="ftable-row-handle mono">{i + 1}</div>
            {field.columns.map(c => (
              <div key={c.id} className="ftable-cell" style={{ flex: c.width || 1 }}>
                {c.type === "select" ? (
                  <select className="ftable-input" value={r[c.id] || ""} onChange={(e) => editCell(i, c.id, e.target.value)}>
                    <option value="">—</option>
                    {(c.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input className="ftable-input" value={r[c.id] || ""} onChange={(e) => editCell(i, c.id, e.target.value)} placeholder={c.label} />
                )}
              </div>
            ))}
            <div className="ftable-actions">
              <button className="icon-btn" onClick={() => removeRow(i)} title="Remove row"><Icon name="trash" size={12} /></button>
            </div>
          </div>
        ))
      )}
      <div className="ftable-foot">
        <button className="btn ghost sm" onClick={addRow}><Icon name="plus" size={12} /> Add row</button>
        <span className="muted" style={{ fontSize: 11.5, marginLeft: 10 }}>{rows.length} row{rows.length === 1 ? "" : "s"}</span>
        <div className="spacer"></div>
        <span className="badge ai sm">Structure preserved · {field.columns.length} cols</span>
      </div>
    </div>
  );
}

/* ---- Real signature pad on a canvas ---- */
function SignaturePad({ value, onChange }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasInk, setHasInk] = useState(!!value);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    const ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "oklch(22% 0.015 255)";
    // If we have a saved data URL, paint it.
    if (value && value.startsWith("data:image")) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = value;
      setHasInk(true);
    }
  }, []);

  const pos = (e) => {
    const c = canvasRef.current;
    const rect = c.getBoundingClientRect();
    const pt = e.touches ? e.touches[0] : e;
    return { x: pt.clientX - rect.left, y: pt.clientY - rect.top };
  };
  const start = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = pos(e);
    ctx.beginPath(); ctx.moveTo(x, y);
    setDrawing(true);
  };
  const move = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = pos(e);
    ctx.lineTo(x, y); ctx.stroke();
    setHasInk(true);
  };
  const end = () => {
    if (!drawing) return;
    setDrawing(false);
    const url = canvasRef.current.toDataURL("image/png");
    onChange(url);
  };

  const clear = () => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
    onChange("");
  };

  return (
    <div className="signature-wrap">
      <canvas ref={canvasRef}
        className="signature-canvas"
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
      {!hasInk && (
        <div className="signature-hint">
          <Icon name="signature" size={16} />
          <span>Sign with mouse or finger</span>
        </div>
      )}
      <div className="signature-bar">
        <span className="muted" style={{ fontSize: 11 }}>Capture is locked once you submit.</span>
        <span className="spacer"></span>
        <button className="btn ghost sm" onClick={clear} disabled={!hasInk}><Icon name="x" size={11} /> Clear</button>
      </div>
    </div>
  );
}

function formatValue(field, v) {
  if (!v) return "";
  if (field.type === "date") {
    const d = new Date(v + "T00:00:00");
    if (!isNaN(d)) return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  if (field.type === "signature" && typeof v === "string" && v.startsWith("data:image")) {
    return <img src={v} alt="signature" style={{ height: 28, verticalAlign: "middle" }} />;
  }
  return v;
}

function WizardReview({ sections, values, suggState, score, tier, hasScoring, client, onEdit }) {
  const missing = [];
  for (const s of sections) for (const f of s.fields) {
    const v = values[f.id];
    const isEmpty = v == null || v === "" || (Array.isArray(v) && v.length === 0);
    if (f.required && isEmpty && f.type !== "computed") missing.push(f);
  }
  return (
    <div className="card">
      <div className="card-h">
        <Icon name="check" size={14} style={{ color: "var(--ok)" }} />
        <div className="title">Review answers</div>
        <div className="sub">Nothing is submitted yet. Confirm everything is correct.</div>
        {hasScoring && (
          <div className="right">
            <span className="badge accent dot">Score {score}</span>
            <span className="badge dot" style={{ background: "color-mix(in oklch, " + tier.color + " 15%, transparent)", color: tier.color, borderColor: "transparent" }}>{tier.label} risk</span>
          </div>
        )}
      </div>
      {missing.length > 0 && (
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", background: "var(--warn-soft)", color: "oklch(40% 0.13 75)", display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="warn" size={14} />
          <b style={{ fontSize: 13 }}>{missing.length} required field{missing.length > 1 ? "s" : ""} missing.</b>
          <span style={{ fontSize: 12.5 }}>Fill them before submitting.</span>
        </div>
      )}
      <div style={{ padding: "6px 0" }}>
        {sections.map((s, i) => (
          <div key={s.id} style={{ borderBottom: i < sections.length - 1 ? "1px solid var(--border)" : "0", padding: "14px 18px" }}>
            <div className="row" style={{ marginBottom: 10 }}>
              <span className="section-index mono">S{i + 1}</span>
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>{s.title}</span>
              <div className="spacer"></div>
              <button className="btn ghost sm" onClick={() => onEdit(i)}>Edit</button>
            </div>
            <div className="review-grid">
              {s.fields.map(f => {
                let v = values[f.id];
                if (f.type === "computed") v = f.formula === "sum" ? String(score) : tier.label + " risk";
                const isEmpty = v == null || v === "" || (Array.isArray(v) && v.length === 0);
                const isMissing = f.required && isEmpty && f.type !== "computed";
                return (
                  <div key={f.id} className={"review-row" + (isMissing ? " missing" : "")}>
                    <div className="review-label">
                      <span>{f.label}</span>
                      {f.semantic && <span className="tag mono">{f.semantic}</span>}
                    </div>
                    <div className="review-value">
                      {isMissing ? <span style={{ color: "var(--danger)", fontWeight: 500 }}>Required — not filled</span> :
                        f.type === "table" ? <ReviewTable rows={v || []} columns={f.columns} /> :
                          (v != null && v !== "" ? formatValue(f, v) : <span className="muted">—</span>)
                      }
                      {suggState[f.id] === "accepted" && (
                        <span className="badge ai sm" style={{ marginLeft: 8 }}>
                          <Icon name="ai" size={10} /> from {f.autofill.source}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewTable({ rows, columns }) {
  if (!rows.length) return <span className="muted">— empty —</span>;
  return (
    <div className="review-table">
      <table>
        <thead><tr>{columns.map(c => <th key={c.id}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{columns.map(c => <td key={c.id}>{r[c.id] || <span className="muted">—</span>}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WizardPdfPreview({ tpl, client, values, sections, score, tier, hasScoring }) {
  return (
    <div className="card">
      <div className="card-h">
        <Icon name="pdf" size={14} style={{ color: "var(--danger)" }} />
        <div className="title">Branded PDF preview</div>
        <div className="sub">This document will be generated and stored on submit.</div>
        <div className="right">
          <button className="btn ghost sm"><Icon name="download" size={12} /> Download</button>
          <button className="btn ghost sm"><Icon name="print" size={12} /> Print</button>
        </div>
      </div>
      <div className="branded-pdf-stage">
        <div className="branded-pdf">
          {tpl.key === "medicationList" ? (
            <BrandedPdfMedication client={client} values={values} sections={sections} />
          ) : (
            <BrandedPdfFallRisk client={client} values={values} sections={sections} score={score} tier={tier} hasScoring={hasScoring} />
          )}
        </div>
      </div>
    </div>
  );
}

function BrandedPdfHeader({ kicker, title, sub, ref }) {
  return (
    <div className="bp-header">
      <div className="bp-logo"><img src="assets/logo.png" alt="Dare to Care" /></div>
      <div className="bp-header-text">
        <div className="bp-doc-kicker">{kicker}</div>
        <div className="bp-doc-title">{title}</div>
        <div className="bp-doc-sub">{sub}</div>
      </div>
      <div className="bp-header-meta">
        <div><span>Reference</span><b className="mono">{ref}</b></div>
        <div><span>Issued</span><b>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</b></div>
      </div>
    </div>
  );
}

function BrandedPdfFooter() {
  return (
    <div className="bp-footer">
      <div>Dare to Care Home Care · daretocare.io</div>
      <div className="bp-footer-meta">
        <span>Generated by Dare to Care Forms</span><span>·</span>
        <span>HIPAA-compliant record</span><span>·</span>
        <span className="mono">page 1 of 1</span>
      </div>
    </div>
  );
}

function BrandedPdfClient({ values, fields, ids }) {
  // ids: [nameId, dobId, mrnOrPhysId, dateId]
  const get = (id) => values[id] || "—";
  const labels = ids[2].startsWith("mf") ? ["Client", "Date of birth", "Primary physician", "Review date"]
                                          : ["Client", "Date of birth", "MRN", "Assessment date"];
  return (
    <div className="bp-client">
      <div className="bp-kv"><span>{labels[0]}</span><b>{get(ids[0])}</b></div>
      <div className="bp-kv"><span>{labels[1]}</span><b>{formatValue({ type: "date" }, get(ids[1]))}</b></div>
      <div className="bp-kv"><span>{labels[2]}</span><b>{get(ids[2])}</b></div>
      <div className="bp-kv"><span>{labels[3]}</span><b>{formatValue({ type: "date" }, get(ids[3]))}</b></div>
    </div>
  );
}

function BrandedPdfFallRisk({ client, values, sections, score, tier, hasScoring }) {
  const get = (id) => values[id] || "—";
  return (
    <div className="bp-doc">
      <BrandedPdfHeader
        kicker="Clinical Assessment · Form 04-A"
        title="Fall Risk Assessment"
        sub="Morse Fall Scale — completed digitally via Dare to Care Forms"
        ref={"DTC-FRA-" + Math.floor(Math.random() * 9000 + 1000)}
      />
      <BrandedPdfClient values={values} fields={sections[0].fields} ids={["f1", "f2", "f3", "f4"]} />

      <div className="bp-section">
        <div className="bp-section-h">History</div>
        <BpScored label="History of falling (within 3 months)" v={get("f5")} options={sections[1].fields[0].options} />
        <BpScored label="Secondary diagnosis"                  v={get("f6")} options={sections[1].fields[1].options} />
      </div>
      <div className="bp-section">
        <div className="bp-section-h">Ambulatory aid &amp; gait</div>
        <BpScored label="Ambulatory aid"      v={get("f7")}  options={sections[2].fields[0].options} />
        <BpScored label="IV / heparin lock"   v={get("f8")}  options={sections[2].fields[1].options} />
        <BpScored label="Gait / transferring" v={get("f9")}  options={sections[2].fields[2].options} />
        <BpScored label="Mental status"       v={get("f10")} options={sections[2].fields[3].options} />
      </div>
      <div className="bp-section">
        <div className="bp-section-h">Score &amp; plan</div>
        <div className="bp-score-card">
          <div className="bp-score-cell">
            <span>Total score</span>
            <b style={{ fontSize: 30, fontVariantNumeric: "tabular-nums" }}>{score}</b>
            <span className="muted" style={{ fontSize: 9 }}>sum of weighted answers</span>
          </div>
          <div className="bp-score-cell">
            <span>Risk level</span>
            <b style={{ color: tier.color, fontSize: 18 }}>{hasScoring ? tier.label : "—"}</b>
            <span className="muted" style={{ fontSize: 9 }}>Low &lt;25 · Med 25–44 · High ≥45</span>
          </div>
          <div className="bp-score-cell wide">
            <span>Interventions / notes</span>
            <div className="bp-notes">{get("f13") !== "—" ? get("f13") : <span className="muted">— none recorded —</span>}</div>
          </div>
        </div>
      </div>
      <div className="bp-signs">
        <div className="bp-sign">
          <div className="bp-sign-line">
            {get("f14") !== "—" && typeof values.f14 === "string" && values.f14.startsWith("data:image")
              ? <img src={values.f14} alt="signature" style={{ height: 32 }} />
              : <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 18 }}>{get("f14")}</span>}
          </div>
          <div className="bp-sign-label">Assessor signature</div>
        </div>
        <div className="bp-sign small">
          <div className="bp-sign-line">{formatValue({ type: "date" }, get("f15"))}</div>
          <div className="bp-sign-label">Signature date</div>
        </div>
      </div>
      <BrandedPdfFooter />
    </div>
  );
}

function BpScored({ label, v, options }) {
  return (
    <div className="bp-scored">
      <div className="bp-scored-label">{label}</div>
      <div className="bp-scored-opts">
        {options.map((o, i) => {
          const opt = typeof o === "object" ? o : { label: o };
          const sel = v === opt.label;
          return (
            <span key={i} className={"bp-opt" + (sel ? " sel" : "")}>
              <span className={"bp-box" + (sel ? " sel" : "")}>{sel ? "✓" : ""}</span>
              <span>{opt.label}</span>
              {typeof o === "object" && typeof opt.score === "number" && <span className="bp-pts">{opt.score}</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function BrandedPdfMedication({ client, values, sections }) {
  const get = (id) => values[id] || "—";
  const rows = values.mf5 || [];
  const cols = sections[1].fields[0].columns;
  return (
    <div className="bp-doc">
      <BrandedPdfHeader
        kicker="Clinical Record · Form 11-C"
        title="Medication List"
        sub="Active regimen — completed digitally via Dare to Care Forms"
        ref={"DTC-MED-" + Math.floor(Math.random() * 9000 + 1000)}
      />
      <BrandedPdfClient values={values} fields={sections[0].fields} ids={["mf1", "mf2", "mf3", "mf4"]} />

      <div className="bp-section">
        <div className="bp-section-h">Active medications</div>
        {rows.length === 0 ? (
          <div className="muted" style={{ fontFamily: "var(--font-sans)", fontSize: 10, padding: "8px 0" }}>— no medications recorded —</div>
        ) : (
          <table className="bp-tbl">
            <thead><tr>{cols.map(c => <th key={c.id}>{c.label}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>{cols.map(c => <td key={c.id}>{r[c.id] || ""}</td>)}</tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bp-section">
        <div className="bp-section-h">Allergies &amp; verification</div>
        <div className="bp-allergy">
          <span className="bp-allergy-label">Known allergies</span>
          <div className="bp-notes">{get("mf6") !== "—" ? get("mf6") : <span className="muted">— none reported —</span>}</div>
        </div>
        <BpScored label="Reconciled with bottle counts" v={get("mf7")} options={sections[2].fields[1].options} />
      </div>

      <div className="bp-signs">
        <div className="bp-sign">
          <div className="bp-sign-line">
            {typeof values.mf8 === "string" && values.mf8.startsWith("data:image")
              ? <img src={values.mf8} alt="signature" style={{ height: 32 }} />
              : <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 18 }}>{get("mf8")}</span>}
          </div>
          <div className="bp-sign-label">Caregiver signature</div>
        </div>
        <div className="bp-sign small">
          <div className="bp-sign-line">{formatValue({ type: "date" }, get("mf9"))}</div>
          <div className="bp-sign-label">Signature date</div>
        </div>
      </div>

      <BrandedPdfFooter />
    </div>
  );
}

window.CaregiverToday = CaregiverToday;
window.CaregiverForms = CaregiverForms;
window.CaregiverSubmissions = CaregiverSubmissions;
window.CaregiverClients = CaregiverClients;
window.CaregiverWizard = CaregiverWizard;
