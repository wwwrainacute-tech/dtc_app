const crypto = require("crypto");
const path = require("path");
const { buildSeedTemplates } = require("./schema-library");

const isPostgres = !!process.env.DATABASE_URL;
let pgPool, sqliteDb;

if (isPostgres) {
  const { Pool } = require("pg");
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
  });
} else {
  const sqlite3 = require("sqlite3").verbose();
  const dbPath = path.resolve(__dirname, "dare_to_care.db");
  sqliteDb = new sqlite3.Database(dbPath);
}

const nowIso = () => new Date().toISOString();

// Convert SQLite '?' to Postgres '$1, $2'
function toPg(sql) {
  let i = 1;
  return sql.replace(/\?/g, () => `$${i++}`);
}

async function run(sql, params = []) {
  if (isPostgres) {
    // ON CONFLICT DO NOTHING translation
    let pgSql = sql.replace(/INSERT OR IGNORE INTO/gi, "INSERT INTO");
    if (pgSql.includes("INSERT INTO client_assignments")) {
      pgSql += " ON CONFLICT DO NOTHING";
    }
    const result = await pgPool.query(toPg(pgSql), params);
    return { changes: result.rowCount };
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.run(sql, params, function onRun(err) {
        if (err) reject(err); else resolve(this);
      });
    });
  }
}

async function get(sql, params = []) {
  if (isPostgres) {
    const result = await pgPool.query(toPg(sql), params);
    return result.rows[0] || null;
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.get(sql, params, (err, row) => {
        if (err) reject(err); else resolve(row || null);
      });
    });
  }
}

async function all(sql, params = []) {
  if (isPostgres) {
    const result = await pgPool.query(toPg(sql), params);
    return result.rows || [];
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) reject(err); else resolve(rows || []);
      });
    });
  }
}

async function addColumnIfNotExists(table, column, definition) {
  try {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (err) {
    if (!String(err.message).toLowerCase().includes("duplicate column") &&
        !String(err.message).toLowerCase().includes("already exists")) {
      throw err;
    }
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, expectedHash] = storedHash.split(":");
  const actualHash = crypto.scryptSync(password, salt, 64).toString("hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const actualBuffer = Buffer.from(actualHash, "hex");
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function buildInitials(name) {
  return String(name || "")
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0].toUpperCase()).join("");
}

function serialize(value) { return JSON.stringify(value ?? null); }

function parseJson(value, fallback) {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

// ─── Row mappers ───────────────────────────────────────────────────────────

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id, name: row.name, initials: row.initials,
    username: row.username, role: row.role, status: row.status,
    createdAt: row.created_at, lastLoginAt: row.last_login_at,
    passwordHash: row.password_hash,
    mustChangePassword: row.must_change_password === 1,
    tempPasswordExpiresAt: row.temp_password_expires_at,
    createdByAdminId: row.created_by_admin_id,
  };
}

function mapClient(row) {
  if (!row) return null;
  return {
    id: row.id, name: row.name, initials: row.initials,
    dob: row.dob, mrn: row.mrn, physician: row.physician,
    allergies: row.allergies, phone: row.phone, address: row.address,
    status: row.status, primaryContact: row.primary_contact,
    notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapTemplate(row) {
  if (!row) return null;
  return {
    id: row.id, key: row.key, name: row.name,
    category: row.category, description: row.description,
    subject: row.subject, completedBy: parseJson(row.completed_by_json, []),
    version: row.version, status: row.status, fieldCount: row.field_count,
    icon: row.icon, sourceFilename: row.source_filename,
    interpretation: parseJson(row.interpretation_json, {}),
    sections: parseJson(row.sections_json, []),
    createdBy: row.created_by, createdAt: row.created_at,
    updatedAt: row.updated_at, publishedAt: row.published_at,
  };
}

function mapSubmission(row) {
  if (!row) return null;
  return {
    id: row.id,
    schemaKey: row.template_key,
    templateKey: row.template_key,
    templateName: row.template_name,
    templateVersion: row.template_version,
    clientId: row.client_id,
    clientName: row.client_name,
    caregiverId: row.caregiver_id,
    caregiverName: row.caregiver_name,
    status: row.status,
    values: parseJson(row.values_json, {}),
    score: parseJson(row.score_json, {}),
    pdfPath: row.pdf_path,
    pdfUrl: row.pdf_url,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    reviewedById: row.reviewed_by_id,
    updatedAt: row.updated_at,
    correctionNote: row.correction_note || null,
    correctionHistory: parseJson(row.correction_history, []),
    signatureData: parseJson(row.signature_data, null),
  };
}

function mapTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    taskType: row.task_type,
    schemaKey: row.schema_key,
    clientId: row.client_id,
    clientName: row.client_name,
    assignedToId: row.assigned_to_id,
    assignedToName: row.assigned_to_name,
    dueDate: row.due_date,
    recurrence: row.recurrence,
    priority: row.priority,
    status: row.status,
    completedAt: row.completed_at,
    submissionId: row.submission_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAudit(row) {
  if (!row) return null;
  return {
    id: row.id, timestamp: row.timestamp,
    actorId: row.actor_id, actor: row.actor_name, role: row.role,
    action: row.action, targetType: row.target_type,
    targetId: row.target_id, target: row.target_label,
    meta: parseJson(row.meta_json, {}),
  };
}

// Seed data removed for production

// ─── initDB ────────────────────────────────────────────────────────────────

async function initDB() {
  // Drop tables for overhaul (ensures clean schema on next start)
  await run(`DROP TABLE IF EXISTS client_assignments`);
  await run(`DROP TABLE IF EXISTS sessions`);
  await run(`DROP TABLE IF EXISTS users`);

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL, initials TEXT NOT NULL,
      role TEXT NOT NULL, status TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      must_change_password INTEGER NOT NULL DEFAULT 1,
      temp_password_expires_at TEXT,
      created_by_admin_id TEXT,
      created_at TEXT NOT NULL, last_login_at TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL, initials TEXT NOT NULL, dob TEXT, mrn TEXT,
      physician TEXT, allergies TEXT, phone TEXT, address TEXT,
      status TEXT NOT NULL, primary_contact TEXT, notes TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS client_assignments (
      client_id TEXT NOT NULL, user_id TEXT NOT NULL,
      PRIMARY KEY (client_id, user_id),
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, category TEXT NOT NULL,
      description TEXT, subject TEXT NOT NULL, completed_by_json TEXT NOT NULL,
      version INTEGER NOT NULL, status TEXT NOT NULL, field_count INTEGER NOT NULL,
      icon TEXT, source_filename TEXT, interpretation_json TEXT NOT NULL,
      sections_json TEXT NOT NULL, created_by TEXT NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, published_at TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      template_key TEXT NOT NULL, template_name TEXT NOT NULL,
      template_version INTEGER NOT NULL, client_id TEXT, client_name TEXT,
      caregiver_id TEXT NOT NULL, caregiver_name TEXT NOT NULL,
      status TEXT NOT NULL, values_json TEXT NOT NULL, score_json TEXT NOT NULL,
      pdf_path TEXT NOT NULL, pdf_url TEXT NOT NULL,
      submitted_at TEXT NOT NULL, reviewed_at TEXT, updated_at TEXT NOT NULL,
      reviewed_by TEXT, reviewed_by_id TEXT,
      correction_note TEXT, correction_history TEXT, signature_data TEXT
    )
  `);

  // Migrate existing submissions table if columns don't exist yet
  await addColumnIfNotExists("submissions", "reviewed_by", "TEXT");
  await addColumnIfNotExists("submissions", "reviewed_by_id", "TEXT");
  await addColumnIfNotExists("submissions", "correction_note", "TEXT");
  await addColumnIfNotExists("submissions", "correction_history", "TEXT");
  await addColumnIfNotExists("submissions", "signature_data", "TEXT");

  await run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL, actor_id TEXT NOT NULL, actor_name TEXT NOT NULL,
      role TEXT NOT NULL, action TEXT NOT NULL, target_type TEXT NOT NULL,
      target_id TEXT NOT NULL, target_label TEXT NOT NULL, meta_json TEXT NOT NULL
    )
  `);

  // NEW: Tasks table
  await run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      task_type TEXT NOT NULL,
      schema_key TEXT,
      client_id TEXT,
      client_name TEXT,
      assigned_to_id TEXT NOT NULL,
      assigned_to_name TEXT NOT NULL,
      due_date TEXT NOT NULL,
      recurrence TEXT,
      priority TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'pending',
      completed_at TEXT,
      submission_id TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // NEW: Template version history
  await run(`
    CREATE TABLE IF NOT EXISTS template_versions (
      id TEXT PRIMARY KEY,
      template_key TEXT NOT NULL,
      version INTEGER NOT NULL,
      name TEXT NOT NULL,
      sections_json TEXT NOT NULL,
      snapshot_by TEXT NOT NULL,
      snapshotted_at TEXT NOT NULL
    )
  `);

  // ── Seed data ──────────────────────────────────────────────────────────
  // Seed data removed for production
}

// ─── User functions ────────────────────────────────────────────────────────

async function getUserByUsername(username) {
  const row = await get(`SELECT * FROM users WHERE lower(username) = lower(?)`, [username]);
  return mapUser(row);
}

async function getUserCount() {
  const row = await get(`SELECT COUNT(*) AS count FROM users`);
  return row ? parseInt(row.count, 10) : 0;
}

async function getUserById(id) {
  const row = await get(`SELECT * FROM users WHERE id = ?`, [id]);
  return mapUser(row);
}

async function listUsers() {
  const rows = await all(`SELECT * FROM users ORDER BY role, name`);
  return rows.map(mapUser);
}

async function createUser({ name, username, role, status = "active", password, mustChangePassword = 1, tempPasswordExpiresAt = null, createdByAdminId = null }) {
  const id = `u_${crypto.randomUUID().slice(0, 8)}`;
  const createdAt = nowIso();
  await run(
    `INSERT INTO users (id, username, name, initials, role, status, password_hash, must_change_password, temp_password_expires_at, created_by_admin_id, created_at, last_login_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, username, name, buildInitials(name), role, status, hashPassword(password), mustChangePassword, tempPasswordExpiresAt, createdByAdminId, createdAt, null],
  );
  return getUserById(id);
}

async function updateUser(id, { name, role, status, passwordHash, mustChangePassword, tempPasswordExpiresAt }) {
  const updatedFields = [];
  const params = [];
  if (name !== undefined) { updatedFields.push("name = ?", "initials = ?"); params.push(name, buildInitials(name)); }
  if (role !== undefined) { updatedFields.push("role = ?"); params.push(role); }
  if (status !== undefined) { updatedFields.push("status = ?"); params.push(status); }
  if (passwordHash !== undefined) { updatedFields.push("password_hash = ?"); params.push(passwordHash); }
  if (mustChangePassword !== undefined) { updatedFields.push("must_change_password = ?"); params.push(mustChangePassword ? 1 : 0); }
  if (tempPasswordExpiresAt !== undefined) { updatedFields.push("temp_password_expires_at = ?"); params.push(tempPasswordExpiresAt); }
  if (updatedFields.length === 0) return getUserById(id);
  params.push(id);
  await run(`UPDATE users SET ${updatedFields.join(", ")} WHERE id = ?`, params);
  return getUserById(id);
}

async function updateUserLastLogin(userId) {
  await run(`UPDATE users SET last_login_at = ? WHERE id = ?`, [nowIso(), userId]);
}

// ─── Session functions ─────────────────────────────────────────────────────

async function createSession(userId) {
  const token = crypto.randomUUID();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
  await run(`INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`, [token, userId, createdAt, expiresAt]);
  return token;
}

async function getSessionUser(token) {
  const row = await get(
    `SELECT s.token, s.expires_at, u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
    [token],
  );
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) { await deleteSession(token); return null; }
  return mapUser(row);
}

async function deleteSession(token) {
  await run(`DELETE FROM sessions WHERE token = ?`, [token]);
}

// ─── Client functions ──────────────────────────────────────────────────────

async function listClientsForUser(user) {
  let rows;
  if (user.role === "caregiver") {
    rows = await all(
      `SELECT c.* FROM clients c JOIN client_assignments ca ON ca.client_id = c.id WHERE ca.user_id = ? ORDER BY c.name`,
      [user.id],
    );
  } else {
    rows = await all(`SELECT * FROM clients ORDER BY name`);
  }
  return rows.map(mapClient);
}

async function createClient({ name, dob = "", mrn = "", physician = "", allergies = "", phone = "", address = "", primaryContact = "", notes = "", assignedUserIds = [] }) {
  const id = `c_${crypto.randomUUID().slice(0, 8)}`;
  const createdAt = nowIso();
  await run(
    `INSERT INTO clients (id, name, initials, dob, mrn, physician, allergies, phone, address, status, primary_contact, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, buildInitials(name), dob, mrn, physician, allergies, phone, address, "active", primaryContact, notes, createdAt, createdAt],
  );
  for (const userId of assignedUserIds) {
    await run(`INSERT OR IGNORE INTO client_assignments (client_id, user_id) VALUES (?, ?)`, [id, userId]);
  }
  const row = await get(`SELECT * FROM clients WHERE id = ?`, [id]);
  return mapClient(row);
}

async function updateClient(id, fields) {
  const allowed = ["name", "dob", "mrn", "physician", "allergies", "phone", "address", "primary_contact", "notes", "status"];
  const updates = [];
  const params = [];
  for (const [key, val] of Object.entries(fields)) {
    const col = key === "primaryContact" ? "primary_contact" : key;
    if (allowed.includes(col)) { updates.push(`${col} = ?`); params.push(val); }
  }
  if (fields.name) { updates.push("initials = ?"); params.push(buildInitials(fields.name)); }
  updates.push("updated_at = ?"); params.push(nowIso());
  params.push(id);
  await run(`UPDATE clients SET ${updates.join(", ")} WHERE id = ?`, params);
  const row = await get(`SELECT * FROM clients WHERE id = ?`, [id]);
  return mapClient(row);
}

// ─── Template functions ────────────────────────────────────────────────────

async function listTemplatesForUser(user) {
  const rows = await all(`SELECT * FROM templates ORDER BY updated_at DESC, name`);
  const templates = rows.map(mapTemplate);
  if (user.role === "admin") return templates;
  return templates.filter((t) => t.status === "published" && t.completedBy.includes(user.role));
}

async function getTemplateByKey(key) {
  const row = await get(`SELECT * FROM templates WHERE key = ?`, [key]);
  return mapTemplate(row);
}

async function saveTemplate(templateInput, actor) {
  const existing = await getTemplateByKey(templateInput.key);
  const updatedAt = nowIso();
  const fieldCount = (templateInput.sections || []).reduce((count, section) => {
    return count + (section.fields || []).filter((f) => f.type !== "policyText" && f.type !== "computed").length;
  }, 0);

  if (existing) {
    // Snapshot the current version before overwriting
    await run(
      `INSERT INTO template_versions (id, template_key, version, name, sections_json, snapshot_by, snapshotted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), existing.key, existing.version, existing.name,
       serialize(existing.sections), actor ? actor.name : "system", updatedAt],
    );

    await run(
      `UPDATE templates SET name = ?, category = ?, description = ?, subject = ?, completed_by_json = ?, field_count = ?,
         icon = ?, source_filename = ?, interpretation_json = ?, sections_json = ?, updated_at = ?, status = ?
       WHERE key = ?`,
      [templateInput.name, templateInput.category, templateInput.description, templateInput.subject,
       serialize(templateInput.completedBy), fieldCount, templateInput.icon,
       templateInput.sourceFilename || "", serialize(templateInput.interpretation),
       serialize(templateInput.sections), updatedAt, templateInput.status, templateInput.key],
    );
  } else {
    await run(
      `INSERT INTO templates (id, key, name, category, description, subject, completed_by_json, version, status, field_count,
         icon, source_filename, interpretation_json, sections_json, created_by, created_at, updated_at, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [templateInput.id || `tpl_${templateInput.key}`, templateInput.key, templateInput.name,
       templateInput.category, templateInput.description, templateInput.subject,
       serialize(templateInput.completedBy), templateInput.version || 1,
       templateInput.status || "draft", fieldCount, templateInput.icon || "file",
       templateInput.sourceFilename || "", serialize(templateInput.interpretation || {}),
       serialize(templateInput.sections || []), actor ? actor.name : "system",
       updatedAt, updatedAt,
       templateInput.status === "published" ? updatedAt : null],
    );
  }
  return getTemplateByKey(templateInput.key);
}

async function importTemplate(schemaKey, actor) {
  const existing = await getTemplateByKey(schemaKey);
  if (existing) return existing;
  const seedTemplate = buildSeedTemplates(actor.name).find((t) => t.key === schemaKey);
  if (!seedTemplate) return null;
  seedTemplate.status = "draft";
  seedTemplate.publishedAt = null;
  seedTemplate.updatedAt = nowIso();
  seedTemplate.createdAt = seedTemplate.updatedAt;
  seedTemplate.createdBy = actor.name;
  await saveTemplate(seedTemplate, actor);
  return getTemplateByKey(schemaKey);
}

async function publishTemplate(key) {
  const existing = await getTemplateByKey(key);
  if (!existing) return null;
  const nextVersion = existing.status === "published" ? existing.version + 1 : existing.version;
  const publishedAt = nowIso();
  await run(
    `UPDATE templates SET status = ?, version = ?, updated_at = ?, published_at = ? WHERE key = ?`,
    ["published", nextVersion, publishedAt, publishedAt, key],
  );
  return getTemplateByKey(key);
}

async function unpublishTemplate(key) {
  const existing = await getTemplateByKey(key);
  if (!existing) return null;
  await run(`UPDATE templates SET status = ?, updated_at = ? WHERE key = ?`, ["draft", nowIso(), key]);
  return getTemplateByKey(key);
}

async function getTemplateVersions(key) {
  const rows = await all(
    `SELECT * FROM template_versions WHERE template_key = ? ORDER BY snapshotted_at DESC`,
    [key],
  );
  return rows.map((row) => ({
    id: row.id, templateKey: row.template_key, version: row.version,
    name: row.name, sections: parseJson(row.sections_json, []),
    snapshotBy: row.snapshot_by, snapshottedAt: row.snapshotted_at,
  }));
}

// ─── Submission functions ──────────────────────────────────────────────────

async function listSubmissionsForUser(user) {
  let rows;
  if (user.role === "caregiver") {
    rows = await all(`SELECT * FROM submissions WHERE caregiver_id = ? ORDER BY submitted_at DESC`, [user.id]);
  } else {
    rows = await all(`SELECT * FROM submissions ORDER BY submitted_at DESC`);
  }
  return rows.map(mapSubmission);
}

async function insertSubmission(submission) {
  await run(
    `INSERT INTO submissions (id, template_key, template_name, template_version, client_id, client_name,
       caregiver_id, caregiver_name, status, values_json, score_json, pdf_path, pdf_url,
       submitted_at, reviewed_at, updated_at, reviewed_by, reviewed_by_id, correction_note,
       correction_history, signature_data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [submission.id, submission.templateKey, submission.templateName, submission.templateVersion,
     submission.clientId, submission.clientName, submission.caregiverId, submission.caregiverName,
     submission.status, serialize(submission.values), serialize(submission.score),
     submission.pdfPath, submission.pdfUrl, submission.submittedAt,
     submission.reviewedAt || null, submission.updatedAt,
     submission.reviewedBy || null, submission.reviewedById || null,
     null, serialize([]), serialize(submission.signatureData || null)],
  );
  const row = await get(`SELECT * FROM submissions WHERE id = ?`, [submission.id]);
  return mapSubmission(row);
}

async function getSubmissionById(id) {
  const row = await get(`SELECT * FROM submissions WHERE id = ?`, [id]);
  return mapSubmission(row);
}

async function getSubmissionByPdfUrl(pdfUrl) {
  const row = await get(`SELECT * FROM submissions WHERE pdf_url = ?`, [pdfUrl]);
  return mapSubmission(row);
}

async function updateSubmissionStatus(id, status, actor, note) {
  const existing = await getSubmissionById(id);
  if (!existing) return null;
  const updatedAt = nowIso();

  // Build correction history entry
  const history = existing.correctionHistory || [];
  history.push({
    status,
    timestamp: updatedAt,
    actorId: actor ? actor.id : "system",
    actorName: actor ? actor.name : "System",
    role: actor ? actor.role : "system",
    note: note || null,
  });

  const reviewedAt = status === "reviewed" ? updatedAt : existing.reviewedAt;
  const reviewedBy = status === "reviewed" && actor ? actor.name : existing.reviewedBy;
  const reviewedById = status === "reviewed" && actor ? actor.id : existing.reviewedById;
  const correctionNote = status === "needsCorrection" ? (note || null) : existing.correctionNote;

  await run(
    `UPDATE submissions SET status = ?, reviewed_at = ?, reviewed_by = ?, reviewed_by_id = ?,
       correction_note = ?, correction_history = ?, updated_at = ?
     WHERE id = ?`,
    [status, reviewedAt, reviewedBy, reviewedById, correctionNote, serialize(history), updatedAt, id],
  );
  return getSubmissionById(id);
}

async function resubmitSubmission(id, { values, score, pdfPath, pdfUrl, signatureData }) {
  const existing = await getSubmissionById(id);
  if (!existing) return null;
  const updatedAt = nowIso();

  const history = existing.correctionHistory || [];
  history.push({
    status: "submitted",
    timestamp: updatedAt,
    actorId: existing.caregiverId,
    actorName: existing.caregiverName,
    role: "caregiver",
    note: "Resubmitted after correction",
  });

  await run(
    `UPDATE submissions SET status = 'submitted', values_json = ?, score_json = ?, pdf_path = ?,
       pdf_url = ?, signature_data = ?, correction_note = NULL, correction_history = ?, updated_at = ?
     WHERE id = ?`,
    [serialize(values), serialize(score), pdfPath, pdfUrl,
     serialize(signatureData || null), serialize(history), updatedAt, id],
  );
  return getSubmissionById(id);
}

// ─── Task functions ────────────────────────────────────────────────────────

async function listTasksForUser(user) {
  let rows;
  if (user.role === "caregiver") {
    rows = await all(
      `SELECT * FROM tasks WHERE assigned_to_id = ? ORDER BY due_date ASC, priority DESC`,
      [user.id],
    );
  } else {
    rows = await all(`SELECT * FROM tasks ORDER BY due_date ASC, priority DESC`);
  }
  return rows.map(mapTask);
}

async function createTask({ title, taskType, schemaKey, clientId, clientName, assignedToId, assignedToName, dueDate, recurrence, priority, createdBy }) {
  const id = `task_${crypto.randomUUID().slice(0, 8)}`;
  const createdAt = nowIso();
  await run(
    `INSERT INTO tasks (id, title, task_type, schema_key, client_id, client_name, assigned_to_id, assigned_to_name,
       due_date, recurrence, priority, status, completed_at, submission_id, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, NULL, ?, ?, ?)`,
    [id, title, taskType, schemaKey || null, clientId || null, clientName || null,
     assignedToId, assignedToName, dueDate, recurrence || null, priority || "normal",
     createdBy, createdAt, createdAt],
  );
  const row = await get(`SELECT * FROM tasks WHERE id = ?`, [id]);
  return mapTask(row);
}

async function updateTask(id, { status, completedAt, submissionId }) {
  const updatedAt = nowIso();
  await run(
    `UPDATE tasks SET status = ?, completed_at = ?, submission_id = ?, updated_at = ? WHERE id = ?`,
    [status, completedAt || null, submissionId || null, updatedAt, id],
  );
  const row = await get(`SELECT * FROM tasks WHERE id = ?`, [id]);
  return mapTask(row);
}

// ─── Audit functions ───────────────────────────────────────────────────────

async function createAuditEvent({ actorId = "system", actorName = "System", role = "system", action, targetType, targetId, targetLabel, metadata = {} }) {
  await run(
    `INSERT INTO audit_logs (id, timestamp, actor_id, actor_name, role, action, target_type, target_id, target_label, meta_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), nowIso(), actorId, actorName, role, action, targetType, targetId, targetLabel, serialize(metadata)],
  );
}

async function listAudit(limit = 200) {
  const rows = await all(`SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?`, [limit]);
  return rows.map(mapAudit);
}

// ─── Exports ───────────────────────────────────────────────────────────────

module.exports = {
  all, run, get,
  createAuditEvent,
  createClient,
  updateClient,
  createSession,
  createTask,
  createUser,
  deleteSession,
  getSessionUser,
  getSubmissionById,
  getSubmissionByPdfUrl,
  getTemplateByKey,
  getTemplateVersions,
  getUserByUsername,
  getUserCount,
  getUserById,
  hashPassword,
  initDB,
  importTemplate,
  insertSubmission,
  listAudit,
  listClientsForUser,
  listSubmissionsForUser,
  listTasksForUser,
  listTemplatesForUser,
  listUsers,
  publishTemplate,
  resubmitSubmission,
  saveTemplate,
  unpublishTemplate,
  updateSubmissionStatus,
  updateTask,
  updateUser,
  updateUserLastLogin,
  verifyPassword,
};
