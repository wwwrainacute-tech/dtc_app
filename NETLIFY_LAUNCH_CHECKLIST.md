# Dare to Care - Netlify Launch QA Checklist

Run through this checklist manually on your production Netlify URL after the first successful deployment.

## 1. Authentication & API Health
- [ ] **Load the homepage:** Application loads without 500 errors.
- [ ] **Sign in as Admin (`admin@daretocare.com` / `admin123`):** Login succeeds and generates a JWT.
- [ ] **Refresh the page:** Session persists securely.
- [ ] **Check browser console:** Verify no CORS errors or 404s for `/api/...` endpoints.

## 2. Database Connection
- [ ] **Navigate to Users list:** Ensure all default seeded users are visible.
- [ ] **Create a new test user:** Ensure write operations to Postgres succeed.
- [ ] **Navigate to Clients list:** Ensure seeded clients are visible.

## 3. Storage & Netlify Blobs
- [ ] **Navigate to Form Builder:** Create a simple test template and publish it.
- [ ] **Sign out and sign in as Caregiver (`caregiver@daretocare.com` / `care123`).**
- [ ] **Submit a form:** Fill out the newly created template for a client and submit it.
- [ ] **Verify PDF generation:** Download the PDF from the completed submission.
- [ ] **Verify PDF fetching:** Ensure the PDF opens successfully, confirming that `@netlify/blobs` properly wrote and streamed the file back via the Netlify Function.

## 4. Workflows & Audit
- [ ] **Sign in as Office Manager (`office@daretocare.com` / `office123`).**
- [ ] **Review the submission:** Leave a correction note and mark as "needsCorrection".
- [ ] **Check Audit Logs:** Verify the submission, review, and status changes were recorded to the database.

## 5. Security & Cleanup
- [ ] **Disable Seed Data:** Go to Netlify Environment Variables and delete `SEED_DEMO_DATA` or set it to `false`.
- [ ] **Trigger a Re-deploy:** Clear cache and deploy site in Netlify so the environment variables take effect.
- [ ] **Change Passwords:** Have the Admin change passwords for all seeded accounts (or delete them and create real accounts).
