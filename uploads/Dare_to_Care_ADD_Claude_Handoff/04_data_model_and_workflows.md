# Data model and workflow requirements

## Core entities

### User
Fields: id, name, email, role, status, permissions, createdAt, lastLoginAt.

### Client
Fields: id, name, dob, mrn, phone, address, primaryPhysician, emergencyContacts, allergies, carePlanSummary, assignedCaregivers, status, createdAt, updatedAt.

### FormTemplate
Fields: id, key, name, category, description, sourcePdfId, version, status, sections, interpretation, createdBy, publishedAt, updatedAt.

### FormSection
Fields: id, templateId, title, order, fields.

### FormField
Fields: id, sectionId, label, type, required, semantic, options, columns, formula, autofill, validation, layoutHints.

### Submission
Fields: id, templateId, templateVersion, clientId, caregiverId, values, computedValues, signatures, status, pdfUrl, submittedAt, reviewedAt.

### AuditEvent
Fields: id, timestamp, actorId, actorRole, action, targetType, targetId, ip, metadata.

## Field types the renderer must support
- text
- date
- textarea
- radio
- select
- checkbox / checklist
- table / repeatable rows
- computed
- signature
- static policy text / acknowledgement text

## Autofill behavior
- Safe autofill can fill from client profile, today’s date, or existing record data.
- Signature autofill must not be automatic. It can suggest current user name, but ink/signature capture requires explicit action.
- The UI should show source and confidence when AI/autofill suggestions are used.

## PDF behavior
- Every submitted form should generate or stamp a branded PDF.
- The generated PDF should store the exact template version used.
- The system should not overwrite historical PDFs when templates change.
- For complex source packets, generate separate PDFs per completed module or one combined packet after all modules are complete.

## Audit behavior
Record audit events for:
- Sign in/sign out.
- Client created or edited.
- PDF uploaded/imported.
- Template draft saved.
- Template published/unpublished.
- Form submitted.
- Submission reviewed/exported/downloaded.
- User/permission changes.

## Current prototype gaps Claude should clean up
- Office Manager records currently need to be wired to the shared submissions state, not static demo data.
- Prototype is JSX-in-browser and should become a normal app project if building beyond demo.
- PDF generation is currently a preview-style UI, not a persisted generated file pipeline.
- Only two forms are schema-modeled; the other PDFs need schemas.
- Role switching is a prototype shortcut, not real auth.
- Compliance language is UI-only and should not be treated as finished HIPAA compliance.
