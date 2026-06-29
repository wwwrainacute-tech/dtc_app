/* ============================================================
   Dare to Care — Connected Prototype shared data store.
   Single source of truth for templates, submissions, audit,
   clients. localStorage-backed + pub/sub. Exposes window.DTCStore.
   Loaded AFTER schemas.js (needs window.DTC).
   ============================================================ */
(function () {
  const D = window.DTC;
  const T_KEY = "dtc_templates_v2";
  const S_KEY = "dtc_submissions_v1";   // shared with standalone caregiver prototype
  const A_KEY = "dtc_audit_v1";

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const nowISO = () => new Date().toISOString();

  /* ---- Two extra source forms the Admin can import in the demo ---------
     (kept here, not in schemas.js, so they start as un-imported PDFs.) */
  const extraSchemas = {
    caregiverActivity: {
      key: "caregiverActivity", name: "Caregiver Activity Report", category: "Visit",
      version: 1, estMin: 3, icon: "clock",
      description: "Shift / visit log of tasks performed and time on site.",
      interpretation: { purpose: "Document tasks completed and hours for a client visit.", cadence: "Every shift" },
      subject: "client", completedBy: ["caregiver"],
      sections: [
        { id: "as1", title: "Visit details", fields: [
          { id: "af1", label: "Client full name", type: "text", required: true, autofill: { source: "client profile", from: "name", confidence: 0.98, safe: true } },
          { id: "af2", label: "Visit date", type: "date", required: true, autofill: { source: "today's date", from: "today", confidence: 0.99, safe: true } },
          { id: "af3", label: "Time in", type: "text", required: true, placeholder: "e.g. 9:00 AM" },
          { id: "af4", label: "Time out", type: "text", required: true, placeholder: "e.g. 1:00 PM" },
        ] },
        { id: "as2", title: "Tasks performed", fields: [
          { id: "af5", label: "Personal care & ADLs", type: "checkbox", required: true, options: [
            { label: "Bathing / hygiene" }, { label: "Dressing / grooming" }, { label: "Mobility / transfers" },
            { label: "Toileting" }, { label: "Meal preparation" }, { label: "Medication reminders" },
            { label: "Light housekeeping" }, { label: "Companionship" } ] },
          { id: "af6", label: "Notes / observations", type: "textarea", required: false, placeholder: "Changes in condition, concerns, follow-ups…" },
        ] },
        { id: "as3", title: "Sign-off", fields: [
          { id: "af7", label: "Caregiver signature", type: "signature", required: true, autofill: { source: "logged-in caregiver", from: "currentUser", confidence: 0.96, safe: false } },
          { id: "af8", label: "Date", type: "date", required: true, autofill: { source: "today's date", from: "today", confidence: 0.99, safe: true } },
        ] },
      ],
    },
    supervisoryVisit: {
      key: "supervisoryVisit", name: "Supervisory Visit Form", category: "Supervisory",
      version: 1, estMin: 5, icon: "users",
      description: "Periodic supervisory visit documenting care quality & compliance.",
      interpretation: { purpose: "Record a supervisor's on-site review of care delivery.", cadence: "Every 60–90 days per client" },
      subject: "client", completedBy: ["officeManager"],
      sections: [
        { id: "vs1", title: "Visit details", fields: [
          { id: "vf1", label: "Client full name", type: "text", required: true, autofill: { source: "client profile", from: "name", confidence: 0.98, safe: true } },
          { id: "vf2", label: "Visit date", type: "date", required: true, autofill: { source: "today's date", from: "today", confidence: 0.99, safe: true } },
          { id: "vf3", label: "Caregiver reviewed", type: "text", required: true },
        ] },
        { id: "vs2", title: "Quality review", fields: [
          { id: "vf4", label: "Care plan being followed", type: "radio", required: true, options: [{ label: "Yes" }, { label: "Partially" }, { label: "No" }] },
          { id: "vf5", label: "Client satisfaction", type: "radio", required: true, options: [{ label: "Satisfied" }, { label: "Neutral" }, { label: "Concerns noted" }] },
          { id: "vf6", label: "Home environment safe", type: "radio", required: true, options: [{ label: "Yes" }, { label: "Issues found" }] },
          { id: "vf7", label: "Findings & corrective actions", type: "textarea", required: false, placeholder: "Document findings and any actions taken…" },
        ] },
        { id: "vs3", title: "Sign-off", fields: [
          { id: "vf8", label: "Supervisor signature", type: "signature", required: true, autofill: { source: "logged-in user", from: "currentUser", confidence: 0.9, safe: false } },
          { id: "vf9", label: "Date", type: "date", required: true, autofill: { source: "today's date", from: "today", confidence: 0.99, safe: true } },
        ] },
      ],
    },
  };

  // The source-PDF library the Admin imports from.
  const library = [
    { id: "lib_fallRisk", file: "Fall_Risk_Assessment.pdf", pages: 1, schemaKey: "fallRisk", imported: true },
    { id: "lib_medList", file: "Medication_List.pdf", pages: 1, schemaKey: "medicationList", imported: true },
    { id: "lib_wpv", file: "Workplace_Violence_Acknowledgement.pdf", pages: 1, schemaKey: "workplaceViolence", imported: true },
    { id: "lib_activity", file: "Caregiver_Activity_Report.pdf", pages: 1, schemaKey: "caregiverActivity", imported: false },
    { id: "lib_super", file: "Supervisory_Visit_Form.pdf", pages: 1, schemaKey: "supervisoryVisit", imported: false },
  ];

  // All known schema definitions (seed + extras), used when importing.
  const allSchemas = Object.assign({}, clone(D.schemas), clone(extraSchemas));
  // Bake subject + completedBy onto the seed schemas.
  const seedMeta = {
    fallRisk: { subject: "client", completedBy: ["caregiver"] },
    medicationList: { subject: "client", completedBy: ["caregiver"] },
    workplaceViolence: { subject: "self", completedBy: ["caregiver"] },
  };
  Object.keys(seedMeta).forEach((k) => { if (allSchemas[k]) Object.assign(allSchemas[k], seedMeta[k]); });

  function buildTemplate(schemaKey, status) {
    const s = clone(allSchemas[schemaKey]);
    return Object.assign(s, {
      id: "tpl_" + schemaKey,
      status: status || "published",
      createdBy: "Admin",
      updatedAt: nowISO(),
      publishedAt: status === "published" || !status ? nowISO() : null,
      fieldCount: s.sections.reduce((n, sec) => n + sec.fields.filter((f) => f.type !== "policyText" && f.type !== "computed").length, 0),
    });
  }

  /* ---- Load / seed ---------------------------------------------------- */
  function seedTemplates() {
    return ["fallRisk", "medicationList", "workplaceViolence"].map((k) => buildTemplate(k, "published"));
  }
  function load(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function persist(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

  let templates = load(T_KEY, null) || seedTemplates();
  let submissions = load(S_KEY, []);
  let audit = load(A_KEY, null) || [
    { id: "a0", timestamp: nowISO(), actor: "Admin", role: "admin", action: "published", target: "Fall Risk Assessment", meta: "v2" },
  ];
  // keep library.imported in sync with persisted templates
  library.forEach((l) => { l.imported = templates.some((t) => t.key === l.schemaKey); });

  /* ---- pub/sub -------------------------------------------------------- */
  const subs = new Set();
  function emit() { subs.forEach((fn) => { try { fn(); } catch (e) {} }); }
  function commit() {
    persist(T_KEY, templates); persist(S_KEY, submissions); persist(A_KEY, audit);
    library.forEach((l) => { l.imported = templates.some((t) => t.key === l.schemaKey); });
    emit();
  }

  /* ---- API ------------------------------------------------------------ */
  const Store = {
    clients: D.clients,
    currentUser: D.currentUser,

    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },

    /* templates */
    getTemplates() { return templates.slice(); },
    getPublishedTemplates() { return templates.filter((t) => t.status === "published"); },
    getTemplate(key) { return templates.find((t) => t.key === key); },
    publishedKeysFor(role) {
      return templates.filter((t) => t.status === "published" && (!t.completedBy || t.completedBy.includes(role))).map((t) => t.key);
    },
    addAudit(evt) { audit = [Object.assign({ id: "a_" + Date.now() + Math.random().toString(36).slice(2, 6), timestamp: nowISO() }, evt), ...audit]; },

    importTemplate(schemaKey) {
      if (templates.some((t) => t.key === schemaKey)) return this.getTemplate(schemaKey);
      const tpl = buildTemplate(schemaKey, "draft");
      tpl.publishedAt = null;
      templates = [tpl, ...templates];
      this.addAudit({ actor: "Admin", role: "admin", action: "imported PDF", target: tpl.name, meta: "draft" });
      commit();
      return tpl;
    },
    saveTemplate(tpl) {
      tpl.updatedAt = nowISO();
      templates = templates.map((t) => (t.key === tpl.key ? tpl : t));
      this.addAudit({ actor: "Admin", role: "admin", action: "saved draft", target: tpl.name });
      commit();
    },
    publishTemplate(key) {
      templates = templates.map((t) => {
        if (t.key !== key) return t;
        const wasDraft = t.status !== "published";
        return Object.assign({}, t, { status: "published", version: wasDraft ? t.version : t.version + 1, publishedAt: nowISO(), updatedAt: nowISO() });
      });
      const t = this.getTemplate(key);
      this.addAudit({ actor: "Admin", role: "admin", action: "published", target: t.name, meta: "v" + t.version });
      commit();
    },
    unpublishTemplate(key) {
      templates = templates.map((t) => (t.key === key ? Object.assign({}, t, { status: "draft", updatedAt: nowISO() }) : t));
      const t = this.getTemplate(key);
      this.addAudit({ actor: "Admin", role: "admin", action: "unpublished", target: t.name });
      commit();
    },

    /* library */
    getLibrary() { return library.slice(); },
    schemaName(schemaKey) { return (allSchemas[schemaKey] || {}).name || schemaKey; },

    /* submissions */
    getSubmissions() { return submissions.slice(); },
    addSubmission(sub) {
      submissions = [sub, ...submissions];
      this.addAudit({ actor: sub.caregiverName || "Caregiver", role: "caregiver", action: "submitted", target: this.schemaName(sub.schemaKey), meta: sub.clientName || "" });
      commit();
    },
    updateSubmission(id, patch, auditEvt) {
      submissions = submissions.map((s) => (s.id === id ? Object.assign({}, s, patch) : s));
      if (auditEvt) this.addAudit(auditEvt);
      commit();
    },

    /* audit */
    getAudit() { return audit.slice(); },

    reset() {
      localStorage.removeItem(T_KEY); localStorage.removeItem(S_KEY); localStorage.removeItem(A_KEY);
      templates = seedTemplates(); submissions = []; audit = []; commit();
    },
  };

  window.DTCStore = Store;
})();
