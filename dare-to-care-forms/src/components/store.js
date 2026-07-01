import { collection, doc, getDocs, setDoc, addDoc, updateDoc } from "firebase/firestore";
import { auth, db, firebaseConfig } from "../config/firebase";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";

const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);
import { DTC } from "./schemas.js";

const listeners = new Set();

// ─── Offline queue ─────────────────────────────────────────────────────────
const QUEUE_KEY = "dtc_offline_queue";

function getQueuedSubmissions() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; }
}

function queueSubmissionOffline(submission) {
  const queue = getQueuedSubmissions();
  const item = {
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...submission,
    queuedAt: new Date().toISOString(),
    status: "queued",
    schemaKey: submission.schemaKey,
    templateName: submission.templateName || submission.schemaKey,
    caregiverName: getStoredUser()?.name || "You",
  };
  queue.push(item);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  emit();
  return item;
}

function removeFromQueue(id) {
  const queue = getQueuedSubmissions().filter((item) => item.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  emit();
}

async function syncQueue() {
  const queue = getQueuedSubmissions();
  if (queue.length === 0) return;
  let synced = 0;
  for (const item of queue) {
    try {
      const { id: _id, queuedAt: _q, status: _s, templateName: _tn, caregiverName: _cn, ...payload } = item;
      await addDoc(collection(db, "submissions"), payload);
      removeFromQueue(item.id);
      synced++;
    } catch { /* still offline or server error — leave in queue */ }
  }
  if (synced > 0) await refresh();
}

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
  user: null, // Track current user manually from AuthContext if needed
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

async function fetchCollection(colName) {
  const snap = await getDocs(collection(db, colName));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function refresh() {
  const user = auth.currentUser;
  if (!user) { clearState(); return; }

  try {
    const requests = [
      fetchCollection("templates"),
      fetchCollection("clients"),
      fetchCollection("submissions"),
      fetchCollection("tasks"),
    ];

    // TODO: Need proper user role tracking to restrict this, fetching all for now.
    // In a real app with Firestore Rules, this would be restricted automatically.
    requests.push(fetchCollection("audit"));
    requests.push(fetchCollection("users"));

    const [templates, clients, submissions, tasks, audit, users] = await Promise.all(requests);
    state.templates = templates;
    state.clients = clients;
    state.submissions = submissions;
    state.tasks = tasks;
    state.audit = audit;
    state.users = users;
    
    // Find current user profile
    state.user = users.find(u => u.id === user.uid) || null;
    emit();
  } catch (error) {
    console.error("Refresh failed", error);
    throw error;
  }
}

// In Firebase, we rely on Auth state changes rather than custom events for the most part.
// But we keep this listener alive for backward compatibility with frontend.
window.addEventListener("dtc-auth-changed", () => { void refresh(); });
window.addEventListener("online", () => { void syncQueue().then(() => refresh()); });
auth.onAuthStateChanged((user) => {
  if (user) void refresh();
  else clearState();
});

export const DTCStore = {
  subscribe(listener) {
    listeners.add(listener);
    try { listener(); } catch { /* ignore */ }
    return () => listeners.delete(listener);
  },

  get currentUser() { return state.user; },
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
    const template = { key: schemaKey, status: "draft", schema: DTC.schemas[schemaKey], name: DTC.schemas[schemaKey]?.name || schemaKey };
    await setDoc(doc(db, "templates", schemaKey), template);
    await refresh();
    return template;
  },

  async saveTemplate(template) {
    await setDoc(doc(db, "templates", template.key), template);
    await refresh();
    return template;
  },

  async publishTemplate(key) {
    await updateDoc(doc(db, "templates", key), { status: "published" });
    await refresh();
    return { key, status: "published" };
  },

  async unpublishTemplate(key) {
    await updateDoc(doc(db, "templates", key), { status: "draft" });
    await refresh();
    return { key, status: "draft" };
  },

  async getTemplateVersions(key) {
    // Requires subcollection or complex logic in Firestore. Returning empty for now.
    return [];
  },

  // Submissions
  getSubmissions() { return state.submissions.slice(); },
  getQueuedSubmissions,

  async addSubmission(submission) {
    const docRef = await addDoc(collection(db, "submissions"), submission);
    await refresh();
    return { id: docRef.id, ...submission };
  },

  removeFromQueue,
  async syncQueue() { await syncQueue(); },

  async updateSubmission(id, patch) {
    await updateDoc(doc(db, "submissions", id), { status: patch.status });
    await refresh();
    return { id, ...patch };
  },

  async requestCorrection(id, note) {
    await updateDoc(doc(db, "submissions", id), { status: "correction_needed", correctionNote: note });
    await refresh();
    return { id, status: "correction_needed" };
  },

  async resubmitSubmission(id, payload) {
    await updateDoc(doc(db, "submissions", id), { ...payload, status: "submitted" });
    await refresh();
    return { id, status: "submitted" };
  },

  // Tasks
  getTasks() { return state.tasks.slice(); },

  async createTask(task) {
    const docRef = await addDoc(collection(db, "tasks"), task);
    await refresh();
    return { id: docRef.id, ...task };
  },

  async updateTask(id, patch) {
    await updateDoc(doc(db, "tasks", id), patch);
    await refresh();
    return { id, ...patch };
  },

  // Audit
  getAudit() { return state.audit.slice(); },

  // Users
  getUsers() { return state.users.slice(); },
  getToken() { return getStoredToken(); },

  async createUser(userInput) {
    const { email, password, ...rest } = userInput;
    const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const initials = rest.name.split(' ').map(s => s[0]).join('').toUpperCase().slice(0, 2) || '?';
    const docData = {
      ...rest,
      email: email.toLowerCase(),
      initials,
      status: "active",
      mustChangePassword: true, // Force new users to change their password
      createdAt: new Date().toISOString(),
      lastLoginAt: null
    };
    await setDoc(doc(db, "users", userCred.user.uid), docData);
    await refresh();
    return { id: userCred.user.uid, ...docData };
  },

  async updateUser(id, patch) {
    await updateDoc(doc(db, "users", id), patch);
    await refresh();
    return { id, ...patch };
  },

  async sendPasswordReset(email) {
    await sendPasswordResetEmail(auth, email);
  },

  // Clients
  async createClient(clientInput) {
    const docRef = await addDoc(collection(db, "clients"), clientInput);
    await refresh();
    return { id: docRef.id, ...clientInput };
  },

  async updateClient(id, patch) {
    await updateDoc(doc(db, "clients", id), patch);
    await refresh();
    return { id, ...patch };
  },

  async getClientAssignments(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    return { assignments: client?.assignedUsers || [] };
  },

  // Training
  async getMyTrainingProgress() {
    const user = auth.currentUser;
    if (!user) return {};
    const u = state.users.find((x) => x.id === user.uid);
    return u?.trainingProgress || {};
  },

  async completeTrainingModule(moduleId) {
    const user = auth.currentUser;
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), {
      [`trainingProgress.${moduleId}`]: new Date().toISOString()
    });
    await refresh();
  },

  async getUserTrainingProgress(userId) {
    const u = state.users.find((x) => x.id === userId);
    return { progress: u?.trainingProgress || {} };
  },

  async updateClientAssignments(clientId, userIds) {
    await updateDoc(doc(db, "clients", clientId), { assignedUsers: userIds });
    await refresh();
    return { assignments: userIds };
  },
};
