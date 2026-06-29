/* ============================================================
   Dare to Care — Caregiver Wizard Prototype
   Form schemas (real, from handoff) + demo clients + helpers.
   Plain JS — exposes window.DTC.
   ============================================================ */
(function () {
  const TODAY_ISO = new Date().toISOString().slice(0, 10);

  /* ---- Demo clients ----------------------------------------------------
     A caregiver needs assigned clients to fill forms about. These are
     clearly-labeled SAMPLE records for the prototype only — not real PHI. */
  const clients = [
    {
      id: "c1", name: "Eleanor Pratt", dob: "1939-04-12", mrn: "DTC-10293",
      physician: "Dr. A. Bello", allergies: "Penicillin; sulfa drugs",
      address: "14 Linden Ct, Apt 3", phone: "(555) 217-4408",
      tags: ["Fall risk", "Mon · Wed · Fri"], initials: "EP",
    },
    {
      id: "c2", name: "Harold Okafor", dob: "1945-11-02", mrn: "DTC-10311",
      physician: "Dr. R. Singh", allergies: "None known",
      address: "902 Maple Ave", phone: "(555) 661-2093",
      tags: ["Daily visit"], initials: "HO",
    },
    {
      id: "c3", name: "Doris Mbeki", dob: "1951-07-28", mrn: "DTC-10350",
      physician: "Dr. L. Hahn", allergies: "Latex",
      address: "31 Birchwood Ln", phone: "(555) 880-1145",
      tags: ["Tue · Thu"], initials: "DM",
    },
  ];

  /* ---- Logged-in caregiver (prototype) -------------------------------- */
  const currentUser = { id: "u_cg", label: "J. Rivera", role: "caregiver", initials: "JR" };

  /* ---- Schemas (verbatim structure from the handoff data.js) ---------- */
  const schemas = {
    fallRisk: {
      key: "fallRisk",
      name: "Fall Risk Assessment",
      category: "Clinical",
      version: 2,
      estMin: 3,
      icon: "activity",
      description: "Morse-style scale used at intake and quarterly review.",
      interpretation: {
        purpose: "Score a client's likelihood of falling and produce a signed record.",
        cadence: "On intake, quarterly, and after any incident",
      },
      sections: [
        {
          id: "s1", title: "Client identification",
          fields: [
            { id: "f1", label: "Client full name", type: "text", required: true, autofill: { source: "client profile", from: "name", confidence: 0.98, safe: true } },
            { id: "f2", label: "Date of birth", type: "date", required: true, autofill: { source: "client profile", from: "dob", confidence: 0.97, safe: true } },
            { id: "f3", label: "Medical record number", type: "text", required: false, autofill: { source: "client profile", from: "mrn", confidence: 0.91, safe: true } },
            { id: "f4", label: "Assessment date", type: "date", required: true, autofill: { source: "today's date", from: "today", confidence: 0.95, safe: true } },
          ],
        },
        {
          id: "s2", title: "History",
          fields: [
            { id: "f5", label: "History of falling (within 3 months)", type: "radio", required: true, options: [{ label: "No", score: 0 }, { label: "Yes", score: 25 }] },
            { id: "f6", label: "Secondary diagnosis", type: "radio", required: true, options: [{ label: "No", score: 0 }, { label: "Yes", score: 15 }] },
          ],
        },
        {
          id: "s3", title: "Ambulatory aid & gait",
          fields: [
            { id: "f7", label: "Ambulatory aid", type: "radio", required: true, options: [{ label: "None / bed rest / wheelchair / nurse", score: 0 }, { label: "Crutches / cane / walker", score: 15 }, { label: "Furniture", score: 30 }] },
            { id: "f8", label: "IV / heparin lock", type: "radio", required: true, options: [{ label: "No", score: 0 }, { label: "Yes", score: 20 }] },
            { id: "f9", label: "Gait / transferring", type: "radio", required: true, options: [{ label: "Normal / bedrest / immobile", score: 0 }, { label: "Weak", score: 10 }, { label: "Impaired", score: 20 }] },
            { id: "f10", label: "Mental status", type: "radio", required: true, options: [{ label: "Oriented to own ability", score: 0 }, { label: "Forgets limitations", score: 15 }] },
          ],
        },
        {
          id: "s4", title: "Plan & sign-off",
          fields: [
            { id: "f11", label: "Total score", type: "computed", formula: "sum" },
            { id: "f12", label: "Risk level", type: "computed", formula: "tier" },
            { id: "f13", label: "Interventions / notes", type: "textarea", required: false, placeholder: "Document interventions, supervision level, equipment…" },
            { id: "f14", label: "Assessor signature", type: "signature", required: true, autofill: { source: "logged-in caregiver", from: "currentUser", confidence: 0.96, safe: false } },
            { id: "f15", label: "Signature date", type: "date", required: true, autofill: { source: "today's date", from: "today", confidence: 0.99, safe: true } },
          ],
        },
      ],
      // Risk tier mapping for the "tier" computed formula
      tiers: [
        { max: 24, label: "Low risk", level: "low" },
        { max: 44, label: "Moderate risk", level: "med" },
        { max: 9999, label: "High risk", level: "high" },
      ],
    },

    medicationList: {
      key: "medicationList",
      name: "Medication List",
      category: "Clinical",
      version: 1,
      estMin: 4,
      icon: "pill",
      description: "Current medications, reconciled against bottle counts each shift.",
      interpretation: {
        purpose: "Maintain the current medication regimen and reconcile counts.",
        cadence: "On admission and at each medication change",
      },
      sections: [
        {
          id: "ms1", title: "Client identification",
          fields: [
            { id: "mf1", label: "Client full name", type: "text", required: true, autofill: { source: "client profile", from: "name", confidence: 0.98, safe: true } },
            { id: "mf2", label: "Date of birth", type: "date", required: true, autofill: { source: "client profile", from: "dob", confidence: 0.97, safe: true } },
            { id: "mf3", label: "Primary physician", type: "text", required: true, autofill: { source: "client profile", from: "physician", confidence: 0.84, safe: true } },
            { id: "mf4", label: "Review date", type: "date", required: true, autofill: { source: "today's date", from: "today", confidence: 0.99, safe: true } },
          ],
        },
        {
          id: "ms2", title: "Active medications",
          fields: [
            {
              id: "mf5", label: "Medication schedule", type: "table", required: true,
              columns: [
                { id: "name", label: "Medication", type: "text", width: 1.4 },
                { id: "dose", label: "Dose", type: "text", width: 0.7 },
                { id: "route", label: "Route", type: "select", width: 0.8, options: ["PO", "IM", "SC", "Topical", "Inhaled"] },
                { id: "freq", label: "Frequency", type: "select", width: 1.0, options: ["Once daily", "Twice daily", "Three times daily", "At bedtime", "PRN"] },
                { id: "time", label: "Time(s)", type: "text", width: 0.8 },
                { id: "rx", label: "Prescriber", type: "text", width: 1.0 },
                { id: "notes", label: "Notes", type: "text", width: 1.3 },
              ],
            },
          ],
        },
        {
          id: "ms3", title: "Allergies & verification",
          fields: [
            { id: "mf6", label: "Known allergies", type: "textarea", required: false, autofill: { source: "client profile", from: "allergies", confidence: 0.8, safe: true }, placeholder: "List known allergies and reactions…" },
            { id: "mf7", label: "Reconciled with bottle counts", type: "radio", required: true, options: [{ label: "Yes — all counts match", score: 0 }, { label: "Discrepancy noted (see notes)", score: 0 }] },
            { id: "mf8", label: "Caregiver signature", type: "signature", required: true, autofill: { source: "logged-in caregiver", from: "currentUser", confidence: 0.96, safe: false } },
            { id: "mf9", label: "Signature date", type: "date", required: true, autofill: { source: "today's date", from: "today", confidence: 0.99, safe: true } },
          ],
        },
      ],
    },

    workplaceViolence: {
      key: "workplaceViolence",
      name: "Workplace Violence Acknowledgement",
      category: "Policy",
      version: 1,
      estMin: 2,
      icon: "shield",
      description: "Reusable acknowledgement pattern — read, confirm, sign.",
      interpretation: {
        purpose: "Confirm the caregiver has read and understood the policy.",
        cadence: "At hire and annually",
      },
      sections: [
        {
          id: "ws1", title: "Policy",
          fields: [
            {
              id: "wf1", type: "policyText", label: "Workplace Violence Prevention Policy",
              body: "Dare to Care is committed to a safe environment for every employee, client, and visitor. Threats, intimidation, harassment, and acts of violence are prohibited at all worksites, including client homes. Employees must report any incident, threat, or unsafe condition to their supervisor immediately and may remove themselves from any situation they believe to be unsafe. Retaliation against anyone who reports in good faith is prohibited.",
            },
          ],
        },
        {
          id: "ws2", title: "Acknowledgement",
          fields: [
            { id: "wf2", label: "I have read and understand this policy", type: "checkbox", required: true, options: [{ label: "I have read and understand this policy" }] },
            { id: "wf3", label: "I agree to report incidents per the procedure above", type: "checkbox", required: true, options: [{ label: "I agree to report incidents per the procedure above" }] },
            { id: "wf4", label: "Employee name", type: "text", required: true, autofill: { source: "logged-in caregiver", from: "currentUser", confidence: 0.95, safe: true } },
            { id: "wf5", label: "Employee signature", type: "signature", required: true, autofill: { source: "logged-in caregiver", from: "currentUser", confidence: 0.96, safe: false } },
            { id: "wf6", label: "Date", type: "date", required: true, autofill: { source: "today's date", from: "today", confidence: 0.99, safe: true } },
          ],
        },
      ],
    },
  };

  /* ---- Which forms are about a client vs. about the employee ---------- */
  const formMeta = {
    fallRisk: { subject: "client" },
    medicationList: { subject: "client" },
    workplaceViolence: { subject: "self" },
  };

  /* ---- Helpers -------------------------------------------------------- */
  function resolveAutofill(field, ctx) {
    const af = field.autofill;
    if (!af) return null;
    if (af.from === "today") return TODAY_ISO;
    if (af.from === "currentUser") return ctx.currentUser ? ctx.currentUser.label : "";
    if (ctx.client && af.from in ctx.client) return ctx.client[af.from];
    return null;
  }

  // Flatten scored fields and compute total + tier for a schema's values.
  function computeScore(schema, values) {
    let total = 0;
    schema.sections.forEach((sec) => {
      sec.fields.forEach((f) => {
        if (f.type === "radio" && Array.isArray(f.options)) {
          const v = values[f.id];
          const opt = f.options.find((o) => o.label === v);
          if (opt && typeof opt.score === "number") total += opt.score;
        }
      });
    });
    let tier = null;
    if (schema.tiers) {
      tier = schema.tiers.find((t) => total <= t.max) || schema.tiers[schema.tiers.length - 1];
    }
    return { total, tier };
  }

  function hasScoring(schema) {
    return schema.sections.some((s) => s.fields.some((f) => f.type === "computed"));
  }

  // Validate one section's required fields. Returns array of invalid field ids.
  function invalidFieldsInSection(section, values) {
    const bad = [];
    section.fields.forEach((f) => {
      if (!f.required) return;
      const v = values[f.id];
      if (f.type === "checkbox") {
        if (!v || (Array.isArray(v) && v.length === 0)) bad.push(f.id);
      } else if (f.type === "table") {
        if (!Array.isArray(v) || v.length === 0 || !v.some((row) => Object.values(row).some((x) => x && String(x).trim()))) bad.push(f.id);
      } else if (f.type === "signature") {
        if (!v) bad.push(f.id);
      } else {
        if (v === undefined || v === null || String(v).trim() === "") bad.push(f.id);
      }
    });
    return bad;
  }

  window.DTC = {
    TODAY_ISO, clients, currentUser, schemas, formMeta,
    resolveAutofill, computeScore, hasScoring, invalidFieldsInSection,
    formList: ["fallRisk", "medicationList", "workplaceViolence"],
  };
})();
