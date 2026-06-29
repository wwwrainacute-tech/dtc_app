# Forms inventory and field plan

This file organizes the forms included in the prototype upload folder. Use the original PDFs in `reference_forms/` and extracted text in `reference_form_text/` as the detailed source material.

## Form inventory

| Priority | Owner/role | Form | Type | Pages | Build note |
|---|---|---|---|---:|---|
| High | Caregiver | `Caregiver/New Hire Paperwork.pdf` | Onboarding packet | 22 | Digitize as multiple sub-forms or a guided onboarding packet. |
| High | Caregiver | `Caregiver/Workplace_Violence_Policy_Acknowledgement.pdf` | Policy acknowledgement | 1 | Simple acknowledgement/signature form; good MVP candidate. |
| High | Client | `Client/Client Admission Packet.pdf` | Client intake packet | 25 | Large packet; split into smaller intake modules for cleaner UX. |
| High | Client | `Client/Client_Care_Plan.pdf` | Care plan | 2 | Core service-plan document; should connect to client profile and services. |
| High | Client/Caregiver | `Client/Fall_Risk_Assessment.pdf` | Clinical assessment | 1 | Already represented in prototype schema and PDF preview. |
| High | Client/Caregiver | `Client/Medication_List.pdf` | Clinical record | 1 | Already represented in prototype schema and PDF preview. |
| Medium | Employee/Caregiver | `Employee/Client_Care_Plan_Review.pdf` | Acknowledgement | 1 | Simple training/policy acknowledgement. |
| Medium | Employee/Caregiver | `Employee/Emergency_Preparedness_Plan_(EPP).pdf` | Education acknowledgement | 1 | Policy/education review with staff signature. |
| High | Office Manager/Caregiver | `Office Manager/CaregiverActivityReport.pdf` | Visit/activity log | 1 | Timesheet/service log; can become recurring shift note. |
| Medium | Office Manager/Admin | `Office Manager/DareTC SOP Manual.pdf` | Operations SOP | 7 | Reference manual, not primarily a fillable form. |
| High | Office Manager | `Office Manager/Supervisory_Visit_Form.pdf` | Supervisory visit | 1 | Core supervisory documentation and compliance review. |


## Digitized schemas already represented in the prototype

These two schemas already exist in `data.js` and are included in full in `app_spec.json`.

### Fall Risk Assessment

- Source: `Fall_Risk_Assessment.pdf`
- Category: Clinical
- Purpose: Score a client's likelihood of falling using a Morse-style scale, prompt interventions, and produce a signed record for the chart.
- Cadence: On intake, quarterly, and after any incident

| Section | Field ID | Label | Type | Required | Semantic | Options / columns |
|---|---|---|---|---|---|---|
| Client identification | f1 | Client full name | text | Yes | client.fullName |  |
| Client identification | f2 | Date of birth | date | Yes | client.dateOfBirth |  |
| Client identification | f3 | Medical record number | text | No | client.mrn |  |
| Client identification | f4 | Assessment date | date | Yes | form.completionDate |  |
| History | f5 | History of falling (within 3 months) | radio | Yes | assessment.historyOfFalling | No (0); Yes (25) |
| History | f6 | Secondary diagnosis | radio | Yes | assessment.secondaryDiagnosis | No (0); Yes (15) |
| Ambulatory aid & gait | f7 | Ambulatory aid | radio | Yes | assessment.ambulatoryAid | None / bed rest / wheelchair / nurse (0); Crutches / cane / walker (15); Furniture (30) |
| Ambulatory aid & gait | f8 | IV / heparin lock | radio | Yes | assessment.ivLock | No (0); Yes (20) |
| Ambulatory aid & gait | f9 | Gait / transferring | radio | Yes | assessment.gait | Normal / bedrest / immobile (0); Weak (10); Impaired (20) |
| Ambulatory aid & gait | f10 | Mental status | radio | Yes | assessment.mentalStatus | Oriented to own ability (0); Forgets limitations (15) |
| Plan & sign-off | f11 | Total score | computed | Yes | assessment.totalScore |  |
| Plan & sign-off | f12 | Risk level | computed | Yes | assessment.riskTier |  |
| Plan & sign-off | f13 | Interventions / notes | textarea | No | assessment.interventionNotes |  |
| Plan & sign-off | f14 | Assessor signature | signature | Yes | form.assessorSignature |  |
| Plan & sign-off | f15 | Signature date | date | Yes | form.signatureDate |  |

### Medication List

- Source: `Medication_List.pdf`
- Category: Clinical
- Purpose: Maintain the current medication regimen for a client and reconcile against bottle counts at each shift change.
- Cadence: On admission and at each medication change

| Section | Field ID | Label | Type | Required | Semantic | Options / columns |
|---|---|---|---|---|---|---|
| Client identification | mf1 | Client full name | text | Yes | client.fullName |  |
| Client identification | mf2 | Date of birth | date | Yes | client.dateOfBirth |  |
| Client identification | mf3 | Primary physician | text | Yes | client.primaryPhysician |  |
| Client identification | mf4 | Review date | date | Yes | form.completionDate |  |
| Active medications | mf5 | Medication schedule | table | Yes | medication.schedule | columns: Medication, Dose, Route, Frequency, Time(s), Prescriber, Notes |
| Allergies & verification | mf6 | Known allergies | textarea | No | client.allergies |  |
| Allergies & verification | mf7 | Reconciled with bottle counts | radio | Yes | medication.reconciled | Yes — all counts match (0); Discrepancy noted (see notes) (0) |
| Allergies & verification | mf8 | Caregiver signature | signature | Yes | form.assessorSignature |  |
| Allergies & verification | mf9 | Signature date | date | Yes | form.signatureDate |  |


## Forms to digitize next

### Client Admission Packet
Large packet. Do not build as one giant screen. Split into these modules:
1. Welcome and agreement acknowledgement.
2. Client profile and contact information.
3. Service agreement and schedule.
4. Service rate/payment authorization.
5. Client assessment.
6. Client care plan.
7. Consumer rights/HIPAA/confidentiality acknowledgements.
8. Advance directives and emergency preparedness.
9. Vehicle authorization.
10. Final signature review.

### New Hire Paperwork
Large caregiver onboarding packet. Split into:
1. Interview questions.
2. Job descriptions and acknowledgements.
3. Availability and emergency contact information.
4. Rules of the road acknowledgement.
5. Handbook acknowledgement.
6. Personal care competency/skills validation.
7. Automobile use policy.
8. Time off request.
9. HIPAA/confidentiality policy.
10. Emergency preparedness acknowledgement.
11. Final signatures.

### Client Care Plan
Core client plan. Needs structured rows for weekly schedule and services, plus profile fields, emergency contact, physician, identified problems, allergies, diet restrictions, functional status, assistive devices, psychosocial notes, goals, supplies, special instructions, supervisor contact, and signatures.

### Caregiver Activity Report
Use as shift note / activity log. Needs caregiver, client, date/day, time in/out, total hours, comments, services checklist, personal care checklist, daily signatures, and notes.

### Supervisory Visit Form
Use for office manager/supervisor review. Needs visit info, visit type/method, service plan reviewed yes/no, performance matrix, client feedback, and signatures.

### Policy acknowledgements
Workplace Violence, Client Care Plan Review, and Emergency Preparedness Plan can share one reusable acknowledgement form pattern: policy content, required checkboxes, employee/staff name, date, signature, and storage destination.
