const schemaLibrary = {
  fallRisk: {
    key: "fallRisk",
    sourceFilename: "Fall_Risk_Assessment.pdf",
    name: "Fall Risk Assessment",
    category: "Clinical",
    description: "Morse-style scale used at intake and quarterly review.",
    subject: "client",
    icon: "activity",
    estMin: 3,
    completedBy: ["caregiver", "officeManager"],
    interpretation: {
      purpose: "Score a client's likelihood of falling using a Morse-style scale, prompt interventions, and produce a signed record for the chart.",
      audience: ["Caregiver", "Office Manager"],
      recordType: "Clinical assessment",
      cadence: "On intake, quarterly, and after any incident",
      output: "Branded PDF summary",
      autofill: ["Client name", "DOB", "MRN", "Today's date"],
    },
    sections: [
      {
        id: "s1",
        title: "Client identification",
        fields: [
          { id: "f1", label: "Client full name", type: "text", required: true, semantic: "client.fullName", autofill: { source: "client profile", from: "name", confidence: 0.98, safe: true } },
          { id: "f2", label: "Date of birth", type: "date", required: true, semantic: "client.dateOfBirth", autofill: { source: "client profile", from: "dob", confidence: 0.97, safe: true } },
          { id: "f3", label: "Medical record number", type: "text", required: false, semantic: "client.mrn", autofill: { source: "client profile", from: "mrn", confidence: 0.91, safe: true } },
          { id: "f4", label: "Assessment date", type: "date", required: true, semantic: "form.completionDate", autofill: { source: "today's date", from: "today", confidence: 0.95, safe: true } },
        ],
      },
      {
        id: "s2",
        title: "History",
        fields: [
          { id: "f5", label: "History of falling (within 3 months)", type: "radio", required: true, semantic: "assessment.historyOfFalling", options: [{ label: "No", score: 0 }, { label: "Yes", score: 25 }] },
          { id: "f6", label: "Secondary diagnosis", type: "radio", required: true, semantic: "assessment.secondaryDiagnosis", options: [{ label: "No", score: 0 }, { label: "Yes", score: 15 }] },
        ],
      },
      {
        id: "s3",
        title: "Ambulatory aid & gait",
        fields: [
          { id: "f7", label: "Ambulatory aid", type: "radio", required: true, semantic: "assessment.ambulatoryAid", options: [{ label: "None / bed rest / wheelchair / nurse", score: 0 }, { label: "Crutches / cane / walker", score: 15 }, { label: "Furniture", score: 30 }] },
          { id: "f8", label: "IV / heparin lock", type: "radio", required: true, semantic: "assessment.ivLock", options: [{ label: "No", score: 0 }, { label: "Yes", score: 20 }] },
          { id: "f9", label: "Gait / transferring", type: "radio", required: true, semantic: "assessment.gait", options: [{ label: "Normal / bedrest / immobile", score: 0 }, { label: "Weak", score: 10 }, { label: "Impaired", score: 20 }] },
          { id: "f10", label: "Mental status", type: "radio", required: true, semantic: "assessment.mentalStatus", options: [{ label: "Oriented to own ability", score: 0 }, { label: "Forgets limitations", score: 15 }] },
        ],
      },
      {
        id: "s4",
        title: "Plan & sign-off",
        fields: [
          { id: "f11", label: "Total score", type: "computed", formula: "sum", required: true, semantic: "assessment.totalScore" },
          { id: "f12", label: "Risk level", type: "computed", formula: "tier", required: true, semantic: "assessment.riskTier" },
          { id: "f13", label: "Interventions / notes", type: "textarea", required: false, semantic: "assessment.interventionNotes" },
          { id: "f14", label: "Assessor signature", type: "signature", required: true, semantic: "form.assessorSignature", autofill: { source: "logged-in caregiver", from: "currentUser", confidence: 0.96, safe: false } },
          { id: "f15", label: "Signature date", type: "date", required: true, semantic: "form.signatureDate", autofill: { source: "today's date", from: "today", confidence: 0.99, safe: true } },
        ],
      },
    ],
    tiers: [
      { max: 24, label: "Low risk", level: "low" },
      { max: 44, label: "Moderate risk", level: "med" },
      { max: 9999, label: "High risk", level: "high" },
    ],
  },
  medicationList: {
    key: "medicationList",
    sourceFilename: "Medication_List.pdf",
    name: "Medication List",
    category: "Clinical",
    description: "Current medications maintained by the caregiver.",
    subject: "client",
    icon: "pill",
    estMin: 4,
    completedBy: ["caregiver", "officeManager"],
    interpretation: {
      purpose: "Maintain the current medication regimen for a client and reconcile against bottle counts at each shift change.",
      audience: ["Caregiver", "Office Manager"],
      recordType: "Clinical record",
      cadence: "On admission and at each medication change",
      output: "Branded PDF summary",
      autofill: ["Client name", "DOB", "Primary physician", "Today's date"],
    },
    sections: [
      {
        id: "ms1",
        title: "Client identification",
        fields: [
          { id: "mf1", label: "Client full name", type: "text", required: true, semantic: "client.fullName", autofill: { source: "client profile", from: "name", confidence: 0.98, safe: true } },
          { id: "mf2", label: "Date of birth", type: "date", required: true, semantic: "client.dateOfBirth", autofill: { source: "client profile", from: "dob", confidence: 0.97, safe: true } },
          { id: "mf3", label: "Primary physician", type: "text", required: true, semantic: "client.primaryPhysician", autofill: { source: "client profile", from: "physician", confidence: 0.84, safe: true } },
          { id: "mf4", label: "Review date", type: "date", required: true, semantic: "form.completionDate", autofill: { source: "today's date", from: "today", confidence: 0.99, safe: true } },
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
            columns: [
              { id: "name", label: "Medication", type: "text", width: 1.4 },
              { id: "dose", label: "Dose", type: "text", width: 0.7 },
              { id: "route", label: "Route", type: "select", width: 0.7, options: ["PO", "IM", "SC", "Topical", "Inhaled"] },
              { id: "freq", label: "Frequency", type: "select", width: 0.9, options: ["Once daily", "Twice daily", "Three times daily", "At bedtime", "PRN"] },
              { id: "time", label: "Time(s)", type: "text", width: 0.9 },
              { id: "rx", label: "Prescriber", type: "text", width: 1 },
              { id: "notes", label: "Notes", type: "text", width: 1.4 },
            ],
          },
        ],
      },
      {
        id: "ms3",
        title: "Allergies & verification",
        fields: [
          { id: "mf6", label: "Known allergies", type: "textarea", required: false, semantic: "client.allergies" },
          { id: "mf7", label: "Reconciled with bottle counts", type: "radio", required: true, semantic: "medication.reconciled", options: [{ label: "Yes - all counts match", score: 0 }, { label: "Discrepancy noted (see notes)", score: 0 }] },
          { id: "mf8", label: "Caregiver signature", type: "signature", required: true, semantic: "form.assessorSignature", autofill: { source: "logged-in caregiver", from: "currentUser", confidence: 0.96, safe: false } },
          { id: "mf9", label: "Signature date", type: "date", required: true, semantic: "form.signatureDate", autofill: { source: "today's date", from: "today", confidence: 0.99, safe: true } },
        ],
      },
    ],
  },
  workplaceViolence: {
    key: "workplaceViolence",
    sourceFilename: "Workplace_Violence_Policy_Acknowledgement.pdf",
    name: "Workplace Violence Acknowledgement",
    category: "Policy",
    description: "Employee acknowledgement of the workplace violence policy.",
    subject: "self",
    icon: "shield",
    estMin: 2,
    completedBy: ["caregiver"],
    interpretation: {
      purpose: "Confirm the caregiver has read and understood the policy.",
      audience: ["Caregiver"],
      recordType: "Policy acknowledgement",
      cadence: "At hire and annually",
      output: "Branded PDF summary",
      autofill: ["Employee name", "Today's date"],
    },
    sections: [
      {
        id: "ws1",
        title: "Policy",
        fields: [
          {
            id: "wf1",
            label: "Workplace Violence Prevention Policy",
            type: "policyText",
            body: "Dare to Care is committed to a safe environment for every employee, client, and visitor. Threats, intimidation, harassment, and acts of violence are prohibited at all worksites, including client homes. Employees must report any incident, threat, or unsafe condition to their supervisor immediately and may remove themselves from any situation they believe to be unsafe. Retaliation against anyone who reports in good faith is prohibited.",
          },
        ],
      },
      {
        id: "ws2",
        title: "Acknowledgement",
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
  caregiverActivity: {
    key: "caregiverActivity",
    sourceFilename: "CaregiverActivityReport.pdf",
    name: "Caregiver Activity Report",
    category: "Visit",
    description: "Shift log documenting tasks completed and time on site.",
    subject: "client",
    icon: "clock",
    estMin: 4,
    completedBy: ["caregiver", "officeManager"],
    interpretation: {
      purpose: "Document tasks completed, visit timing, and care notes for a client visit.",
      audience: ["Caregiver", "Office Manager"],
      recordType: "Visit record",
      cadence: "Every shift",
      output: "Branded PDF summary",
      autofill: ["Client profile", "Today's date"],
    },
    sections: [
      {
        id: "as1",
        title: "Visit details",
        fields: [
          { id: "af1", label: "Client full name", type: "text", required: true, autofill: { source: "client profile", from: "name", confidence: 0.98, safe: true } },
          { id: "af2", label: "Visit date", type: "date", required: true, autofill: { source: "today's date", from: "today", confidence: 0.99, safe: true } },
          { id: "af3", label: "Time in", type: "text", required: true, placeholder: "9:00 AM" },
          { id: "af4", label: "Time out", type: "text", required: true, placeholder: "1:00 PM" },
        ],
      },
      {
        id: "as2",
        title: "Tasks performed",
        fields: [
          { id: "af5", label: "Personal care & ADLs", type: "checkbox", required: true, options: [{ label: "Bathing / hygiene" }, { label: "Dressing / grooming" }, { label: "Mobility / transfers" }, { label: "Toileting" }, { label: "Meal preparation" }, { label: "Medication reminders" }, { label: "Light housekeeping" }, { label: "Companionship" }] },
          { id: "af6", label: "Notes / observations", type: "textarea", required: false, placeholder: "Changes in condition, concerns, follow-ups..." },
        ],
      },
      {
        id: "as3",
        title: "Sign-off",
        fields: [
          { id: "af7", label: "Caregiver signature", type: "signature", required: true, autofill: { source: "logged-in caregiver", from: "currentUser", confidence: 0.96, safe: false } },
          { id: "af8", label: "Date", type: "date", required: true, autofill: { source: "today's date", from: "today", confidence: 0.99, safe: true } },
        ],
      },
    ],
  },
  supervisoryVisit: {
    key: "supervisoryVisit",
    sourceFilename: "Supervisory_Visit_Form.pdf",
    name: "Supervisory Visit Form",
    category: "Supervisory",
    description: "Periodic supervisory visit documenting care quality and compliance.",
    subject: "client",
    icon: "users",
    estMin: 5,
    completedBy: ["officeManager", "admin"],
    interpretation: {
      purpose: "Record a supervisor's on-site review of care delivery and client feedback.",
      audience: ["Office Manager", "Admin"],
      recordType: "Supervisory record",
      cadence: "Every 60 to 90 days per client",
      output: "Branded PDF summary",
      autofill: ["Client profile", "Today's date"],
    },
    sections: [
      {
        id: "vs1",
        title: "Visit details",
        fields: [
          { id: "vf1", label: "Client full name", type: "text", required: true, autofill: { source: "client profile", from: "name", confidence: 0.98, safe: true } },
          { id: "vf2", label: "Visit date", type: "date", required: true, autofill: { source: "today's date", from: "today", confidence: 0.99, safe: true } },
          { id: "vf3", label: "Caregiver reviewed", type: "text", required: true },
        ],
      },
      {
        id: "vs2",
        title: "Quality review",
        fields: [
          { id: "vf4", label: "Care plan being followed", type: "radio", required: true, options: [{ label: "Yes" }, { label: "Partially" }, { label: "No" }] },
          { id: "vf5", label: "Client satisfaction", type: "radio", required: true, options: [{ label: "Satisfied" }, { label: "Neutral" }, { label: "Concerns noted" }] },
          { id: "vf6", label: "Home environment safe", type: "radio", required: true, options: [{ label: "Yes" }, { label: "Issues found" }] },
          { id: "vf7", label: "Findings & corrective actions", type: "textarea", required: false, placeholder: "Document findings and any actions taken..." },
        ],
      },
      {
        id: "vs3",
        title: "Sign-off",
        fields: [
          { id: "vf8", label: "Supervisor signature", type: "signature", required: true, autofill: { source: "logged-in user", from: "currentUser", confidence: 0.9, safe: false } },
          { id: "vf9", label: "Date", type: "date", required: true, autofill: { source: "today's date", from: "today", confidence: 0.99, safe: true } },
        ],
      },
    ],
  },
};

function buildSeedTemplates(createdBy = "System") {
  const now = new Date().toISOString();
  return Object.values(schemaLibrary).map((schema) => {
    const fieldCount = schema.sections.reduce((count, section) => {
      return count + section.fields.filter((field) => field.type !== "policyText" && field.type !== "computed").length;
    }, 0);

    return {
      id: `tpl_${schema.key}`,
      key: schema.key,
      name: schema.name,
      category: schema.category,
      description: schema.description,
      subject: schema.subject,
      completedBy: schema.completedBy,
      version: 1,
      status: ["fallRisk", "medicationList", "workplaceViolence", "caregiverActivity", "supervisoryVisit"].includes(schema.key) ? "published" : "draft",
      fieldCount,
      icon: schema.icon,
      sourceFilename: schema.sourceFilename,
      interpretation: schema.interpretation,
      sections: schema.sections,
      createdBy,
      createdAt: now,
      updatedAt: now,
      publishedAt: ["fallRisk", "medicationList", "workplaceViolence", "caregiverActivity", "supervisoryVisit"].includes(schema.key) ? now : null,
    };
  });
}

module.exports = {
  schemaLibrary,
  buildSeedTemplates,
};
