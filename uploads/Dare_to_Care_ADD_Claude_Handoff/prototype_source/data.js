// Dare to Care — empty seed state + form schemas the AI can recognize.
//
// No fake people, clients, templates, or submissions are pre-loaded.
// Schemas live here so the "AI extraction" mock has something realistic to
// produce when an admin uploads a reference PDF.

window.APP_DATA = {
  // The three roles the demo cycles through. Display names are role labels,
  // not invented identities — keeps the prototype free of fake personas.
  accounts: [
    { id: "u_admin",   role: "admin",     label: "Admin",          initials: "AD" },
    { id: "u_manager", role: "manager",   label: "Office Manager", initials: "OM" },
    { id: "u_cg",      role: "caregiver", label: "Caregiver",      initials: "CG" },
  ],

  // AI-extractable templates. Two reference forms are recognized so the
  // upload flow has variety; the first upload "extracts" fallRisk, the second
  // extracts medicationList. Nothing here is published — these are draft
  // shapes the AI produces, pending admin approval.
  schemas: {
    fallRisk: {
      key: "fallRisk",
      sourceFilename: "Fall_Risk_Assessment.pdf",
      name: "Fall Risk Assessment",
      category: "Clinical",
      description: "Morse-style scale used at intake and quarterly review.",
      interpretation: {
        purpose: "Score a client's likelihood of falling using a Morse-style scale, prompt interventions, and produce a signed record for the chart.",
        audience: ["Caregiver", "Office Manager"],
        recordType: "Clinical assessment",
        cadence: "On intake, quarterly, and after any incident",
        output: "Fall Risk Assessment PDF — Dare to Care branded, 1 page",
        autofill: ["Client name", "DOB", "MRN", "Today's date"],
      },
      sections: [
        {
          id: "s1",
          title: "Client identification",
          fields: [
            { id: "f1", label: "Client full name",       type: "text",   required: true,  semantic: "client.fullName",      autofill: { source: "client profile", from: "name",  confidence: 0.98, safe: true },  ai: { confidence: 0.98, src: "field", note: "Matched client header" } },
            { id: "f2", label: "Date of birth",          type: "date",   required: true,  semantic: "client.dateOfBirth",   autofill: { source: "client profile", from: "dob",   confidence: 0.97, safe: true },  ai: { confidence: 0.97, src: "field" } },
            { id: "f3", label: "Medical record number",  type: "text",   required: false, semantic: "client.mrn",           autofill: { source: "client profile", from: "mrn",   confidence: 0.91, safe: true },  ai: { confidence: 0.91, src: "field" } },
            { id: "f4", label: "Assessment date",        type: "date",   required: true,  semantic: "form.completionDate",  autofill: { source: "today's date",   from: "today", confidence: 0.95, safe: true },  ai: { confidence: 0.95, src: "field" } },
          ],
        },
        {
          id: "s2",
          title: "History",
          fields: [
            { id: "f5", label: "History of falling (within 3 months)", type: "radio", required: true, semantic: "assessment.historyOfFalling",
              options: [{ label: "No", score: 0 }, { label: "Yes", score: 25 }],
              ai: { confidence: 0.93, src: "checkbox-pair", note: "Scored item — extracted point values" } },
            { id: "f6", label: "Secondary diagnosis", type: "radio", required: true, semantic: "assessment.secondaryDiagnosis",
              options: [{ label: "No", score: 0 }, { label: "Yes", score: 15 }],
              ai: { confidence: 0.88, src: "checkbox-pair" } },
          ],
        },
        {
          id: "s3",
          title: "Ambulatory aid & gait",
          fields: [
            { id: "f7", label: "Ambulatory aid", type: "radio", required: true, semantic: "assessment.ambulatoryAid",
              options: [{ label: "None / bed rest / wheelchair / nurse", score: 0 }, { label: "Crutches / cane / walker", score: 15 }, { label: "Furniture", score: 30 }],
              ai: { confidence: 0.86, src: "checkbox-list" } },
            { id: "f8", label: "IV / heparin lock", type: "radio", required: true, semantic: "assessment.ivLock",
              options: [{ label: "No", score: 0 }, { label: "Yes", score: 20 }],
              ai: { confidence: 0.94, src: "checkbox-pair" } },
            { id: "f9", label: "Gait / transferring", type: "radio", required: true, semantic: "assessment.gait",
              options: [{ label: "Normal / bedrest / immobile", score: 0 }, { label: "Weak", score: 10 }, { label: "Impaired", score: 20 }],
              ai: { confidence: 0.82, src: "checkbox-list" } },
            { id: "f10", label: "Mental status", type: "radio", required: true, semantic: "assessment.mentalStatus",
              options: [{ label: "Oriented to own ability", score: 0 }, { label: "Forgets limitations", score: 15 }],
              ai: { confidence: 0.90, src: "checkbox-pair" } },
          ],
        },
        {
          id: "s4",
          title: "Plan & sign-off",
          fields: [
            { id: "f11", label: "Total score",           type: "computed", formula: "sum",  required: true,  semantic: "assessment.totalScore", ai: { confidence: 0.78, src: "computed", note: "Detected as a numeric total field" } },
            { id: "f12", label: "Risk level",            type: "computed", formula: "tier", required: true,  semantic: "assessment.riskTier",   ai: { confidence: 0.74, src: "computed" } },
            { id: "f13", label: "Interventions / notes", type: "textarea", required: false, semantic: "assessment.interventionNotes", ai: { confidence: 0.88, src: "freetext-area", note: "Detected multi-line text area" } },
            { id: "f14", label: "Assessor signature",    type: "signature",required: true,  semantic: "form.assessorSignature", autofill: { source: "logged-in caregiver", from: "currentUser", confidence: 0.96, safe: false }, ai: { confidence: 0.96, src: "signature-line" } },
            { id: "f15", label: "Signature date",        type: "date",     required: true,  semantic: "form.signatureDate",     autofill: { source: "today's date", from: "today", confidence: 0.99, safe: true } },
          ],
        },
      ],
    },

    medicationList: {
      key: "medicationList",
      sourceFilename: "Medication_List.pdf",
      name: "Medication List",
      category: "Clinical",
      description: "Current medications maintained by the caregiver. Preserves the tabular schedule from the original form.",
      interpretation: {
        purpose: "Maintain the current medication regimen for a client and reconcile against bottle counts at each shift change.",
        audience: ["Caregiver", "Office Manager"],
        recordType: "Clinical record",
        cadence: "On admission and at each medication change",
        output: "Medication List PDF — Dare to Care branded, 1 page with tabular schedule",
        autofill: ["Client name", "DOB", "Primary physician", "Today's date"],
      },
      sections: [
        {
          id: "ms1",
          title: "Client identification",
          fields: [
            { id: "mf1", label: "Client full name",      type: "text", required: true, semantic: "client.fullName",         autofill: { source: "client profile", from: "name", confidence: 0.98, safe: true } },
            { id: "mf2", label: "Date of birth",         type: "date", required: true, semantic: "client.dateOfBirth",      autofill: { source: "client profile", from: "dob",  confidence: 0.97, safe: true } },
            { id: "mf3", label: "Primary physician",     type: "text", required: true, semantic: "client.primaryPhysician", autofill: { source: "client profile", from: "physician", confidence: 0.84, safe: true } },
            { id: "mf4", label: "Review date",           type: "date", required: true, semantic: "form.completionDate",     autofill: { source: "today's date",   from: "today", confidence: 0.99, safe: true } },
          ],
        },
        {
          id: "ms2",
          title: "Active medications",
          fields: [
            {
              id: "mf5",
              label: "Medication schedule",
              type: "table",
              required: true,
              semantic: "medication.schedule",
              ai: { confidence: 0.89, src: "table", note: "Detected 7 columns × repeating rows. Preserved as a structured table — not flattened into text." },
              columns: [
                { id: "name",  label: "Medication", type: "text",   width: 1.4 },
                { id: "dose",  label: "Dose",       type: "text",   width: 0.7 },
                { id: "route", label: "Route",      type: "select", width: 0.7, options: ["PO", "IM", "SC", "Topical", "Inhaled"] },
                { id: "freq",  label: "Frequency",  type: "select", width: 0.9, options: ["Once daily", "Twice daily", "Three times daily", "At bedtime", "PRN"] },
                { id: "time",  label: "Time(s)",    type: "text",   width: 0.9 },
                { id: "rx",    label: "Prescriber", type: "text",   width: 1.0 },
                { id: "notes", label: "Notes",      type: "text",   width: 1.4 },
              ],
              // No pre-filled rows — caregiver populates at fill time.
              rows: [],
            },
          ],
        },
        {
          id: "ms3",
          title: "Allergies & verification",
          fields: [
            { id: "mf6", label: "Known allergies", type: "textarea", required: false, semantic: "client.allergies" },
            { id: "mf7", label: "Reconciled with bottle counts", type: "radio", required: true, semantic: "medication.reconciled",
              options: [{ label: "Yes — all counts match", score: 0 }, { label: "Discrepancy noted (see notes)", score: 0 }] },
            { id: "mf8", label: "Caregiver signature", type: "signature", required: true, semantic: "form.assessorSignature", autofill: { source: "logged-in caregiver", from: "currentUser", confidence: 0.96, safe: false } },
            { id: "mf9", label: "Signature date",      type: "date",      required: true, semantic: "form.signatureDate",     autofill: { source: "today's date", from: "today", confidence: 0.99, safe: true } },
          ],
        },
      ],
    },
  },

  // Available upload candidates the mock pipeline cycles through.
  uploadQueue: ["fallRisk", "medicationList"],
};

// Today as ISO yyyy-mm-dd (used for autofill defaults that say "today's date")
window.TODAY_ISO = new Date().toISOString().slice(0, 10);

// Helper: resolve an autofill value for a field, given a client profile + current user.
window.resolveAutofill = function (field, ctx) {
  const af = field.autofill;
  if (!af) return null;
  const from = af.from;
  if (from === "today") return window.TODAY_ISO;
  if (from === "currentUser") return ctx?.currentUser?.label || "Caregiver";
  if (ctx?.client && from in ctx.client) return ctx.client[from];
  return null;
};
