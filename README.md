# Dare to Care Platform

A modern, serverless clinical forms application for caregivers and administrative staff, powered by React and Firebase.

## Architecture Overview

The Dare to Care platform utilizes a highly scalable, fully serverless architecture.
- **Frontend**: React SPA (Single Page Application) built with Vite and TypeScript.
- **Backend/Database**: Google Firebase (Firestore) for real-time NoSQL data storage.
- **Authentication**: Firebase Authentication (Email/Password) with custom Role-Based Access Control (RBAC).
- **Storage**: Firebase Storage (for streaming video training modules).

## Key Features

1. **Role-Based Access Control (RBAC)**
   - **Administrator**: Full platform control, user management, and audit tracking.
   - **Office Manager**: Form reviewing, assigning Caregivers to Clients, and running supervisory visits.
   - **Caregiver**: Daily form completion (Fall Risk, Medication Lists, Activity Reports, etc).
   - **New Hire**: Training and onboarding portal with video progress tracking.

2. **Serverless Form Engine**
   - All forms are dynamically generated from JSON schemas.
   - Submissions are securely synced to Firestore.
   - Support for complex validation, nested sections, signature canvases, and scoring.

3. **Secure User Management**
   - Built-in multi-step First-Time Setup Wizard.
   - Secondary Firebase app instance allows Admins to create Caregiver accounts securely.
   - Native Firebase password reset emails.

## Local Development

### Prerequisites
- Node.js (v18+)
- Firebase Account configured with Authentication, Firestore, and Storage.

### Getting Started

1. Clone the repository and navigate to the frontend directory:
   ```bash
   cd dare-to-care-forms
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```

3. Open `http://localhost:5173` in your browser. The application will detect an empty database and automatically route you to the `/setup` wizard to create your primary Administrator account.

## Deployment

The platform is designed to be easily deployed to static hosting providers like Netlify or Vercel.

1. Build the production assets:
   ```bash
   npm run build
   ```
2. Deploy the output in the `dare-to-care-forms/dist/` directory to your hosting provider. No backend configuration is required!

## License
Proprietary software for Dare to Care Homecare.
