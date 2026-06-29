# Deploying Dare to Care on Netlify

This application uses a modern architecture optimized for Netlify:
- **Frontend**: React (Vite)
- **Backend API**: Express (wrapped with `serverless-http` into a Netlify Function)
- **Database**: Postgres (Neon, Supabase, Railway, etc.)
- **File Storage**: Netlify Blobs

## 1. Prerequisites

1. A [Netlify](https://www.netlify.com/) account.
2. A Postgres database provider (e.g., [Neon](https://neon.tech/), [Supabase](https://supabase.com/)).
3. The Netlify CLI installed locally (optional, for local testing): `npm i -g netlify-cli`

## 2. Prepare the Database

1. Create a new Postgres database with your chosen provider.
2. Obtain the connection string (usually starts with `postgres://` or `postgresql://`).
3. Note: The schema is automatically initialized on the first request if it does not exist.

## 3. Netlify Setup

1. Push your code to a Git provider (GitHub, GitLab, Bitbucket).
2. Go to Netlify -> **Add new site** -> **Import an existing project**.
3. Connect your repository.

### Build Settings
Netlify should automatically detect these from `netlify.toml`, but confirm:
- **Base directory**: `(leave empty)`
- **Build command**: `cd dare-to-care-forms && npm run build`
- **Publish directory**: `dare-to-care-forms/dist`
- **Functions directory**: `netlify/functions` (auto-detected)

### Environment Variables
Under **Site settings** -> **Environment variables**, add:
- `NODE_ENV`: `production`
- `DATABASE_URL`: `postgres://user:password@your-database-url:5432/dbname`
- `JWT_SECRET`: A strong, random string for authentication.
- `FILE_STORAGE_PROVIDER`: `netlify-blobs`
- `SEED_DEMO_DATA`: `true` (Only set this temporarily to populate the database with the default admin user and demo clients. **Remove or set to `false` after the first deployment!**)

## 4. Enable Netlify Blobs

By default, Netlify Blobs does not need explicit initialization in the UI for the standard `getStore` API, but if you're using advanced scoped tokens, ensure your environment variables don't conflict. 
The app will automatically request a Blob store named `"pdfs"`.

## 5. Deploy

Click **Deploy site**. Once deployed, navigate to your site URL.

If you set `SEED_DEMO_DATA=true`, the first API request (e.g., loading the homepage which checks `/api/auth/me`) will initialize the database schema and insert the default users:
- **Admin**: `admin@daretocare.com` / `admin123`
- **Office Manager**: `office@daretocare.com` / `office123`
- **Caregiver**: `caregiver@daretocare.com` / `care123`

## 6. Post-Deployment

**CRITICAL**: Remove or set `SEED_DEMO_DATA=false` in Netlify Environment Variables after confirming the database is seeded. Failure to do so may result in duplicate insertion attempts or resetting data unintentionally!

Run through the `NETLIFY_LAUNCH_CHECKLIST.md` to verify system health.
