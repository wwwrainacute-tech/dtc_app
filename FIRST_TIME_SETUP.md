# Dare to Care - First-Time Setup Guide

Welcome to the Dare to Care platform! This guide will walk you through the process of setting up your professional environment and configuring your initial administrator account.

## Overview

The application is built with security and role-based access control (RBAC) at its core, utilizing a serverless architecture entirely powered by Firebase. It supports distinct roles, each with its own isolated dashboard and permissions:
- **Admin**: Full access to user management, client management, form templates, and audit logs.
- **Office Manager**: Access to review submitted forms, request corrections, and manage supervisory visits.
- **Caregiver**: Access to assigned daily tasks and form completion wizards.

## Phase 1: Environment Setup

Since this application is serverless, there is no Node.js backend to configure. The entire platform runs directly from the `dare-to-care-forms` frontend, connected to Firebase.

1. **Install Dependencies & Build**
   ```bash
   cd dare-to-care-forms
   npm install
   npm run build
   ```

2. **Run Locally (Development)**
   ```bash
   npm run dev
   ```

## Phase 2: First-Time Administrator Setup

Because the Firebase database is empty, the system will recognize this is a fresh installation and automatically activate the **First-Time Setup Wizard**.

1. Navigate to your application's URL in a web browser (e.g. `http://localhost:5173`).
2. The application will check the database, detect zero users, and automatically redirect you to `/setup`.
3. You will be prompted to create the very first **Administrator** account:
   - **Full Name**: Enter your name (e.g., "Jane Doe").
   - **Email Address**: Pick a secure email address.
   - **Secure Password**: Must be at least 8 characters long.
4. Click **Complete Setup**. The system will securely create your Auth account in Firebase, initialize the admin record in Firestore, and seamlessly redirect you to the Admin dashboard.

## Phase 3: Onboarding Your Team

Now that your administrator account exists, the `/setup` page is permanently locked down to prevent unauthorized account creation.

1. The application will route you to the **Admin Dashboard** (`/admin`).
2. Navigate to the **Users** tab.
3. Click **Create account** to start provisioning accounts for your team. You can create Caregivers, Office Managers, and additional Admins here.
4. Provide the user's email address. Firebase will securely generate their account.
5. You can use the **Reset Password** button to easily email them a secure, self-serve password reset link directly from Firebase!

## Phase 4: Production Checklist

Before officially going live with your team:
- [ ] Verify that Firebase Authentication (Email/Password) is enabled in your Firebase Console.
- [ ] Ensure Firestore security rules are published and active (`allow read, write: if request.auth != null;`).
- [ ] Test the Caregiver workflow by creating a dummy Caregiver account, logging in, and submitting a test form.

You are now ready for professional use!
