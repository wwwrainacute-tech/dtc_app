# Dare to Care - First-Time Setup Guide

Welcome to the Dare to Care platform! This guide will walk you through the process of setting up your professional environment and configuring your initial administrator account.

## Overview

The application is built with security and role-based access control (RBAC) at its core. It supports three distinct roles, each with its own isolated dashboard and permissions:
- **Admin**: Full access to user management, client management, form templates, and audit logs.
- **Office Manager**: Access to review submitted forms, request corrections, and manage supervisory visits.
- **Caregiver**: Access to assigned daily tasks and form completion wizards.

When a user logs in, the system automatically detects their role and seamlessly routes them to their designated dashboard.

## Phase 1: Database Initialization

For professional release, the application starts with a completely **empty** database.
The demo "seed data" (dummy users, dummy clients) has been disabled for production to ensure your environment is clean and secure.

1. **Start the backend server**
   Make sure you have your `.env` file configured. Start the server (which will automatically initialize the clean SQLite/Postgres tables):
   ```bash
   cd server
   npm install
   npm run start
   ```

2. **Start the frontend application**
   ```bash
   cd dare-to-care-forms
   npm install
   npm run build
   npm run preview # or serve the static files in dist/
   ```

## Phase 2: First-Time Administrator Setup

Because the database is empty, the system will recognize this is a fresh installation and automatically activate the **First-Time Setup Wizard**.

1. Navigate to your application's URL in a web browser.
2. The application will check the database, detect zero users, and automatically redirect you to `/setup`.
3. You will be prompted to create the very first **Administrator** account:
   - **Full Name**: Enter your name (e.g., "Jane Doe").
   - **Administrator Username**: Pick a secure username (e.g., "jane_admin").
   - **Secure Password**: Must be at least 10 characters long.
4. Click **Complete Setup**. The system will securely hash your password, create the admin record, and redirect you to the login page.

## Phase 3: Onboarding Your Team

Now that your administrator account exists, the `/setup` page is permanently locked down to prevent unauthorized account creation.

1. **Log in** with your new administrator credentials.
2. The application will route you to the **Admin Dashboard** (`/admin`).
3. Navigate to the **Users** tab.
4. Click **Add User** to start provisioning accounts for your team. You can create Caregivers, Office Managers, and additional Admins here.
5. When you create a new user, they will be given a temporary password. Upon their first login, they will be forced to change their password before they can access their respective dashboards.

## Phase 4: Production Checklist

Before officially going live with your team:
- [ ] Ensure `NODE_ENV=production` is set in your server environment.
- [ ] Ensure passwords for the initial admin account are stored in a secure password manager.
- [ ] Test the Caregiver workflow by creating a dummy Caregiver account, logging in (you will be routed to `/caregiver`), and submitting a test form.
- [ ] Review the [Netlify Launch Checklist](NETLIFY_LAUNCH_CHECKLIST.md) if deploying on Netlify.

You are now ready for professional use!
