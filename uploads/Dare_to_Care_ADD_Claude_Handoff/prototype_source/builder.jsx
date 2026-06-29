// AI Form Builder — works on whatever draft template is in state.
// Left: rendered original PDF preview with detected-field overlays
// Right: AI interpretation panel + editable sections/fields + field inspector
//
// Supports: text, date, radio (with scoring), textarea, signature, computed, table.

function FormBuilder() {
  const { setView, toast, tweaks, state, actions } = useApp();
  const draft = state.draftTemplate;

  if (!draft) {
    return (
      <div className="content narrow">
        <EmptyCard
          icon="ai"
          title="No template draft open"
          body="Upload a reference PDF to draft a template — the AI will extract fields, sections, and the form's purpose."
          action={{ label: "Upload PDF", onClick: () => setView("admin/upload") }}
        />
      </div>
    );
  }

  return <BuilderEditor draft={draft} key={draft.key || draft.id} />;
}

function BuilderEditor({ draft }) {
  const { setView, toast, tweaks, actions } = useApp();
  const [sections, setSections] = useState(draft.sections);
  const [interp, setInterp] = useState({
    ...draft.interpretation,
    approved: draft.interpretationApproved || { purpose: false, audience: false, recordType: false, output: false },
  });
  const [selectedFieldId, setSelectedFieldId] = useState(sections[0]?.fields[0]?.id || null);
  const [showOverlays, setShowOverlays] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [hoverField, setHoverField] = useState(null);

  const selectedField = useMemo(() => {
    for (const s of sections) for (const f of s.fields) if (f.id === selectedFieldId) return { ...f, sectionId: s.id, sectionTitle: s.title };
    return null;
  }, [sections, selectedFieldId]);

  const fieldCount = sections.reduce((n, s) => n + s.fields.length, 0);
  const tableCount = sections.flatMap(s => s.fields).filter(f => f.type === "table").length;
  const sigCount   = sections.flatMap(s => s.fields).filter(f => f.type === "signature").length;
  const approvedCount = Object.values(interp.approved).filter(Boolean).length;
  const totalApprovals = Object.keys(interp.approved).length;

  const updateField = (id, patch) => {
    setSections(prev => prev.map(s => ({ ...s, fields: s.fields.map(f => f.id === id ? { ...f, ...patch } : f) })));
  };
  const deleteField = (id) => {
    setSections(prev => prev.map(s => ({ ...s, fields: s.fields.filter(f => f.id !== id) })));
    toast("Field removed");
  };
  const addField = (sectionId) => {
    const newId = "n" + Math.random().toString(36).slice(2, 6);
    setSections(prev => prev.map(s => s.id === sectionId
      ? { ...s, fields: [...s.fields, { id: newId, label: "New field", type: "text", required: false, ai: null }] }
      : s));
    setSelectedFieldId(newId);
  };
  const approveAll = () => {
    setInterp(p => ({ ...p, approved: { purpose: true, audience: true, recordType: true, output: true } }));
    toast("AI interpretation approved");
  };

  const onPublish = () => {
    if (approvedCount !== totalApprovals) return;
    actions.publishDraft({ ...draft, sections, interpretation: interp });
    setView("admin/templates");
  };
  const onSave = () => actions.saveDraft({ ...draft, sections, interpretation: interp });

  return (
    <div className="content wide" style={{ padding: "20px 24px 24px", maxWidth: "none" }}>
      <div className="builder-head">
        <div>
          <div className="row" style={{ gap: 8, marginBottom: 4 }}>
            <span className="badge ai dot">AI draft</span>
            <span className="badge outline mono">v{draft.version || 1} · {draft.status?.toUpperCase() || "DRAFT"}</span>
            <span className="muted" style={{ fontSize: 12 }}>From {draft.sourceFilename || "uploaded PDF"} · {draft.uploadedAt ? relTime(draft.uploadedAt) : "just now"}</span>
          </div>
          <h1 className="page-title">{draft.name}</h1>
          <p className="page-sub">
            {sections.length} sections · {fieldCount} fields
            {tableCount ? ` · ${tableCount} table${tableCount > 1 ? "s" : ""}` : ""}
            {sigCount ? ` · ${sigCount} signature${sigCount > 1 ? "s" : ""}` : ""} ·
            <span style={{ color: approvedCount === totalApprovals ? "var(--ok)" : "var(--warn)", fontWeight: 500 }}>
              {" "}{approvedCount}/{totalApprovals} interpretations approved
            </span>
          </p>
        </div>
        <div className="page-actions">
          <button className="btn ghost" onClick={() => setView("admin/templates")}><Icon name="back" /> Templates</button>
          <button className="btn" onClick={onSave}><Icon name="save" /> Save draft</button>
          <button className="btn accent" disabled={approvedCount !== totalApprovals} onClick={onPublish}>
            <Icon name="send" /> {approvedCount === totalApprovals ? "Publish template" : "Approve interpretation first"}
          </button>
        </div>
      </div>

      <div className="builder">
        <div className="builder-left card">
          <div className="card-h">
            <Icon name="pdf" size={14} />
            <div className="title">{draft.sourceFilename || "source.pdf"}</div>
            <div className="sub">Source · 1 page</div>
            <div className="right">
              <div className="segmented">
                <button className={showOverlays ? "active" : ""} onClick={() => setShowOverlays(true)}>Overlays</button>
                <button className={!showOverlays ? "active" : ""} onClick={() => setShowOverlays(false)}>Clean</button>
              </div>
              <button className="btn ghost sm" onClick={() => setZoom(z => Math.max(0.6, z - 0.1))}>−</button>
              <span className="mono" style={{ fontSize: 11, color: "var(--text-3)", minWidth: 36, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
              <button className="btn ghost sm" onClick={() => setZoom(z => Math.min(1.4, z + 0.1))}>+</button>
            </div>
          </div>
          <div className="pdf-stage">
            <div className="pdf-page" style={{ transform: `scale(${zoom})` }}>
              <PdfPreview
                schemaKey={draft.key}
                showOverlays={showOverlays}
                sections={sections}
                selectedFieldId={selectedFieldId}
                onSelect={setSelectedFieldId}
                hoverField={hoverField}
                setHoverField={setHoverField}
              />
            </div>
          </div>
        </div>

        <div className="builder-right">
          <AIInterpretation interp={interp} setInterp={setInterp} onApproveAll={approveAll} />

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-h">
              <Icon name="ai" size={14} style={{ color: "var(--ai)" }} />
              <div className="title">Detected sections & fields</div>
              <div className="sub">{fieldCount} fields · {sections.length} sections</div>
              <div className="right">
                <span className="badge ai dot">AI-extracted</span>
              </div>
            </div>
            <div style={{ padding: "8px 8px 12px" }}>
              {sections.map((sec, i) => (
                <SectionBlock
                  key={sec.id}
                  index={i}
                  section={sec}
                  selectedFieldId={selectedFieldId}
                  onSelect={setSelectedFieldId}
                  onHover={setHoverField}
                  onUpdateField={updateField}
                  onDeleteField={deleteField}
                  onAddField={addField}
                  showAi={tweaks.showAiHints}
                />
              ))}
              <div style={{ padding: "8px 14px" }}>
                <button className="btn ghost sm" onClick={() => {
                  const id = "ns" + Math.random().toString(36).slice(2, 5);
                  setSections(s => [...s, { id, title: "New section", fields: [] }]);
                }}>
                  <Icon name="plus" size={12} /> Add section
                </button>
              </div>
            </div>
          </div>

          {selectedField && (
            <FieldInspector
              field={selectedField}
              onUpdate={(patch) => updateField(selectedField.id, patch)}
              showAi={tweaks.showAiHints}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function AIInterpretation({ interp, setInterp, onApproveAll }) {
  const items = [
    { key: "purpose",     label: "Purpose",       icon: "sparkle", value: interp.purpose,    confidence: 0.92, multiline: true },
    { key: "audience",    label: "Completed by",  icon: "users",   value: (interp.audience || []).join(", "), confidence: 0.96, chips: true },
    { key: "recordType",  label: "Record type",   icon: "doc",     value: interp.recordType, confidence: 0.93 },
    { key: "output",      label: "Output PDF",    icon: "pdf",     value: interp.output,     confidence: 0.88 },
  ];

  return (
    <div className="card interp">
      <div className="card-h">
        <span className="pulse-dot"></span>
        <div className="title">AI interpretation</div>
        <div className="sub">Review &amp; approve before publish</div>
        <div className="right">
          <button className="btn ghost sm"><Icon name="refresh" size={12} /> Re-analyze</button>
          <button className="btn sm accent" onClick={onApproveAll}><Icon name="check" size={12} /> Approve all</button>
        </div>
      </div>
      <div className="interp-grid">
        {items.map(it => (
          <InterpRow
            key={it.key}
            item={it}
            approved={interp.approved[it.key]}
            onApprove={() => setInterp(p => ({ ...p, approved: { ...p.approved, [it.key]: !p.approved[it.key] } }))}
            onChange={(v) => setInterp(p => ({ ...p, [it.key]: it.chips ? v.split(",").map(s => s.trim()) : v }))}
          />
        ))}
        <div className="interp-row span-2">
          <div className="interp-label">
            <Icon name="clock" size={13} />
            <span>Cadence</span>
            <span className="badge ai sm" style={{ marginLeft: 6 }}>conf 0.81</span>
          </div>
          <div className="interp-value">{interp.cadence}</div>
        </div>
        <div className="interp-row span-2">
          <div className="interp-label">
            <Icon name="link" size={13} />
            <span>Auto-fill from client / employee profile</span>
            <span className="badge ai sm" style={{ marginLeft: 6 }}>conf 0.94</span>
          </div>
          <div className="interp-value chips">
            {(interp.autofill || []).map(a => <span key={a} className="tag">{a}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function InterpRow({ item, approved, onApprove, onChange }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className={"interp-row" + (item.multiline ? " span-2" : "") + (approved ? " approved" : "")}>
      <div className="interp-label">
        <Icon name={item.icon} size={13} />
        <span>{item.label}</span>
        <span className="badge ai sm" style={{ marginLeft: 6 }}>conf {item.confidence.toFixed(2)}</span>
      </div>
      {editing ? (
        item.multiline ? (
          <textarea className="textarea" defaultValue={item.value} onBlur={(e) => { onChange(e.target.value); setEditing(false); }} autoFocus />
        ) : (
          <input className="input" defaultValue={item.value} onBlur={(e) => { onChange(e.target.value); setEditing(false); }} autoFocus />
        )
      ) : (
        <div className="interp-value" onClick={() => setEditing(true)}>{item.value}</div>
      )}
      <div className="interp-actions">
        <button className="btn ghost sm" onClick={() => setEditing(e => !e)}>Edit</button>
        <button className={"btn sm " + (approved ? "" : "accent")} onClick={onApprove}>
          <Icon name="check" size={12} /> {approved ? "Approved" : "Approve"}
        </button>
      </div>
    </div>
  );
}

function SectionBlock({ index, section, selectedFieldId, onSelect, onHover, onUpdateField, onDeleteField, onAddField, showAi }) {
  const [open, setOpen] = useState(true);
  const [editTitle, setEditTitle] = useState(false);
  const [title, setTitle] = useState(section.title);

  return (
    <div className="section-block">
      <div className="section-h">
        <Icon name="drag" size={12} className="drag-handle" />
        <button className="btn ghost sm" onClick={() => setOpen(o => !o)} style={{ padding: "2px 4px" }}>
          <Icon name={open ? "chevron" : "chevronR"} size={12} />
        </button>
        <span className="section-index mono">S{index + 1}</span>
        {editTitle ? (
          <input className="input" style={{ width: 240, fontWeight: 600 }} value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setEditTitle(false)}
            onKeyDown={(e) => { if (e.key === "Enter") setEditTitle(false); }}
            autoFocus />
        ) : (
          <div className="section-title" onClick={() => setEditTitle(true)}>{title}</div>
        )}
        <span className="muted" style={{ fontSize: 12 }}>{section.fields.length} fields</span>
        <div className="spacer"></div>
        <button className="btn ghost sm" onClick={() => onAddField(section.id)}><Icon name="plus" size={12} /> Field</button>
      </div>
      {open && (
        <div className="section-fields">
          {section.fields.map((f) => (
            <FieldRow key={f.id}
              field={f}
              selected={selectedFieldId === f.id}
              onSelect={() => onSelect(f.id)}
              onHover={onHover}
              onDelete={() => onDeleteField(f.id)}
              showAi={showAi}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const TYPE_META = {
  text:      { icon: "text",      label: "Text" },
  date:      { icon: "date",      label: "Date" },
  radio:     { icon: "radio",     label: "Single choice" },
  checkbox:  { icon: "checkbox",  label: "Multi choice" },
  textarea:  { icon: "textarea",  label: "Long text" },
  signature: { icon: "signature", label: "Signature" },
  computed:  { icon: "sigma",     label: "Computed" },
  table:     { icon: "grid",      label: "Table" },
  select:    { icon: "list",      label: "Dropdown" },
};

function FieldRow({ field, selected, onSelect, onHover, onDelete, showAi }) {
  const meta = TYPE_META[field.type] || { icon: "text", label: field.type };
  const conf = field.ai?.confidence;
  return (
    <div
      className={"field-row" + (selected ? " selected" : "")}
      onClick={onSelect}
      onMouseEnter={() => onHover && onHover(field.id)}
      onMouseLeave={() => onHover && onHover(null)}
    >
      <Icon name="drag" size={12} className="drag-handle" />
      <div className="field-type">
        <Icon name={meta.icon} size={13} />
      </div>
      <div className="field-main">
        <div className="field-label">{field.label}{field.required && <span style={{ color: "var(--danger)", marginLeft: 4 }}>*</span>}</div>
        <div className="field-meta">
          <span>{meta.label}</span>
          {field.semantic && <><span className="dot-sep">·</span><span className="mono muted">{field.semantic}</span></>}
          {field.autofill?.source && <><span className="dot-sep">·</span><span className="muted">from <b style={{ color: "var(--text-2)", fontWeight: 500 }}>{field.autofill.source}</b></span></>}
          {field.type === "table" && field.columns && <><span className="dot-sep">·</span><span className="muted">{field.columns.length} columns, repeating rows</span></>}
          {field.options && Array.isArray(field.options) && <><span className="dot-sep">·</span><span className="muted">{field.options.length} options</span></>}
        </div>
      </div>
      {showAi && conf != null && (
        <div className="conf">
          <div className="conf-bar"><div className="conf-fill" style={{ width: `${conf * 100}%`, background: conf > 0.9 ? "var(--ok)" : conf > 0.8 ? "var(--ai)" : "var(--warn)" }}></div></div>
          <span className="conf-num mono">{conf.toFixed(2)}</span>
        </div>
      )}
      <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete">
        <Icon name="trash" size={13} />
      </button>
    </div>
  );
}

function FieldInspector({ field, onUpdate, showAi }) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-h">
        <Icon name={TYPE_META[field.type]?.icon || "text"} size={14} />
        <div className="title">Field details</div>
        <div className="sub">{field.sectionTitle}</div>
        <div className="right">
          {showAi && field.ai?.confidence != null && (
            <span className="badge ai dot">AI conf {field.ai.confidence.toFixed(2)} · {field.ai.src}</span>
          )}
        </div>
      </div>
      <div className="card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="field">
          <div className="label">Label</div>
          <input className="input" value={field.label} onChange={(e) => onUpdate({ label: e.target.value })} />
        </div>
        <div className="field">
          <div className="label">Type</div>
          <select className="select" value={field.type} onChange={(e) => onUpdate({ type: e.target.value })}>
            {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <div className="label">Semantic name (for autofill safety)</div>
          <input className="input mono" value={field.semantic || ""} onChange={(e) => onUpdate({ semantic: e.target.value })} placeholder="e.g. client.fullName" />
          <div className="hint">Tags this field with a precise meaning so autofill never confuses client name with employee name, or DOB with today's date.</div>
        </div>
        {field.type === "table" && field.columns && (
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <div className="label">Table columns</div>
            <div className="col" style={{ gap: 4 }}>
              {field.columns.map((c, i) => (
                <div key={c.id} className="row" style={{ gap: 6, padding: "4px 8px", background: "var(--bg-2)", borderRadius: 4 }}>
                  <span className="mono muted" style={{ fontSize: 11, width: 20 }}>{i + 1}</span>
                  <span style={{ fontWeight: 500, fontSize: 12.5, flex: 1 }}>{c.label}</span>
                  <span className="tag" style={{ fontSize: 10 }}>{TYPE_META[c.type]?.label || c.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {field.options && Array.isArray(field.options) && (
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <div className="label">Options {field.options[0]?.score != null && <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>(with weights)</span>}</div>
            <div className="col" style={{ gap: 6 }}>
              {field.options.map((o, i) => {
                const opt = typeof o === "object" ? o : { label: o };
                return (
                  <div key={i} className="row">
                    <Icon name="drag" size={12} style={{ color: "var(--text-4)" }}/>
                    <input className="input" value={opt.label} onChange={(e) => {
                      const next = [...field.options]; next[i] = typeof o === "object" ? { ...o, label: e.target.value } : e.target.value;
                      onUpdate({ options: next });
                    }} />
                    {opt.score != null && <input className="input mono" style={{ width: 64 }} value={opt.score} onChange={(e) => {
                      const next = [...field.options]; next[i] = { ...o, score: Number(e.target.value) || 0 };
                      onUpdate({ options: next });
                    }} />}
                    <button className="icon-btn"><Icon name="x" size={12} /></button>
                  </div>
                );
              })}
              <button className="btn ghost sm" style={{ alignSelf: "flex-start" }}><Icon name="plus" size={12} /> Add option</button>
            </div>
          </div>
        )}
        <div className="row" style={{ gap: 20, gridColumn: "1 / -1", paddingTop: 4 }}>
          <Toggle label="Required" value={!!field.required} onChange={(v) => onUpdate({ required: v })} />
          <Toggle label="Sensitive (PHI)" value={true} onChange={() => {}} />
        </div>
        {showAi && field.ai?.note && (
          <div className="ai-note" style={{ gridColumn: "1 / -1" }}>
            <Icon name="ai" size={13} style={{ color: "var(--ai)" }} />
            <span><b>AI note:</b> {field.ai.note}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div className="row" style={{ gap: 8, cursor: "pointer" }} onClick={() => onChange(!value)}>
      <div className={"toggle" + (value ? " on" : "")}>
        <div className="toggle-knob"></div>
      </div>
      <span style={{ fontSize: 12.5, color: "var(--text-2)" }}>{label}</span>
    </div>
  );
}

/* =================================================================
   PDF preview — branches by schema key (fallRisk / medicationList).
   Each variant lays out a faux scanned source document with overlay
   boxes positioned over the corresponding detected fields.
   ================================================================= */
function PdfPreview(props) {
  if (props.schemaKey === "medicationList") return <PdfPreviewMedication {...props} />;
  return <PdfPreviewFallRisk {...props} />;
}

function PdfPreviewFallRisk({ showOverlays, sections, selectedFieldId, onSelect, hoverField, setHoverField }) {
  const allFields = sections.flatMap(s => s.fields.map(f => ({ ...f, sectionTitle: s.title })));
  return (
    <div className="pdf-doc">
      <div className="pdf-head">
        <div>
          <div className="pdf-org">DARE TO CARE HOME CARE</div>
          <div className="pdf-doc-title">Fall Risk Assessment</div>
          <div className="pdf-meta">Morse Fall Scale · Form 04-A · Rev. Jan 2024</div>
        </div>
        <div className="pdf-logo"><div className="pdf-logo-mark"></div></div>
      </div>

      <PdfRow label="Client name" id="f1" />
      <PdfRow label="Date of birth" id="f2" half />
      <PdfRow label="Medical record #" id="f3" half right />
      <PdfRow label="Assessment date" id="f4" half />

      <PdfHeading>1.  History</PdfHeading>
      <PdfChoice label="History of falling (within 3 months)" id="f5" options={["No  (0)", "Yes  (25)"]} />
      <PdfChoice label="Secondary diagnosis" id="f6" options={["No  (0)", "Yes  (15)"]} />

      <PdfHeading>2.  Ambulatory aid &amp; gait</PdfHeading>
      <PdfChoice label="Ambulatory aid" id="f7" options={["None / bed rest / wheelchair / nurse  (0)", "Crutches / cane / walker  (15)", "Furniture  (30)"]} />
      <PdfChoice label="IV / heparin lock" id="f8" options={["No  (0)", "Yes  (20)"]} />
      <PdfChoice label="Gait / transferring" id="f9" options={["Normal / bedrest / immobile  (0)", "Weak  (10)", "Impaired  (20)"]} />
      <PdfChoice label="Mental status" id="f10" options={["Oriented to own ability  (0)", "Forgets limitations  (15)"]} />

      <PdfHeading>3.  Score</PdfHeading>
      <div className="pdf-score-row">
        <PdfRow label="Total" id="f11" half score />
        <PdfRow label="Risk level (Low &lt;25 · Med 25–44 · High ≥45)" id="f12" half score />
      </div>

      <PdfHeading>4.  Plan &amp; sign-off</PdfHeading>
      <PdfArea label="Interventions / notes" id="f13" />
      <div className="pdf-sign-row">
        <PdfSign label="Assessor signature" id="f14" />
        <PdfSign label="Date" id="f15" small />
      </div>

      <div className="pdf-foot">Dare to Care Home Care · Confidential — patient health information.</div>

      {showOverlays && (
        <div className="overlay-layer">
          {allFields.map((f) => (
            <FieldOverlay key={f.id} fieldId={f.id} field={f}
              selected={selectedFieldId === f.id}
              hovered={hoverField === f.id}
              onClick={() => onSelect(f.id)}
              onHover={setHoverField} />
          ))}
        </div>
      )}
    </div>
  );
}

function PdfPreviewMedication({ showOverlays, sections, selectedFieldId, onSelect, hoverField, setHoverField }) {
  const allFields = sections.flatMap(s => s.fields.map(f => ({ ...f, sectionTitle: s.title })));
  return (
    <div className="pdf-doc">
      <div className="pdf-head">
        <div>
          <div className="pdf-org">DARE TO CARE HOME CARE</div>
          <div className="pdf-doc-title">Medication List</div>
          <div className="pdf-meta">Form 11-C · Active medication schedule</div>
        </div>
        <div className="pdf-logo"><div className="pdf-logo-mark"></div></div>
      </div>

      <PdfRow label="Client full name" id="mf1" />
      <div>
        <PdfRow label="Date of birth"     id="mf2" half />
        <PdfRow label="Primary physician" id="mf3" half right />
      </div>
      <PdfRow label="Review date" id="mf4" half />

      <PdfHeading>Active medications</PdfHeading>
      <PdfTable id="mf5" columns={["Medication", "Dose", "Route", "Frequency", "Time(s)", "Prescriber", "Notes"]} rows={6} />

      <PdfHeading>Allergies &amp; verification</PdfHeading>
      <PdfArea label="Known allergies" id="mf6" />
      <PdfChoice label="Reconciled with bottle counts" id="mf7" options={["Yes — all counts match", "Discrepancy noted (see notes)"]} />
      <div className="pdf-sign-row">
        <PdfSign label="Caregiver signature" id="mf8" />
        <PdfSign label="Date" id="mf9" small />
      </div>

      <div className="pdf-foot">Dare to Care Home Care · Confidential — patient health information.</div>

      {showOverlays && (
        <div className="overlay-layer">
          {allFields.map((f) => (
            <FieldOverlay key={f.id} fieldId={f.id} field={f}
              selected={selectedFieldId === f.id}
              hovered={hoverField === f.id}
              onClick={() => onSelect(f.id)}
              onHover={setHoverField} />
          ))}
        </div>
      )}
    </div>
  );
}

function PdfRow({ label, id, half, right, score }) {
  return (
    <div className={"pdf-row" + (half ? " half" : "") + (right ? " right" : "")} data-fid={id}>
      <div className="pdf-label">{label}</div>
      <div className={"pdf-line" + (score ? " pdf-line-tall" : "")}></div>
    </div>
  );
}
function PdfHeading({ children }) { return <div className="pdf-heading">{children}</div>; }
function PdfChoice({ label, id, options }) {
  return (
    <div className="pdf-row" data-fid={id}>
      <div className="pdf-label">{label}</div>
      <div className="pdf-choices">
        {options.map((o, i) => <span key={i} className="pdf-choice"><span className="pdf-box"></span><span>{o}</span></span>)}
      </div>
    </div>
  );
}
function PdfArea({ label, id }) {
  return <div className="pdf-row" data-fid={id}><div className="pdf-label">{label}</div><div className="pdf-area"></div></div>;
}
function PdfSign({ label, id, small }) {
  return <div className={"pdf-sign" + (small ? " small" : "")} data-fid={id}><div className="pdf-sign-line"></div><div className="pdf-label" style={{ marginTop: 4 }}>{label}</div></div>;
}
function PdfTable({ id, columns, rows }) {
  return (
    <div className="pdf-row" data-fid={id}>
      <table className="pdf-tbl">
        <thead>
          <tr>{columns.map(c => <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>{columns.map((c, ci) => <td key={ci}></td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FieldOverlay({ fieldId, field, selected, hovered, onClick, onHover }) {
  const [box, setBox] = useState(null);
  useEffect(() => {
    const measure = () => {
      const stage = document.querySelector(".pdf-doc");
      const target = document.querySelector(`[data-fid="${fieldId}"]`);
      if (!stage || !target) return;
      const sr = stage.getBoundingClientRect();
      const tr = target.getBoundingClientRect();
      setBox({
        top: tr.top - sr.top - 4,
        left: tr.left - sr.left - 4,
        width: tr.width + 8,
        height: tr.height + 8,
      });
    };
    measure();
    const t = setTimeout(measure, 50);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t); window.removeEventListener("resize", measure); };
  }, [fieldId]);

  if (!box) return null;
  const conf = field.ai?.confidence ?? 0.9;
  const color = conf > 0.9 ? "var(--ok)" : conf > 0.8 ? "var(--ai)" : "var(--warn)";

  return (
    <div
      className={"overlay-box" + (selected ? " selected" : "") + (hovered ? " hovered" : "")}
      style={{ ...box, "--ov-color": color }}
      onClick={onClick}
      onMouseEnter={() => onHover && onHover(fieldId)}
      onMouseLeave={() => onHover && onHover(null)}
    >
      <span className="overlay-tag mono">{TYPE_META[field.type]?.label || field.type}</span>
    </div>
  );
}

window.FormBuilder = FormBuilder;
window.TYPE_META = TYPE_META;
