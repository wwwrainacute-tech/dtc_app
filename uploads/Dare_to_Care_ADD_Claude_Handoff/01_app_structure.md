# App file structure and code organization

## Current prototype files

| File | Current purpose |
|---|---|
| `index.html` | Loads React/Babel scripts, app styles, and source JSX in browser. |
| `app.jsx` | Global app state, role-based shell, sidebar, topbar, router, toasts, theme/density/accent tweaks. |
| `data.js` | Empty seed state plus mock AI-extractable form schemas for Fall Risk Assessment and Medication List. |
| `login.jsx` | Role sign-in screen for Admin, Office Manager, and Caregiver. |
| `admin.jsx` | Admin dashboard, templates list, upload PDF flow, users view, clients view, audit log. |
| `builder.jsx` | AI extraction review, form builder, field inspector, PDF preview overlays, publish/save actions. |
| `caregiver.jsx` | Caregiver today/forms/submissions/clients, guided form wizard, autofill suggestions, signature pad, PDF preview. |
| `om.jsx` | Office Manager dashboard and initial records view. Currently uses older/static APP_DATA paths in some places. |
| `tweaks-panel.jsx` | Prototype theme control panel and localStorage tweak persistence. |
| `icons.jsx` | Inline SVG icon library. |
| `styles*.css` | Global app, login, builder, and wizard styling. |
| `uploads/` | Dare to Care logo and reference PDF forms. |


## Recommended clean target structure

```text
dare-to-care-forms/
├─ package.json
├─ README.md
├─ .env.example
├─ public/
│  ├─ logo.png
│  └─ reference-forms/                         # original PDFs kept for admin import/reference
├─ src/
│  ├─ app/
│  │  ├─ App.tsx                               # provider + routes
│  │  ├─ routes.tsx                            # route map by role
│  │  ├─ AppShell.tsx                          # sidebar/topbar/layout
│  │  └─ permissions.ts                        # role capabilities
│  ├─ assets/
│  ├─ components/
│  │  ├─ ui/                                   # buttons, cards, inputs, modal, table, badges
│  │  ├─ layout/                               # sidebar, topbar, mobile frame
│  │  └─ forms/                                # reusable field renderer, signature pad, PDF preview blocks
│  ├─ features/
│  │  ├─ auth/                                 # login/session/role switching
│  │  ├─ admin/                                # dashboard, users, clients, audit
│  │  ├─ templates/                            # template list, upload/import, builder/editor
│  │  ├─ caregiver/                            # today, available forms, wizard, submissions
│  │  ├─ office-manager/                       # dashboard, records, team, supervisory workflows
│  │  └─ clients/                              # shared client profile screens and modals
│  ├─ data/
│  │  ├─ formSchemas/                          # JSON schemas for digitized forms
│  │  ├─ referenceForms.ts                     # inventory of source PDFs
│  │  └─ seed.ts                               # dev-only test data; production starts empty
│  ├─ services/
│  │  ├─ formExtraction.service.ts             # PDF → fields/schema
│  │  ├─ pdf.service.ts                        # fill/render/export branded PDFs
│  │  ├─ audit.service.ts
│  │  ├─ storage.service.ts
│  │  └─ validation.service.ts
│  ├─ store/                                   # app state or API cache layer
│  ├─ types/                                   # User, Client, Template, Field, Submission, AuditEvent
│  ├─ utils/
│  └─ styles/
├─ tests/
│  ├─ form-validation.test.ts
│  ├─ pdf-output.test.ts
│  └─ permissions.test.ts
└─ docs/
   ├─ App_Design_Document_ADD.docx
   ├─ forms_inventory.md
   └─ data_model.md
```

## Organization rules

- Keep business logic out of page components.
- Store form templates as JSON schemas, not as one-off JSX screens.
- Use one shared field renderer for text, date, textarea, radio, select, table, computed, and signature fields.
- Put role permissions in one file and check them before showing actions.
- Keep branded PDF generation in a service, not inside the caregiver wizard component.
- Keep source/reference PDFs separate from completed submission PDFs.
- Keep development seed data separate from production state.
- Office Manager records must read from the same submission store as caregiver submissions.
