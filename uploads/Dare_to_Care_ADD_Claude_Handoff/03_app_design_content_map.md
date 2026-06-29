# App design content map

## Product name and subtitle
- Product name: Dare to Care
- Subtitle: Forms Platform
- Footer status language in prototype: HIPAA-aware · Encrypted

## Navigation labels

### Admin
- Dashboard
- Templates
- Upload PDF
- Users
- Clients
- Audit log

### Office Manager
- Dashboard
- Submissions
- Clients
- Team
- Audit log

### Caregiver
- My day
- Available forms
- My submissions
- My clients

## Main app content requirements

### Login
- Present role-based sign-in for Admin, Office Manager, and Caregiver.
- In production, replace role-switch demo login with real authentication.
- After sign-in, route to the correct role home.

### Admin dashboard
Must summarize:
- Published templates.
- Clients.
- Submissions.
- Recent audit activity.
- Getting-started steps when empty.

### Upload PDF
Must communicate:
- Upload/import a source form PDF.
- AI detects fields, tables, signatures, scoring, and autofill opportunities.
- The result is a draft, not a published form.
- Admin must review and publish.

### Form builder
Must show:
- AI interpretation summary.
- Source/PDF preview or simplified PDF reconstruction.
- Detected sections and fields.
- Field inspector for label/type/required/options/scoring/autofill.
- Save draft and publish actions.

### Caregiver wizard
Must show:
- Pick client.
- Step-by-step form sections.
- Autofill suggestions with accept/reject.
- Required field validation.
- Computed fields and score/tier when applicable.
- Review screen.
- Branded PDF preview.
- Signature capture.
- Submit and file PDF.

### Office Manager records
Must show:
- Search/filter by client, caregiver, form, status, and date.
- Submission list.
- Submission detail/PDF preview.
- Export/download only when permitted.
- Correction/request review state if needed.

## Tone and visual direction
- Clean, clinical, calm, health-care-administrative.
- Light theme first; dark theme optional.
- Green Dare to Care accent with accessible contrast.
- Mobile-first for caregiver form completion.
- Desktop-first for admin builder and office manager records.
- Avoid clutter and fake demo filler in production.
