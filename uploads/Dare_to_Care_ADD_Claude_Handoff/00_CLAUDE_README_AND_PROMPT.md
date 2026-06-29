# Claude build prompt - Dare to Care Forms Platform

Use this folder as the source of truth. This is an app design/build handoff, not a game document. Rename any "GDD" wording to **ADD**, meaning **App Design Document**.

## Goal
Rebuild the Dare to Care Forms Platform cleaner and more complete from the included prototype, ADD, form inventory, reference PDFs, extracted text, and JSON app spec.

## What to prioritize
1. Organize the code using the target file structure in `app_structure.md`.
2. Preserve the core product: role-based home-care forms platform for Admin, Office Manager, and Caregiver.
3. Make forms data-driven. Do not hardcode every form screen manually.
4. Use `app_spec.json` for roles, workflows, data models, and the two implemented schemas.
5. Use `reference_forms/` and `reference_form_text/` when building more forms.
6. Keep the UI clean, accessible, mobile-friendly for caregivers, and Dare to Care branded.
7. Add missing wiring that the prototype does not fully finish: real records list, PDF output/storage, full form inventory, validation, audit events, and cleaner routing.

## Important app behavior
- Admin uploads/imports PDFs, reviews extracted fields, edits the template, then publishes it.
- Caregiver selects a client, fills the form through a guided wizard, signs, previews a branded PDF, then submits.
- Office Manager reviews submissions and operational/compliance forms.
- All completed forms must preserve template version, client, caregiver, timestamps, values, signatures, and generated PDF reference.
- Runtime should not depend on fake preloaded clients/submissions in production.

## Deliverables to build from this handoff
- Clean source structure.
- Data-driven form renderer.
- Admin builder/import flow.
- Caregiver wizard.
- Office Manager records flow.
- PDF generation/export path.
- Reference-form schemas for priority forms.
- Basic role permissions and audit log.
