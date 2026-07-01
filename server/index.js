const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const { getStore } = require("@netlify/blobs");
const {
  createAuditEvent, createClient, updateClient, updateClientAssignments, getClientAssignments,
  createSession, createTask, getTaskById,
  createUser, deleteSession, getSessionUser, getSubmissionById, getSubmissionByPdfUrl,
  getTemplateByKey, getTemplateVersions, getUserByUsername, getUserCount, getUserById,
  getTrainingProgressForUser, markTrainingModuleComplete,
  importTemplate, initDB, insertSubmission, listAudit, listClientsForUser,
  listSubmissionsForUser, listTasksForUser, listTemplatesForUser, listUsers,
  publishTemplate, resubmitSubmission, saveTemplate, unpublishTemplate,
  updateSubmissionStatus, updateTask, updateUser, updateUserLastLogin,
  verifyPassword, hashPassword,
} = require("./db");

const app = express();
const isNetlifyBlobs = process.env.FILE_STORAGE_PROVIDER === "netlify-blobs";
const storageRoot = path.join(__dirname, "storage");
const pdfRoot = path.join(storageRoot, "pdfs");
const trainingRoot = path.join(storageRoot, "training");

if (!isNetlifyBlobs) {
  fs.mkdirSync(pdfRoot, { recursive: true });
  fs.mkdirSync(trainingRoot, { recursive: true });
}

// ─── New-hire training module catalog ──────────────────────────────────────
const TRAINING_MODULES = {
  emergency: { title: "Emergency Preparedness & Disaster Planning", file: "emergency.mp4" },
  home_safety: { title: "Home Safety", file: "home_safety.mp4" },
  first_aid: { title: "First Aid & Basic Life Safety", file: "first_aid.mp4" },
  infection: { title: "Infection Control", file: "infection.mp4" },
  consumer_rights: { title: "Consumer Rights & Responsibilities", file: "consumer_rights.mp4" },
};

// ─── Basic rate limiter (no extra deps) ────────────────────────────────────
const loginAttempts = new Map();
function rateLimit(windowMs, max) {
  return (req, res, next) => {
    const key = getRequestIp(req);
    const now = Date.now();
    const record = loginAttempts.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > record.resetAt) { record.count = 0; record.resetAt = now + windowMs; }
    record.count++;
    loginAttempts.set(key, record);
    if (record.count > max) {
      res.status(429).json({ error: "Too many attempts. Please wait a minute." });
      return;
    }
    next();
  };
}

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ─── Auth helpers ───────────────────────────────────────────────────────────
function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id, name: user.name, initials: user.initials, username: user.username,
    role: user.role, status: user.status, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt,
    mustChangePassword: user.mustChangePassword,
  };
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7);
}

function getRequestIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress || "";
}

async function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) { res.status(401).json({ error: "Authentication required." }); return; }
  const user = await getSessionUser(token);
  if (!user) { res.status(401).json({ error: "Session expired. Please sign in again." }); return; }
  req.authToken = token;
  req.user = user;
  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: "You do not have permission to do that." }); return;
    }
    next();
  };
}

// <video>/<audio> elements can't set an Authorization header, so this variant
// also accepts the session token as a query param for media file routes.
async function requireAuthOrQueryToken(req, res, next) {
  const token = getBearerToken(req) || (typeof req.query.token === "string" ? req.query.token : null);
  if (!token) { res.status(401).json({ error: "Authentication required." }); return; }
  const user = await getSessionUser(token);
  if (!user) { res.status(401).json({ error: "Session expired. Please sign in again." }); return; }
  req.authToken = token;
  req.user = user;
  next();
}

// ─── Auth-protected static PDF serving ─────────────────────────────────────
app.get("/api/files/pdfs/:filename", requireAuth, async (req, res) => {
  try {
    const safeFilename = path.basename(req.params.filename);
    const pdfUrl = `/api/files/pdfs/${safeFilename}`;
    const submission = await getSubmissionByPdfUrl(pdfUrl);
    
    if (submission && req.user.role === "caregiver" && submission.caregiver_id !== req.user.id && submission.caregiverId !== req.user.id) {
      res.status(403).json({ error: "Access denied. You can only view your own submissions." }); return;
    }

    if (isNetlifyBlobs) {
      const store = getStore("pdfs");
      const blob = await store.get(safeFilename, { type: "stream" });
      if (!blob) { res.status(404).json({ error: "File not found." }); return; }
      res.setHeader("Content-Type", "application/pdf");
      blob.pipe(res);
    } else {
      const filePath = path.join(pdfRoot, safeFilename);
      if (!fs.existsSync(filePath)) { res.status(404).json({ error: "File not found." }); return; }
      res.sendFile(filePath);
    }
  } catch (error) {
    res.status(500).json({ error: "Error retrieving file." });
  }
});

// ─── Auth-protected training video serving ─────────────────────────────────
app.get("/api/files/training/:moduleId", requireAuthOrQueryToken, async (req, res) => {
  try {
    const trainingModule = TRAINING_MODULES[req.params.moduleId];
    if (!trainingModule) { res.status(404).json({ error: "Unknown training module." }); return; }

    if (isNetlifyBlobs) {
      const store = getStore("training");
      const blob = await store.get(trainingModule.file, { type: "stream" });
      if (!blob) { res.status(404).json({ error: "Video not found." }); return; }
      res.setHeader("Content-Type", "video/mp4");
      blob.pipe(res);
      return;
    }

    const filePath = path.join(trainingRoot, trainingModule.file);
    if (!fs.existsSync(filePath)) { res.status(404).json({ error: "Video not found." }); return; }

    const stat = fs.statSync(filePath);
    const range = req.headers.range;
    if (!range) {
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Length", stat.size);
      res.setHeader("Accept-Ranges", "bytes");
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
    if (Number.isNaN(start) || start >= stat.size) {
      res.status(416).setHeader("Content-Range", `bytes */${stat.size}`).end();
      return;
    }

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Content-Type": "video/mp4",
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving video." });
  }
});

// ─── New-hire training progress ────────────────────────────────────────────
app.get("/api/training/progress", requireAuth, async (req, res) => {
  try {
    const progress = await getTrainingProgressForUser(req.user.id);
    const byModule = {};
    for (const entry of progress) byModule[entry.moduleId] = entry.completedAt;
    res.json(byModule);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/training/:moduleId/complete", requireAuth, async (req, res) => {
  try {
    const trainingModule = TRAINING_MODULES[req.params.moduleId];
    if (!trainingModule) { res.status(404).json({ error: "Unknown training module." }); return; }

    const progress = await markTrainingModuleComplete(req.user.id, req.params.moduleId);
    await createAuditEvent({
      actorId: req.user.id, actorName: req.user.name, role: req.user.role,
      action: "completed_training_module", targetType: "trainingModule", targetId: req.params.moduleId,
      targetLabel: trainingModule.title, metadata: {},
    });
    res.json(progress);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get("/api/admin/training/:userId", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const targetUser = await getUserById(req.params.userId);
    if (!targetUser) { res.status(404).json({ error: "User not found." }); return; }
    const progress = await getTrainingProgressForUser(req.params.userId);
    const byModule = {};
    for (const entry of progress) byModule[entry.moduleId] = entry.completedAt;
    res.json({ modules: Object.keys(TRAINING_MODULES), progress: byModule });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ─── PDF generation ─────────────────────────────────────────────────────────
const COLOR = {
  brand: rgb(0.08, 0.36, 0.25),
  brandLight: rgb(0.85, 0.95, 0.89),
  brandMid: rgb(0.12, 0.5, 0.36),
  black: rgb(0.1, 0.12, 0.14),
  ink2: rgb(0.25, 0.3, 0.34),
  ink3: rgb(0.5, 0.55, 0.58),
  ink4: rgb(0.72, 0.75, 0.77),
  white: rgb(1, 1, 1),
  amber: rgb(0.85, 0.55, 0.1),
  amberLight: rgb(0.99, 0.96, 0.88),
  green: rgb(0.08, 0.6, 0.35),
  greenLight: rgb(0.88, 0.97, 0.91),
  red: rgb(0.78, 0.15, 0.15),
  redLight: rgb(0.99, 0.9, 0.9),
  lineRule: rgb(0.88, 0.9, 0.91),
  sectionBg: rgb(0.95, 0.97, 0.96),
};

function wrapText(text, font, size, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    try {
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    } catch {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

async function generateSubmissionPdf({ submissionId, template, values, score, clientName, clientData, userName, submittedAt, reviewedBy, reviewedAt, correctionHistory, signatureData }) {
  const pdfDoc = await PDFDocument.create();
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const pageW = 612;
  const pageH = 792;
  const marginL = 48;
  const marginR = 48;
  const contentW = pageW - marginL - marginR;

  let pages = [pdfDoc.addPage([pageW, pageH])];
  let pageIndex = 0;
  let curY = pageH - 48;

  function currentPage() { return pages[pageIndex]; }

  function newPage() {
    pages.push(pdfDoc.addPage([pageW, pageH]));
    pageIndex++;
    curY = pageH - 48;
    drawPageHeader();
  }

  function ensureSpace(needed) {
    if (curY - needed < 60) newPage();
  }

  function drawRect({ x, y, w, h, color, borderColor, borderWidth = 0 }) {
    const pg = currentPage();
    pg.drawRectangle({ x, y: y - h, width: w, height: h, color });
    if (borderColor && borderWidth > 0) {
      pg.drawRectangle({ x, y: y - h, width: w, height: h, color: undefined, borderColor, borderWidth });
    }
  }

  function text(str, { x = marginL, y, size = 10, font = fontReg, color = COLOR.black, maxWidth } = {}) {
    if (maxWidth) {
      const lines = wrapText(str, font, size, maxWidth);
      let ly = y;
      for (const line of lines) {
        currentPage().drawText(line, { x, y: ly, size, font, color });
        ly -= size + 4;
      }
      return y - ly; // height consumed
    }
    currentPage().drawText(String(str || ""), { x, y, size, font, color });
    return 0;
  }

  function hRule(y, color = COLOR.lineRule) {
    currentPage().drawLine({ start: { x: marginL, y }, end: { x: pageW - marginR, y }, thickness: 0.5, color });
  }

  // ── Cover header bar ──────────────────────────────────────────────────────
  function drawCoverHeader() {
    const pg = pages[0];
    const barH = 110;
    pg.drawRectangle({ x: 0, y: pageH - barH, width: pageW, height: barH, color: COLOR.brand });

    // Accent stripe
    pg.drawRectangle({ x: 0, y: pageH - barH, width: 6, height: barH, color: COLOR.brandMid });

    // Organization name
    pg.drawText("Dare to Care", { x: marginL, y: pageH - 38, size: 22, font: fontBold, color: COLOR.white });

    // Form name
    pg.drawText(template.name, { x: marginL, y: pageH - 64, size: 13, font: fontReg, color: rgb(0.82, 0.95, 0.88) });

    // Submission ID top-right
    pg.drawText(`ID: ${submissionId}`, { x: pageW - marginR - 140, y: pageH - 38, size: 8, font: fontReg, color: rgb(0.7, 0.88, 0.78) });
    pg.drawText(`v${template.version} · ${new Date(submittedAt).toLocaleDateString()}`, { x: pageW - marginR - 140, y: pageH - 52, size: 8, font: fontReg, color: rgb(0.7, 0.88, 0.78) });

    // Status badge
    const statusColor = { reviewed: COLOR.green, needsCorrection: COLOR.amber, submitted: COLOR.ink3 };
    const statusLabel = { reviewed: "REVIEWED", needsCorrection: "NEEDS CORRECTION", submitted: "SUBMITTED" };
    const sc = statusColor[template._status] || COLOR.ink3;
    const sl = statusLabel[template._status] || "SUBMITTED";
    pg.drawRectangle({ x: pageW - marginR - 140, y: pageH - 72, width: 140, height: 14, color: rgb(1, 1, 1) });
    pg.drawText(sl, { x: pageW - marginR - 136, y: pageH - 84, size: 7.5, font: fontBold, color: sc });
  }

  // ── Page header (non-cover pages) ─────────────────────────────────────────
  function drawPageHeader() {
    const pg = currentPage();
    pg.drawRectangle({ x: 0, y: pageH - 32, width: pageW, height: 32, color: COLOR.brand });
    pg.drawText("Dare to Care", { x: marginL, y: pageH - 22, size: 10, font: fontBold, color: COLOR.white });
    pg.drawText(template.name, { x: marginL + 90, y: pageH - 22, size: 9, font: fontReg, color: rgb(0.8, 0.93, 0.86) });
    pg.drawText(submissionId, { x: pageW - marginR - 130, y: pageH - 22, size: 8, font: fontReg, color: rgb(0.7, 0.87, 0.78) });
    curY = pageH - 50;
  }

  // ── Footers ───────────────────────────────────────────────────────────────
  function addFooters() {
    const totalPages = pages.length;
    pages.forEach((pg, i) => {
      pg.drawLine({ start: { x: marginL, y: 44 }, end: { x: pageW - marginR, y: 44 }, thickness: 0.4, color: COLOR.lineRule });
      pg.drawText("Dare to Care · CONFIDENTIAL · FOR AUTHORIZED USE ONLY", { x: marginL, y: 30, size: 7.5, font: fontReg, color: COLOR.ink4 });
      pg.drawText(`${submissionId} · ${template.key}`, { x: marginL, y: 20, size: 7, font: fontReg, color: COLOR.ink4 });
      pg.drawText(`Page ${i + 1} of ${totalPages}`, { x: pageW - marginR - 60, y: 30, size: 7.5, font: fontReg, color: COLOR.ink4 });
    });
  }

  // ── Section heading ───────────────────────────────────────────────────────
  function drawSectionHeading(title) {
    ensureSpace(30);
    drawRect({ x: marginL, y: curY, w: contentW, h: 22, color: COLOR.sectionBg });
    currentPage().drawText(title.toUpperCase(), { x: marginL + 8, y: curY - 15, size: 8.5, font: fontBold, color: COLOR.brandMid });
    hRule(curY - 22, COLOR.brandLight);
    curY -= 30;
  }

  // ── Field row ─────────────────────────────────────────────────────────────
  function drawFieldRow(label, value, opts = {}) {
    const { mono = false, highlight } = opts;
    const labelW = 190;
    const valW = contentW - labelW - 10;
    const valStr = String(value || "—");
    const valFont = mono ? fontOblique : fontReg;
    const wrappedVal = wrapText(valStr, valFont, 9.5, valW);
    const rowH = Math.max(16, wrappedVal.length * 13 + 6);

    ensureSpace(rowH + 4);

    if (highlight) {
      drawRect({ x: marginL, y: curY, w: contentW, h: rowH, color: highlight });
    }

    text(label, { x: marginL + 4, y: curY - 12, size: 9, font: fontBold, color: COLOR.ink2 });
    wrappedVal.forEach((line, i) => {
      text(line, { x: marginL + labelW, y: curY - 12 - i * 13, size: 9.5, font: valFont, color: COLOR.black });
    });
    hRule(curY - rowH, COLOR.lineRule);
    curY -= rowH + 2;
  }

  // ── Two-column metadata block ──────────────────────────────────────────────
  function drawMetaBlock() {
    ensureSpace(120);
    const colW = (contentW - 16) / 2;

    // Left column: Client details
    const leftItems = [
      { label: "Client", value: clientName || "Employee form / No client" },
      { label: "Date of birth", value: clientData?.dob || "—" },
      { label: "MRN", value: clientData?.mrn || "—" },
      { label: "Physician", value: clientData?.physician || "—" },
      { label: "Allergies", value: clientData?.allergies || "—" },
    ];
    // Right column: Submission details
    const rightItems = [
      { label: "Submission ID", value: submissionId },
      { label: "Completed by", value: userName },
      { label: "Submitted", value: new Date(submittedAt).toLocaleString() },
      { label: "Template", value: `${template.name} v${template.version}` },
      { label: "Category", value: template.category },
    ];

    const startY = curY;
    // Left box
    drawRect({ x: marginL, y: curY, w: colW, h: 2, color: COLOR.brandLight });
    text("Client Details", { x: marginL + 6, y: curY - 14, size: 8, font: fontBold, color: COLOR.brandMid });
    let ly = curY - 28;
    for (const item of leftItems) {
      text(item.label, { x: marginL + 6, y: ly, size: 8, font: fontBold, color: COLOR.ink2 });
      text(item.value, { x: marginL + 80, y: ly, size: 8.5, font: fontReg, color: COLOR.black, maxWidth: colW - 86 });
      ly -= 15;
    }

    // Right box
    const rx = marginL + colW + 16;
    drawRect({ x: rx, y: startY, w: colW, h: 2, color: COLOR.brandLight });
    text("Submission Details", { x: rx + 6, y: startY - 14, size: 8, font: fontBold, color: COLOR.brandMid });
    let ry = startY - 28;
    for (const item of rightItems) {
      text(item.label, { x: rx + 6, y: ry, size: 8, font: fontBold, color: COLOR.ink2 });
      text(item.value, { x: rx + 95, y: ry, size: 8.5, font: fontReg, color: COLOR.black, maxWidth: colW - 101 });
      ry -= 15;
    }

    curY = Math.min(ly, ry) - 12;
    hRule(curY, COLOR.lineRule);
    curY -= 16;
  }

  // ── Score/risk block ───────────────────────────────────────────────────────
  function drawScoreBlock(score) {
    if (!score || (!score.total && !score.tier)) return;
    ensureSpace(60);
    const tierColors = { low: [COLOR.greenLight, COLOR.green], med: [COLOR.amberLight, COLOR.amber], high: [COLOR.redLight, COLOR.red] };
    const [bg, fg] = tierColors[score.tier?.level] || [COLOR.sectionBg, COLOR.ink2];
    drawRect({ x: marginL, y: curY, w: contentW, h: 48, color: bg });
    text("Assessment Result", { x: marginL + 12, y: curY - 12, size: 8, font: fontBold, color: fg });
    text(`Total Score: ${score.total ?? 0}`, { x: marginL + 12, y: curY - 26, size: 13, font: fontBold, color: fg });
    if (score.tier?.label) {
      text(`Risk Level: ${score.tier.label}`, { x: marginL + 130, y: curY - 26, size: 11, font: fontBold, color: fg });
    }
    curY -= 56;
  }

  // ── Table rendering ───────────────────────────────────────────────────────
  function drawTable(field, rows) {
    if (!rows || rows.length === 0) return;
    const cols = field.columns || [];
    if (cols.length === 0) return;

    ensureSpace(30);
    drawSectionHeading(`Table: ${field.label}`);

    const colW = contentW / cols.length;

    // Header row
    ensureSpace(20);
    drawRect({ x: marginL, y: curY, w: contentW, h: 18, color: COLOR.brand });
    cols.forEach((col, ci) => {
      text(col.label, { x: marginL + ci * colW + 4, y: curY - 13, size: 8, font: fontBold, color: COLOR.white });
    });
    hRule(curY - 18, COLOR.lineRule);
    curY -= 20;

    // Data rows
    rows.forEach((row, ri) => {
      const rowHeight = 16;
      ensureSpace(rowHeight + 4);
      if (ri % 2 === 0) {
        drawRect({ x: marginL, y: curY, w: contentW, h: rowHeight, color: rgb(0.97, 0.98, 0.97) });
      }
      cols.forEach((col, ci) => {
        text(String(row[col.id] || "—"), { x: marginL + ci * colW + 4, y: curY - 12, size: 9, font: fontReg, color: COLOR.black });
      });
      hRule(curY - rowHeight, COLOR.lineRule);
      curY -= rowHeight + 2;
    });
    curY -= 8;
  }

  // ── Signature rendering ────────────────────────────────────────────────────
  async function drawSignature(field, value) {
    ensureSpace(80);
    text(field.label, { x: marginL, y: curY, size: 9, font: fontBold, color: COLOR.ink2 });
    curY -= 14;

    const sigData = signatureData || value;
    if (sigData && sigData.dataUrl && sigData.dataUrl.startsWith("data:image/png;base64,")) {
      try {
        const base64 = sigData.dataUrl.split(",")[1];
        const imgBytes = Buffer.from(base64, "base64");
        const img = await pdfDoc.embedPng(imgBytes);
        const sigH = 50;
        const sigW = Math.min(200, contentW);
        ensureSpace(sigH + 30);
        currentPage().drawImage(img, { x: marginL, y: curY - sigH, width: sigW, height: sigH });

        // Signature line under image
        currentPage().drawLine({ start: { x: marginL, y: curY - sigH - 4 }, end: { x: marginL + sigW, y: curY - sigH - 4 }, thickness: 0.5, color: COLOR.ink3 });
        const signerName = sigData.signedBy || value?.signedBy || userName;
        const sigDate = sigData.signedAt ? new Date(sigData.signedAt).toLocaleString() : new Date(submittedAt).toLocaleString();
        text(`Signed by: ${signerName}`, { x: marginL, y: curY - sigH - 16, size: 8, font: fontReg, color: COLOR.ink2 });
        text(sigDate, { x: marginL + 200, y: curY - sigH - 16, size: 8, font: fontReg, color: COLOR.ink3 });
        curY -= sigH + 30;
      } catch {
        // PNG embed failed — fall back to text
        text(`Signed by: ${value?.signedBy || userName}`, { x: marginL, y: curY, size: 9, font: fontOblique, color: COLOR.ink2 });
        curY -= 18;
      }
    } else if (value && value.signedBy) {
      drawRect({ x: marginL, y: curY, w: 220, h: 24, color: COLOR.sectionBg });
      text(`Signed: ${value.signedBy}`, { x: marginL + 8, y: curY - 16, size: 9, font: fontOblique, color: COLOR.ink2 });
      curY -= 32;
    } else {
      text("No signature captured", { x: marginL, y: curY, size: 9, font: fontOblique, color: COLOR.ink3 });
      curY -= 18;
    }
  }

  // ── Office review section ─────────────────────────────────────────────────
  function drawReviewSection() {
    if (!reviewedBy || !reviewedAt) return;
    ensureSpace(60);
    drawRect({ x: marginL, y: curY, w: contentW, h: 4, color: COLOR.brand });
    curY -= 10;
    text("OFFICE REVIEW", { x: marginL, y: curY, size: 10, font: fontBold, color: COLOR.brand });
    curY -= 18;
    drawFieldRow("Reviewed by", reviewedBy);
    drawFieldRow("Review date", new Date(reviewedAt).toLocaleString());
    drawFieldRow("Status", "Reviewed and accepted");
    curY -= 8;
  }

  // ── Correction history section ────────────────────────────────────────────
  function drawCorrectionHistory() {
    const history = correctionHistory || [];
    if (history.length === 0) return;
    ensureSpace(50);
    drawRect({ x: marginL, y: curY, w: contentW, h: 4, color: COLOR.amber });
    curY -= 10;
    text("CORRECTION & RESUBMISSION HISTORY", { x: marginL, y: curY, size: 10, font: fontBold, color: COLOR.amber });
    curY -= 18;
    for (const entry of history) {
      ensureSpace(30);
      const ts = new Date(entry.timestamp).toLocaleString();
      const statusLabel = entry.status === "needsCorrection" ? "Correction requested" : entry.status === "submitted" ? "Resubmitted" : entry.status;
      text(`${ts} — ${entry.actorName} (${entry.role}): ${statusLabel}`, { x: marginL + 4, y: curY, size: 8.5, font: fontReg, color: COLOR.ink2 });
      curY -= 13;
      if (entry.note) {
        text(`  Note: ${entry.note}`, { x: marginL + 12, y: curY, size: 8.5, font: fontOblique, color: COLOR.amber });
        curY -= 13;
      }
      hRule(curY, COLOR.lineRule);
      curY -= 8;
    }
  }

  // ── Build the document ────────────────────────────────────────────────────
  drawCoverHeader();
  curY = pageH - 130;
  drawMetaBlock();

  // Score block (if applicable)
  if (score && (score.total || score.tier)) {
    drawScoreBlock(score);
    curY -= 8;
  }

  // Sections
  for (const section of template.sections || []) {
    const visibleFields = section.fields.filter((f) => f.type !== "computed");
    if (visibleFields.length === 0) continue;

    drawSectionHeading(section.title);

    for (const field of visibleFields) {
      const value = values?.[field.id];

      if (field.type === "signature") {
        await drawSignature(field, value);
        continue;
      }

      if (field.type === "table") {
        const rows = Array.isArray(value) ? value.filter((r) => Object.values(r || {}).some(Boolean)) : [];
        drawTable(field, rows);
        continue;
      }

      if (field.type === "policyText") {
        drawFieldRow(field.label, "Policy content acknowledged in-app.");
        continue;
      }

      if (field.type === "checkbox") {
        const displayVal = Array.isArray(value) ? (value.length > 0 ? value.join(", ") : "—") : "—";
        drawFieldRow(field.label, displayVal);
        continue;
      }

      if (field.type === "radio") {
        drawFieldRow(field.label, value != null ? String(value) : "—");
        continue;
      }

      drawFieldRow(field.label, value != null && value !== "" ? String(value) : "—");
    }
    curY -= 8;
  }

  // Office review sign-off
  drawReviewSection();

  // Correction history
  drawCorrectionHistory();

  // Certification statement
  ensureSpace(50);
  curY -= 16;
  drawRect({ x: marginL, y: curY, w: contentW, h: 36, color: COLOR.sectionBg });
  text("I certify that the information provided in this form is true and accurate to the best of my knowledge.", {
    x: marginL + 8, y: curY - 13, size: 8.5, font: fontOblique, color: COLOR.ink2, maxWidth: contentW - 16,
  });
  text(`${userName} · ${new Date(submittedAt).toLocaleString()}`, {
    x: marginL + 8, y: curY - 28, size: 8, font: fontReg, color: COLOR.ink3,
  });
  curY -= 44;

  addFooters();

  const fileName = `${submissionId}.pdf`;
  const bytes = await pdfDoc.save();
  const filePath = path.join(pdfRoot, fileName);
  
  if (isNetlifyBlobs) {
    const store = getStore("pdfs");
    await store.set(fileName, bytes);
  } else {
    await fs.promises.writeFile(filePath, bytes);
  }

  return {
    pdfPath: isNetlifyBlobs ? `netlify-blob://pdfs/${fileName}` : filePath,
    pdfUrl: `/api/files/pdfs/${fileName}`,
  };
}

// ─── Client / caregiver assignment helper ──────────────────────────────────
async function requireAssignedClient(user, clientId) {
  if (!clientId) return null;
  const clients = await listClientsForUser(user);
  return clients.find((c) => c.id === clientId) || null;
}

const VALID_STATUSES = ["submitted", "reviewed", "needsCorrection"];

// ─── Recurrence helper ──────────────────────────────────────────────────────
function computeNextDue(dueDateStr, recurrence) {
  const OFFSETS = { daily: 1, weekly: 7, biweekly: 14, monthly: 30 };
  const days = OFFSETS[recurrence];
  if (!days) return null;
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

// ─── Routes ─────────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));

// Auth
app.post("/api/auth/login", rateLimit(60_000, 10), async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const user = await getUserByUsername(String(username || "").trim());
    
    if (!user || !verifyPassword(String(password || ""), user.passwordHash)) {
      res.status(401).json({ error: "Invalid username or password." }); return;
    }
    
    if (user.status !== "active") {
      res.status(401).json({ error: "This account is disabled. Contact your administrator." }); return;
    }

    if (user.mustChangePassword && user.tempPasswordExpiresAt && new Date(user.tempPasswordExpiresAt).getTime() < Date.now()) {
      res.status(401).json({ error: "Temporary password expired. Contact your administrator." }); return;
    }

    const token = await createSession(user.id);
    await updateUserLastLogin(user.id);
    await createAuditEvent({
      actorId: user.id, actorName: user.name, role: user.role,
      action: "sign_in", targetType: "session", targetId: token, targetLabel: "Signed in",
      metadata: { ip: getRequestIp(req) },
    });
    res.json({ token, user: sanitizeUser(user) });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/auth/change-password", requireAuth, async (req, res) => {
  try {
    const { newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 10) {
      res.status(400).json({ error: "Password must be at least 10 characters." }); return;
    }
    if (verifyPassword(newPassword, req.user.passwordHash)) {
      res.status(400).json({ error: "New password cannot be the same as your current password." }); return;
    }
    if (newPassword.toLowerCase() === req.user.username.toLowerCase()) {
      res.status(400).json({ error: "Password cannot be your username." }); return;
    }

    const updated = await updateUser(req.user.id, {
      passwordHash: hashPassword(newPassword),
      mustChangePassword: false,
      tempPasswordExpiresAt: null,
      clearTempPassword: true,
    });
    
    await createAuditEvent({
      actorId: req.user.id, actorName: req.user.name, role: req.user.role,
      action: "changed_password", targetType: "user", targetId: req.user.id, targetLabel: "Changed password",
      metadata: { ip: getRequestIp(req) },
    });
    res.json({ ok: true, user: sanitizeUser(updated) });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get("/api/setup/status", async (req, res) => {
  try {
    const count = await getUserCount();
    res.json({ setupRequired: count === 0 });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/setup/first-admin", async (req, res) => {
  try {
    const count = await getUserCount();
    if (count > 0) {
      res.status(403).json({ error: "Setup already completed." }); return;
    }
    const { name, username, password } = req.body || {};
    if (!name || !username || !password || password.length < 10) {
      res.status(400).json({ error: "Name, username, and a password of at least 10 characters are required." }); return;
    }
    const created = await createUser({
      name, username, role: "admin", password, mustChangePassword: 0, tempPasswordExpiresAt: null
    });
    res.status(201).json({ ok: true, user: sanitizeUser(created) });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

app.post("/api/auth/logout", requireAuth, async (req, res) => {
  try {
    await deleteSession(req.authToken);
    await createAuditEvent({
      actorId: req.user.id, actorName: req.user.name, role: req.user.role,
      action: "sign_out", targetType: "session", targetId: req.authToken, targetLabel: "Signed out",
      metadata: { ip: getRequestIp(req) },
    });
    res.json({ ok: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// /api/users alias — store.js uses this path for office managers
app.get("/api/users", requireAuth, requireRole("admin", "officeManager"), async (_req, res) => {
  try { res.json((await listUsers()).map(sanitizeUser)); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

// Admin Users Management
app.get("/api/admin/users", requireAuth, requireRole("admin", "officeManager"), async (_req, res) => {
  try { res.json((await listUsers()).map(sanitizeUser)); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/admin/users", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { name, username, role, password } = req.body || {};
    if (!name || !username || !role || !password) {
      res.status(400).json({ error: "Name, username, role, and password are required." }); return;
    }
    const created = await createUser({
      name, username, role, password,
      mustChangePassword: 1,
      storeTempPassword: true,
      tempPasswordExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days
      createdByAdminId: req.user.id
    });
    await createAuditEvent({
      actorId: req.user.id, actorName: req.user.name, role: req.user.role,
      action: "created_user", targetType: "user", targetId: created.id, targetLabel: created.name,
      metadata: { username: created.username, role: created.role },
    });
    res.status(201).json(sanitizeUser(created));
  } catch (error) {
    const status = /UNIQUE/.test(error.message) ? 409 : 500;
    res.status(status).json({ error: status === 409 ? "That username already exists." : error.message });
  }
});

app.patch("/api/admin/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { name, role, status } = req.body || {};
    const updated = await updateUser(req.params.id, { name, role, status });
    if (!updated) { res.status(404).json({ error: "User not found." }); return; }
    await createAuditEvent({
      actorId: req.user.id, actorName: req.user.name, role: req.user.role,
      action: "updated_user", targetType: "user", targetId: updated.id, targetLabel: updated.name,
      metadata: { status: updated.status, role: updated.role },
    });
    res.json(sanitizeUser(updated));
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/admin/users/:id/reset-password", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 10) {
      res.status(400).json({ error: "Password must be at least 10 characters." }); return;
    }
    const updated = await updateUser(req.params.id, { 
      passwordHash: hashPassword(newPassword),
      mustChangePassword: 1,
      tempPasswordExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    });
    if (!updated) { res.status(404).json({ error: "User not found." }); return; }
    
    await createAuditEvent({
      actorId: req.user.id, actorName: req.user.name, role: req.user.role,
      action: "reset_user_password", targetType: "user", targetId: updated.id, targetLabel: updated.name,
      metadata: { ip: getRequestIp(req) },
    });
    res.json(sanitizeUser(updated));
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/admin/users/:id/disable", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const updated = await updateUser(req.params.id, { status: "disabled" });
    if (!updated) { res.status(404).json({ error: "User not found." }); return; }
    await createAuditEvent({
      actorId: req.user.id, actorName: req.user.name, role: req.user.role,
      action: "disabled_user", targetType: "user", targetId: updated.id, targetLabel: updated.name,
      metadata: { status: "disabled" },
    });
    res.json(sanitizeUser(updated));
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/admin/users/:id/enable", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const updated = await updateUser(req.params.id, { status: "active" });
    if (!updated) { res.status(404).json({ error: "User not found." }); return; }
    await createAuditEvent({
      actorId: req.user.id, actorName: req.user.name, role: req.user.role,
      action: "enabled_user", targetType: "user", targetId: updated.id, targetLabel: updated.name,
      metadata: { status: "active" },
    });
    res.json(sanitizeUser(updated));
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ── Admin utility: suggest username from name ──────────────────────────────
app.get("/api/admin/suggest-username", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const name = String(req.query.name || "").trim();
    if (!name) { res.status(400).json({ error: "name is required" }); return; }
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length < 2) { res.json({ suggestion: parts[0].toLowerCase().replace(/[^a-z0-9]/gi, "") }); return; }
    const first = parts[0][0].toLowerCase();
    const last = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/gi, "");
    const base = `${first}${last}`;
    const users = await listUsers();
    const taken = new Set(users.map((u) => u.username.toLowerCase()));
    if (!taken.has(base)) { res.json({ suggestion: base }); return; }
    let n = 1;
    while (taken.has(`${base}${n}`)) n++;
    res.json({ suggestion: `${base}${n}` });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ── Admin utility: generate a secure temp password ─────────────────────────
app.get("/api/admin/generate-password", requireAuth, requireRole("admin"), (_req, res) => {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let pwd = "";
  // Ensure at least one of each required type
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$";
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += digits[Math.floor(Math.random() * digits.length)];
  pwd += special[Math.floor(Math.random() * special.length)];
  while (pwd.length < 12) {
    pwd += charset[Math.floor(Math.random() * charset.length)];
  }
  // Shuffle
  pwd = pwd.split("").sort(() => Math.random() - 0.5).join("");
  res.json({ password: pwd });
});

// ── Admin: reveal user temp password (audit-logged, admin-only) ────────────
// Only works while the user hasn't changed their password yet (temp_password_plain is cleared on change)
app.get("/api/admin/users/:id/reveal-password", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { get: dbGet } = require("./db");
    const rawRow = await dbGet("SELECT id, username, name, must_change_password, temp_password_plain FROM users WHERE id = ?", [req.params.id]);
    if (!rawRow) { res.status(404).json({ error: "User not found." }); return; }
    await createAuditEvent({
      actorId: req.user.id, actorName: req.user.name, role: req.user.role,
      action: "revealed_user_password", targetType: "user", targetId: req.params.id,
      targetLabel: rawRow.name || req.params.id, metadata: { ip: getRequestIp(req) },
    });
    res.json({
      tempPassword: rawRow.temp_password_plain || null,
      mustChangePassword: rawRow.must_change_password === 1,
      note: rawRow.temp_password_plain
        ? "This is the temporary password. It will be hidden once the user sets their own password."
        : "The user has already changed their password. Only they know it.",
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Clients
app.get("/api/clients", requireAuth, async (req, res) => {
  try { res.json(await listClientsForUser(req.user)); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/clients", requireAuth, requireRole("admin", "officeManager"), async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name) { res.status(400).json({ error: "Client name is required." }); return; }
    const client = await createClient(req.body || {});
    await createAuditEvent({
      actorId: req.user.id, actorName: req.user.name, role: req.user.role,
      action: "created_client", targetType: "client", targetId: client.id, targetLabel: client.name,
      metadata: { mrn: client.mrn },
    });
    res.status(201).json(client);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.patch("/api/clients/:id", requireAuth, requireRole("admin", "officeManager"), async (req, res) => {
  try {
    const updated = await updateClient(req.params.id, req.body || {});
    if (!updated) { res.status(404).json({ error: "Client not found." }); return; }
    await createAuditEvent({
      actorId: req.user.id, actorName: req.user.name, role: req.user.role,
      action: "updated_client", targetType: "client", targetId: updated.id, targetLabel: updated.name,
      metadata: { status: updated.status },
    });
    res.json(updated);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Client caregiver assignment
app.get("/api/clients/:id/assignments", requireAuth, requireRole("admin", "officeManager"), async (req, res) => {
  try { res.json(await getClientAssignments(req.params.id)); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

app.put("/api/clients/:id/assignments", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { userIds = [] } = req.body || {};
    await updateClientAssignments(req.params.id, userIds);
    await createAuditEvent({
      actorId: req.user.id, actorName: req.user.name, role: req.user.role,
      action: "updated_client_assignments", targetType: "client", targetId: req.params.id,
      targetLabel: req.params.id, metadata: { assignedCount: userIds.length },
    });
    res.json({ ok: true, userIds });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Templates
app.get("/api/templates", requireAuth, async (req, res) => {
  try { res.json(await listTemplatesForUser(req.user)); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/templates/import", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { schemaKey } = req.body || {};
    const template = await importTemplate(schemaKey, req.user);
    if (!template) { res.status(404).json({ error: "Template schema not found." }); return; }
    await createAuditEvent({
      actorId: req.user.id, actorName: req.user.name, role: req.user.role,
      action: "imported_template", targetType: "template", targetId: template.key, targetLabel: template.name,
      metadata: { version: template.version },
    });
    res.status(201).json(template);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get("/api/templates/:key/versions", requireAuth, requireRole("admin"), async (req, res) => {
  try { res.json(await getTemplateVersions(req.params.key)); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

app.put("/api/templates/:key", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const saved = await saveTemplate({ ...req.body, key: req.params.key }, req.user);
    await createAuditEvent({
      actorId: req.user.id, actorName: req.user.name, role: req.user.role,
      action: "saved_template_draft", targetType: "template", targetId: saved.key, targetLabel: saved.name,
      metadata: { status: saved.status, version: saved.version },
    });
    res.json(saved);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/templates/:key/publish", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const template = await publishTemplate(req.params.key);
    if (!template) { res.status(404).json({ error: "Template not found." }); return; }
    await createAuditEvent({
      actorId: req.user.id, actorName: req.user.name, role: req.user.role,
      action: "published_template", targetType: "template", targetId: template.key, targetLabel: template.name,
      metadata: { version: template.version },
    });
    res.json(template);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/templates/:key/unpublish", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const template = await unpublishTemplate(req.params.key);
    if (!template) { res.status(404).json({ error: "Template not found." }); return; }
    await createAuditEvent({
      actorId: req.user.id, actorName: req.user.name, role: req.user.role,
      action: "unpublished_template", targetType: "template", targetId: template.key, targetLabel: template.name,
      metadata: { version: template.version },
    });
    res.json(template);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Tasks
app.get("/api/tasks", requireAuth, async (req, res) => {
  try { res.json(await listTasksForUser(req.user)); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/tasks", requireAuth, requireRole("admin", "officeManager"), async (req, res) => {
  try {
    const { title, taskType, schemaKey, clientId, clientName, assignedToId, assignedToName, dueDate, recurrence, priority } = req.body || {};
    if (!title || !assignedToId || !dueDate) {
      res.status(400).json({ error: "Title, assignedToId, and dueDate are required." }); return;
    }
    const task = await createTask({
      title, taskType: taskType || "form", schemaKey, clientId, clientName,
      assignedToId, assignedToName: assignedToName || assignedToId,
      dueDate, recurrence, priority: priority || "normal",
      createdBy: req.user.name,
    });
    await createAuditEvent({
      actorId: req.user.id, actorName: req.user.name, role: req.user.role,
      action: "created_task", targetType: "task", targetId: task.id, targetLabel: task.title,
      metadata: { assignedToName: task.assignedToName, dueDate: task.dueDate },
    });
    res.status(201).json(task);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.patch("/api/tasks/:id", requireAuth, async (req, res) => {
  try {
    const { status, submissionId } = req.body || {};
    const completedAt = status === "completed" ? new Date().toISOString() : null;
    const updated = await updateTask(req.params.id, { status, completedAt, submissionId });
    if (!updated) { res.status(404).json({ error: "Task not found." }); return; }

    // Spawn the next occurrence for recurring tasks
    if (status === "completed" && updated.recurrence) {
      const nextDue = computeNextDue(updated.dueDate, updated.recurrence);
      if (nextDue) {
        await createTask({
          title: updated.title,
          taskType: updated.taskType,
          schemaKey: updated.schemaKey,
          clientId: updated.clientId,
          clientName: updated.clientName,
          assignedToId: updated.assignedToId,
          assignedToName: updated.assignedToName,
          dueDate: nextDue,
          recurrence: updated.recurrence,
          priority: updated.priority,
          createdBy: req.user ? req.user.name : "system",
        });
        await createAuditEvent({
          actorId: req.user?.id || "system", actorName: req.user?.name || "System",
          role: req.user?.role || "system",
          action: "spawned_recurring_task", targetType: "task", targetId: updated.id,
          targetLabel: updated.title,
          metadata: { recurrence: updated.recurrence, nextDue },
        });
      }
    }

    res.json(updated);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Submissions
app.get("/api/submissions", requireAuth, async (req, res) => {
  try { res.json(await listSubmissionsForUser(req.user)); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

app.get("/api/submissions/:id", requireAuth, async (req, res) => {
  try {
    const sub = await getSubmissionById(req.params.id);
    if (!sub) { res.status(404).json({ error: "Submission not found." }); return; }
    // Caregivers can only see their own
    if (req.user.role === "caregiver" && sub.caregiverId !== req.user.id) {
      res.status(403).json({ error: "Access denied." }); return;
    }
    res.json(sub);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/submissions", requireAuth, async (req, res) => {
  try {
    const payload = req.body || {};
    const template = await getTemplateByKey(payload.schemaKey);
    if (!template) { res.status(404).json({ error: "Template not found." }); return; }
    if (template.status !== "published" && req.user.role !== "admin") {
      res.status(403).json({ error: "That template is not published yet." }); return;
    }
    if (!template.completedBy.includes(req.user.role) && req.user.role !== "admin") {
      res.status(403).json({ error: "Your profile cannot submit this form." }); return;
    }

    let clientName = payload.clientName || "";
    let clientData = null;
    if (template.subject === "client") {
      const client = await requireAssignedClient(req.user, payload.clientId);
      if (!client) { res.status(403).json({ error: "That client is not available to this user." }); return; }
      clientName = client.name;
      clientData = client;
    }

    // Extract signature data before generating PDF
    const signatureData = (() => {
      for (const section of template.sections || []) {
        for (const field of section.fields || []) {
          if (field.type === "signature" && payload.values?.[field.id]) {
            return payload.values[field.id];
          }
        }
      }
      return null;
    })();

    const submissionId = `sub_${crypto.randomUUID().slice(0, 8)}`;
    const submittedAt = new Date().toISOString();

    // Inject status for PDF header badge
    template._status = "submitted";

    const { pdfPath, pdfUrl } = await generateSubmissionPdf({
      submissionId, template, values: payload.values || {},
      score: payload.score || {}, clientName, clientData,
      userName: req.user.name, submittedAt,
      reviewedBy: null, reviewedAt: null,
      correctionHistory: [], signatureData,
    });

    const submission = await insertSubmission({
      id: submissionId, templateKey: template.key, templateName: template.name,
      templateVersion: template.version, clientId: payload.clientId || null,
      clientName: clientName || null, caregiverId: req.user.id, caregiverName: req.user.name,
      status: "submitted", values: payload.values || {}, score: payload.score || {},
      pdfPath, pdfUrl, submittedAt, reviewedAt: null, updatedAt: submittedAt,
      signatureData,
    });

    await createAuditEvent({
      actorId: req.user.id, actorName: req.user.name, role: req.user.role,
      action: "submitted_form", targetType: "submission", targetId: submission.id,
      targetLabel: `${template.name}${clientName ? ` for ${clientName}` : ""}`,
      metadata: { templateKey: template.key, pdfUrl },
    });

    res.status(201).json(submission);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Request correction — requires a note
app.post("/api/submissions/:id/correction", requireAuth, requireRole("admin", "officeManager"), async (req, res) => {
  try {
    const { note } = req.body || {};
    if (!note || !note.trim()) {
      res.status(400).json({ error: "A correction note is required." }); return;
    }
    const updated = await updateSubmissionStatus(req.params.id, "needsCorrection", req.user, note.trim());
    if (!updated) { res.status(404).json({ error: "Submission not found." }); return; }
    await createAuditEvent({
      actorId: req.user.id, actorName: req.user.name, role: req.user.role,
      action: "requested_correction", targetType: "submission", targetId: updated.id,
      targetLabel: updated.templateName,
      metadata: { correctionNote: note.trim(), clientName: updated.clientName },
    });
    res.json(updated);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Mark reviewed
app.patch("/api/submissions/:id/status", requireAuth, requireRole("admin", "officeManager"), async (req, res) => {
  try {
    const { status, note } = req.body || {};
    if (!status) { res.status(400).json({ error: "A status is required." }); return; }
    if (!VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` }); return;
    }
    if (status === "needsCorrection") {
      // Redirect to proper correction endpoint
      res.status(400).json({ error: "Use POST /api/submissions/:id/correction to request a correction with a note." }); return;
    }
    const updated = await updateSubmissionStatus(req.params.id, status, req.user, note || null);
    if (!updated) { res.status(404).json({ error: "Submission not found." }); return; }

    // Regenerate PDF with review details
    if (status === "reviewed") {
      try {
        const template = await getTemplateByKey(updated.templateKey);
        if (template) {
          template._status = "reviewed";
          await generateSubmissionPdf({
            submissionId: updated.id, template, values: updated.values,
            score: updated.score, clientName: updated.clientName,
            clientData: null, userName: updated.caregiverName,
            submittedAt: updated.submittedAt, reviewedBy: req.user.name,
            reviewedAt: updated.reviewedAt, correctionHistory: updated.correctionHistory,
            signatureData: updated.signatureData,
          });
        }
      } catch {
        // PDF regen is best-effort
      }
    }

    await createAuditEvent({
      actorId: req.user.id, actorName: req.user.name, role: req.user.role,
      action: "reviewed_submission", targetType: "submission", targetId: updated.id,
      targetLabel: updated.templateName,
      metadata: { status, clientName: updated.clientName },
    });
    res.json(updated);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Caregiver resubmit after correction
app.post("/api/submissions/:id/resubmit", requireAuth, requireRole("caregiver", "admin"), async (req, res) => {
  try {
    const existing = await getSubmissionById(req.params.id);
    if (!existing) { res.status(404).json({ error: "Submission not found." }); return; }
    if (req.user.role === "caregiver" && existing.caregiverId !== req.user.id) {
      res.status(403).json({ error: "You can only resubmit your own forms." }); return;
    }
    if (existing.status !== "needsCorrection") {
      res.status(400).json({ error: "Only submissions needing correction can be resubmitted." }); return;
    }

    const payload = req.body || {};
    const template = await getTemplateByKey(existing.templateKey);
    if (!template) { res.status(404).json({ error: "Template not found." }); return; }

    const signatureData = (() => {
      for (const section of template.sections || []) {
        for (const field of section.fields || []) {
          if (field.type === "signature" && payload.values?.[field.id]) return payload.values[field.id];
        }
      }
      return existing.signatureData;
    })();

    template._status = "submitted";
    const { pdfPath, pdfUrl } = await generateSubmissionPdf({
      submissionId: existing.id, template, values: payload.values || existing.values,
      score: payload.score || existing.score, clientName: existing.clientName,
      clientData: null, userName: req.user.name,
      submittedAt: new Date().toISOString(), reviewedBy: null, reviewedAt: null,
      correctionHistory: existing.correctionHistory || [],
      signatureData,
    });

    const updated = await resubmitSubmission(existing.id, {
      values: payload.values || existing.values,
      score: payload.score || existing.score,
      pdfPath, pdfUrl, signatureData,
    });

    await createAuditEvent({
      actorId: req.user.id, actorName: req.user.name, role: req.user.role,
      action: "resubmitted_form", targetType: "submission", targetId: updated.id,
      targetLabel: updated.templateName,
      metadata: { clientName: updated.clientName },
    });

    res.json(updated);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Audit
app.get("/api/audit", requireAuth, requireRole("admin", "officeManager"), async (_req, res) => {
  try { res.json(await listAudit()); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

// ─── Startup ───────────────────────────────────────────────────────────────

initDB().catch(console.error);

if (process.env.NODE_ENV !== "production" && require.main === module) {
  const PORT = process.env.PORT || 3002;
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

module.exports = app;
