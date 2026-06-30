// @ts-ignore
import { getStoredUser } from "../app/auth-storage.js";

const TODAY_ISO = new Date().toISOString().slice(0, 10);


const schemas = {
  fallRisk: {
    key: "fallRisk",
    name: "Fall Risk Assessment",
    category: "Clinical",
    version: 1,
    estMin: 3,
    icon: "activity",
    description: "Morse-style scale used at intake and quarterly review.",
    subject: "client",
    completedBy: ["caregiver", "officeManager"],
    interpretation: {
      purpose: "Score a client's likelihood of falling and produce a signed record.",
      cadence: "On intake, quarterly, and after any incident",
    },
    sections: [
      {
        id: "s1",
        title: "Client identification",
        fields: [
          { id: "f1", label: "Client full name", type: "text", required: true, autofill: { source: "client profile", from: "name", confidence: 0.98, safe: true } },
          { id: "f2", label: "Date of birth", type: "date", required: true, autofill: { source: "client profile", from: "dob", confidence: 0.97, safe: true } },
          { id: "f3", label: "Medical record number", type: "text", required: false, autofill: { source: "client profile", from: "mrn", confidence: 0.91, safe: true } },
          { id: "f4", label: "Assessment date", type: "date", required: true, autofill: { source: "today's date", from: "today", confidence: 0.95, safe: true } },
        ],
      },
      {
        id: "s2",
        title: "History",
        fields: [
          { id: "f5", label: "History of falling (within 3 months)", type: "radio", required: true, options: [{ label: "No", score: 0 }, { label: "Yes", score: 25 }] },
          { id: "f6", label: "Secondary diagnosis", type: "radio", required: true, options: [{ label: "No", score: 0 }, { label: "Yes", score: 15 }] },
        ],
      },
      {
        id: "s3",
        title: "Ambulatory aid & gait",
        fields: [
          { id: "f7", label: "Ambulatory aid", type: "radio", required: true, options: [{ label: "None / bed rest / wheelchair / nurse", score: 0 }, { label: "Crutches / cane / walker", score: 15 }, { label: "Furniture", score: 30 }] },
          { id: "f8", label: "IV / heparin lock", type: "radio", required: true, options: [{ label: "No", score: 0 }, { label: "Yes", score: 20 }] },
          { id: "f9", label: "Gait / transferring", type: "radio", required: true, options: [{ label: "Normal / bedrest / immobile", score: 0 }, { label: "Weak", score: 10 }, { label: "Impaired", score: 20 }] },
          { id: "f10", label: "Mental status", type: "radio", required: true, options: [{ label: "Oriented to own ability", score: 0 }, { label: "Forgets limitations", score: 15 }] },
        ],
      },
      {
        id: "s4",
        title: "Plan & sign-off",
        fields: [
          { id: "f11", label: "Total score", type: "computed", formula: "sum" },
          { id: "f12", label: "Risk level", type: "computed", formula: "tier" },
          { id: "f13", label: "Interventions / notes", type: "textarea", required: false, placeholder: "Document interventions, supervision level, equipment..." },
          { id: "f14", label: "Assessor signature", type: "signature", required: true, autofill: { source: "logged-in caregiver", from: "currentUser", confidence: 0.96, safe: false } },
          { id: "f15", label: "Signature date", type: "date", required: true, autofill: { source: "today's date", from: "today", confidence: 0.99, safe: true } },
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
    name: "Medication List",
    category: "Clinical",
    version: 1,
    estMin: 4,
    icon: "pill",
    description: "Current medications, reconciled against bottle counts each shift.",
    subject: "client",
    completedBy: ["caregiver", "officeManager"],
    interpretation: {
      purpose: "Maintain the current medication regimen and reconcile counts.",
      cadence: "On admission and at each medication change",
    },
    sections: [
      {
        id: "ms1",
        title: "Client identification",
        fields: [
          { id: "mf1", label: "Client full name", type: "text", required: true, autofill: { source: "client profile", from: "name", confidence: 0.98, safe: true } },
          { id: "mf2", label: "Date of birth", type: "date", required: true, autofill: { source: "client profile", from: "dob", confidence: 0.97, safe: true } },
          { id: "mf3", label: "Primary physician", type: "text", required: true, autofill: { source: "client profile", from: "physician", confidence: 0.84, safe: true } },
          { id: "mf4", label: "Review date", type: "date", required: true, autofill: { source: "today's date", from: "today", confidence: 0.99, safe: true } },
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
        id: "ms3",
        title: "Allergies & verification",
        fields: [
          { id: "mf6", label: "Known allergies", type: "textarea", required: false, autofill: { source: "client profile", from: "allergies", confidence: 0.8, safe: true }, placeholder: "List known allergies and reactions..." },
          { id: "mf7", label: "Reconciled with bottle counts", type: "radio", required: true, options: [{ label: "Yes - all counts match", score: 0 }, { label: "Discrepancy noted (see notes)", score: 0 }] },
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
    description: "Reusable acknowledgement pattern for annual compliance.",
    subject: "self",
    completedBy: ["caregiver"],
    interpretation: {
      purpose: "Confirm the caregiver has read and understood the policy.",
      cadence: "At hire and annually",
    },
    sections: [
      {
        id: "ws1",
        title: "Policy",
        fields: [
          {
            id: "wf1",
            type: "policyText",
            label: "Workplace Violence Prevention Policy",
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
    name: "Caregiver Activity Report",
    category: "Visit",
    version: 1,
    estMin: 4,
    icon: "clock",
    description: "Shift / visit log of tasks performed and time on site.",
    subject: "client",
    completedBy: ["caregiver", "officeManager"],
    interpretation: {
      purpose: "Document tasks completed and hours for a client visit.",
      cadence: "Every shift",
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
    name: "Supervisory Visit Form",
    category: "Supervisory",
    version: 1,
    estMin: 5,
    icon: "users",
    description: "Periodic supervisory visit documenting care quality and compliance.",
    subject: "client",
    completedBy: ["officeManager", "admin"],
    interpretation: {
      purpose: "Record a supervisor's on-site review of care delivery.",
      cadence: "Every 60 to 90 days per client",
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

const formMeta = {
  fallRisk: { subject: "client" },
  medicationList: { subject: "client" },
  workplaceViolence: { subject: "self" },
  caregiverActivity: { subject: "client" },
  supervisoryVisit: { subject: "client" },
};

function resolveAutofill(field, ctx) {
  const autofill = field.autofill;
  if (!autofill) {
    return null;
  }

  if (autofill.from === "today") {
    return TODAY_ISO;
  }

  if (autofill.from === "currentUser") {
    return ctx.currentUser ? ctx.currentUser.name || ctx.currentUser.label || "" : "";
  }

  if (ctx.client && autofill.from in ctx.client) {
    return ctx.client[autofill.from];
  }

  return null;
}

function computeScore(schema, values) {
  let total = 0;

  schema.sections.forEach((section) => {
    section.fields.forEach((field) => {
      if (field.type !== "radio" || !Array.isArray(field.options)) {
        return;
      }

      const selected = values[field.id];
      const option = field.options.find((item) => item.label === selected);
      if (option && typeof option.score === "number") {
        total += option.score;
      }
    });
  });

  let tier = null;
  if (schema.tiers) {
    tier = schema.tiers.find((item) => total <= item.max) || schema.tiers[schema.tiers.length - 1];
  }

  return { total, tier };
}

function hasScoring(schema) {
  return schema.sections.some((section) => section.fields.some((field) => field.type === "computed"));
}

function invalidFieldsInSection(section, values) {
  const invalid = [];

  section.fields.forEach((field) => {
    if (!field.required) {
      return;
    }

    const value = values[field.id];
    if (field.type === "checkbox") {
      if (!value || (Array.isArray(value) && value.length === 0)) {
        invalid.push(field.id);
      }
      return;
    }

    if (field.type === "table") {
      if (!Array.isArray(value) || !value.some((row) => Object.values(row || {}).some(Boolean))) {
        invalid.push(field.id);
      }
      return;
    }

    if (field.type === "signature") {
      if (!value) {
        invalid.push(field.id);
      }
      return;
    }

    if (value === undefined || value === null || String(value).trim() === "") {
      invalid.push(field.id);
    }
  });

  return invalid;
}

export const DTC = {
  TODAY_ISO,
  get currentUser() {
    return getStoredUser();
  },
  schemas,
  formMeta,
  resolveAutofill,
  computeScore,
  hasScoring,
  invalidFieldsInSection,
  formList: Object.keys(schemas),
};
