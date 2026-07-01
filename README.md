# Dare to Care — Forms Platform

A role-based care-operations platform for managing clinical forms, supervisory visits, caregiver tasks, and compliance records.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Backend | Node.js + Express 5 (Serverless-ready) |
| Database | SQLite (Local) / Postgres (Production) |
| PDF generation | `pdf-lib` (server-side) |
| Storage | Local Disk / Netlify Blobs |

## 🚀 Deployment

For production deployment on Netlify, please refer to our full **[Netlify Deployment Guide](DEPLOY_NETLIFY.md)** and the **[Launch Checklist](NETLIFY_LAUNCH_CHECKLIST.md)**.

Before rolling out to your team, be sure to read the **[First-Time Setup Guide](FIRST_TIME_SETUP.md)** to configure your initial administrator account.

---

## Quick Start

### 1. Install dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../dare-to-care-forms
npm install
```

### 2. Configure environment

```bash
# Copy the example env file
cp .env.example server/.env
```

Edit `server/.env` if you need a different port (default: `3002`).

### 3. Start the backend

```bash
cd server
npm run dev
# Server running on http://localhost:3002
```

### 4. Start the frontend

```bash
cd dare-to-care-forms
npm run dev
# Frontend running on http://localhost:5174
```

The Vite dev server proxies all `/api/*` requests to the backend automatically — no CORS config needed.

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@daretocare.com` | `admin123` |
| Office Manager | `office@daretocare.com` | `office123` |
| Caregiver | `caregiver@daretocare.com` | `care123` |
| Caregiver 2 | `alex@daretocare.com` | `care123` |

> **Important:** Change all passwords before any production deployment. These seed credentials exist only for local development.

---

## Core Flows

### Admin
1. Log in → `/admin`
2. Go to **Upload PDF** → select a form from the reference library → Import & extract
3. Go to **Templates** → click the draft → edit in Builder → Publish
4. Go to **Users** → create a new caregiver account
5. Go to **Clients** → add a client and assign caregivers
6. Go to **Audit log** to verify all actions are recorded

### Caregiver
1. Log in → `/caregiver` — see real due tasks on "My Day"
2. Click a task or "Start a form"
3. Complete all sections, capture signature
4. Review → Preview PDF → Submit & file
5. See the filed record under **Records** → download the PDF

### Office Manager
1. Log in → `/office-manager`
2. Go to **Submissions** → click any submitted record
3. Review the full professional PDF
4. **Mark reviewed** or **Request correction** (with a required reason note)
5. Start a **Supervisory visit** from the dashboard
6. View **Audit log** for traceability

### Caregiver correction flow
1. Caregiver sees a "Correction needed" badge on a record
2. Opens the record → reads the correction reason
3. Clicks "Fix & resubmit" → wizard reopens with previous values pre-filled
4. Corrects and resubmits → new PDF generated with correction history appended

---

## Project Structure

```
dtc app/
├── server/                  # Express backend
│   ├── index.js             # Routes + PDF generation
│   ├── db.js                # SQLite schema + all DB functions
│   └── schema-library.js    # Seed form schemas
├── dare-to-care-forms/      # React frontend
│   └── src/
│       ├── app/             # Auth, shell, routing
│       ├── features/        # Per-role dashboards
│       │   ├── admin/
│       │   ├── caregiver/
│       │   └── office-manager/
│       ├── components/      # Shared UI (wizard, fields, admin panels)
│       └── styles/          # Global CSS
└── .env.example
```

---

## Building for Production

```bash
cd dare-to-care-forms
npm run build
# Output in dist/
```

Serve `dist/` with a static server and ensure the backend is running. Set `NODE_ENV=production` in `server/.env`.

---

## Remaining known limitations

- PDF import is schema-based (reference library), not live OCR extraction
- No email/notification system yet
- No multi-agency/tenant support
