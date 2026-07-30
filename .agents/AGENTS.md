# Dual-Environment Guidelines: cPanel (Production) & Railway (Live Testing)

## Branching & Push Strategy
- **`main` Branch**: Reserved exclusively for **cPanel Production**.
- **`railway-live` Branch**: Used for **Railway Live Testing**.

## Frontend Environment Compatibility Rules

### 1. API Base URL Configuration
- **Railway (Live Testing / `railway-live`)**: Points to Railway backend (`https://iams-backend.up.railway.app` or configured `VITE_API_BASE_URL`).
- **cPanel (Production / `main`)**: Points to cPanel domain subfolder endpoint (`https://<domain>/api/api/v1` or `https://<domain>/api/v1`).

### 2. VAPID & Push Notification Keys
- Maintain environment-specific `.env.production` (cPanel VAPID key) and Railway environment variables.

### 3. Build & Deployment Checks
- Ensure API client (`src/app/lib/api-client.ts`) handles dynamic API base URL resolution gracefully without hardcoding hostnames.
- Test production builds (`npm run build`) before pushing to `main`.
