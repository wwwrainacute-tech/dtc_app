// @ts-ignore
import { getStoredToken, getStoredUser } from "../app/auth-storage.js";
import { DTC } from "./schemas.js";

const listeners = new Set();

const referenceLibrary = [
  { id: "lib_fallRisk", file: "Fall_Risk_Assessment.pdf", pages: 1, schemaKey: "fallRisk" },
  { id: "lib_medList", file: "Medication_List.pdf", pages: 1, schemaKey: "medicationList" },
  { id: "lib_wpv", file: "Workplace_Violence_Policy_Acknowledgement.pdf", pages: 1, schemaKey: "workplaceViolence" },
  { id: "lib_activity", file: "CaregiverActivityReport.pdf", pages: 1, schemaKey: "caregiverActivity" },
  { id: "lib_super", file: "Supervisory_Visit_Form.pdf", pages: 1, schemaKey: "supervisoryVisit" },
];

const state = {
  templates: [],
  clients: [],
  submissions: [],
  audit: [],
  users: [],
  tasks: [],
};

function emit() {
  listeners.forEach((listener) => {
    try { listener(); } catch { /* ignore */ }
  });
}

function clearState() {
  state.templates = [];
  state.clients = [];
  state.submissions = [];
  state.audit = [];
  state.users = [];
  state.tasks = [];
  emit();
}

async function apiFetch(path, init = {}) {
  const token = getStoredToken();
  const headers = new Headers(init.headers || {});

  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(path, { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

async function refresh() {
  const user = getStoredUser();
  if (!user || !getStoredToken()) { clearState(); return; }

  try {
    const requests = [
      apiFetch("/api/templates"),
      apiFetch("/api/clients"),
      apiFetch("/api/submissions"),
      apiFetch("/api/tasks"),
    ];

    if (user.role === "admin" || user.role === "officeManager") {
      requests.push(apiFetch("/api/audit"));
      requests.push(apiFetch("/api/users"));
    } else {
      requests.push(Promise.resolve([]));
      requests.push(Promise.resolve([]));
    }

    const [templates, clients, submissions, tasks, audit, users] = await Promise.all(requests);
    state.templates = templates;
    state.clients = clients;
    state.submissions = submissions;
    state.tasks = tasks;
    state.audit = audit;
    state.users = users;
    emit();
  } catch (error) {
    if (error instanceof Error && /Session expired|Authentication required/i.test(error.message)) {
      clearState(); return;
    }
    throw error;
  }
}

window.addEventListener("dtc-auth-changed", () => { void refresh(); });
if (getStoredToken()) { void refresh(); }

export const DTCStore = {
  subscribe(listener) {
    listeners.add(listener);
    try { listener(); } catch { /* ignore */ }
    return () => listeners.delete(listener);
  },

  get currentUser() { return getStoredUser(); },
  get clients() { return state.clients; },
  get users() { return state.users.slice(); },

  async refresh() { await refresh(); },
  reset() { clearState(); },

  getLibrary() {
    return referenceLibrary.map((item) => ({
      ...item,
      imported: state.templates.some((t) => t.key === item.schemaKey),
    }));
  },

  schemaName(schemaKey) {
    return state.templates.find((t) => t.key === schemaKey)?.name || DTC.schemas[schemaKey]?.name || schemaKey;
  },

  getTemplates() { return state.templates.slice(); },
  getPublishedTemplates() { return state.templates.filter((t) => t.status === "published"); },
  getTemplate(key) { return state.templates.find((t) => t.key === key) || null; },

  publishedKeysFor(role) {
    return state.templates
      .filter((t) => t.status === "published" && (!t.completedBy || t.completedBy.includes(role)))
      .map((t) => t.key);
  },

  async importTemplate(schemaKey) {
    const template = await apiFetch("/api/templates/import", { method: "POST", body: JSON.stringify({ schemaKey }) });
    await refresh();
    return template;
  },

  async saveTemplate(template) {
    const saved = await apiFetch(`/api/templates/${template.key}`, { method: "PUT", body: JSON.stringify(template) });
    await refresh();
    return saved;
  },

  async publishTemplate(key) {
    const template = await apiFetch(`/api/templates/${key}/publish`, { method: "POST" });
    await refresh();
    return template;
  },

  async unpublishTemplate(key) {
    const template = await apiFetch(`/api/templates/${key}/unpublish`, { method: "POST" });
    await refresh();
    return template;
  },

  async getTemplateVersions(key) {
    return apiFetch(`/api/templates/${key}/versions`);
  },

  // Submissions
  getSubmissions() { return state.submissions.slice(); },

  async addSubmission(submission) {
    const created = await apiFetch("/api/submissions", { method: "POST", body: JSON.stringify(submission) });
    await refresh();
    return created;
  },

  async updateSubmission(id, patch) {
    const updated = await apiFetch(`/api/submissions/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: patch.status }) });
    await refresh();
    return updated;
  },

  async requestCorrection(id, note) {
    const updated = await apiFetch(`/api/submissions/${id}/correction`, { method: "POST", body: JSON.stringify({ note }) });
    await refresh();
    return updated;
  },

  async resubmitSubmission(id, payload) {
    const updated = await apiFetch(`/api/submissions/${id}/resubmit`, { method: "POST", body: JSON.stringify(payload) });
    await refresh();
    return updated;
  },

  // Tasks
  getTasks() { return state.tasks.slice(); },

  async createTask(task) {
    const created = await apiFetch("/api/tasks", { method: "POST", body: JSON.stringify(task) });
    await refresh();
    return created;
  },

  async updateTask(id, patch) {
    const updated = await apiFetch(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    await refresh();
    return updated;
  },

  // Audit
  getAudit() { return state.audit.slice(); },

  // Users
  getUsers() { return state.users.slice(); },

  async createUser(userInput) {
    const created = await apiFetch("/api/users", { method: "POST", body: JSON.stringify(userInput) });
    await refresh();
    return created;
  },

  async updateUser(id, patch) {
    const updated = await apiFetch(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    await refresh();
    return updated;
  },

  // Clients
  async createClient(clientInput) {
    const created = await apiFetch("/api/clients", { method: "POST", body: JSON.stringify(clientInput) });
    await refresh();
    return created;
  },

  async updateClient(id, patch) {
    const updated = await apiFetch(`/api/clients/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    await refresh();
    return updated;
  },
};
