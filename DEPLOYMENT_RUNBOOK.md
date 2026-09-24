# RetinaGuard — Edge Deployment Runbook

## 1. Prerequisites
- **OS Environment:** Windows/Linux supported edge server
- **Engine:** Node.js `>=22.0.0`
- **Networking:** Ports `4001` (API) and `5173` (Frontend UI) available.

## 2. Initial Setup
Clone the `Retina-Guard` master branch (or designated release tag) and install dependencies.
```bash
# Backend Installation
cd retinaguard-backend
npm install

# Frontend Installation
cd ../RetinaGuard-Frontend-v3
npm install
```

## 3. Database Initialization
This step wipes any existing local data and rebuilds the required schemas.
```bash
cd retinaguard-backend

# Ensure existing corrupt/old DB is purged (Optional but recommended for fresh edge nodes)
Remove-Item data\retinaguard.db -ErrorAction SilentlyContinue

# Execute sequential SQL migrations
npm run migrate

# Insert required Edge node administrative & user boundaries
npm run seed
```

## 4. Environment Configuration
Ensure a `.env` file exists in `retinaguard-backend` conforming to:
```env
NODE_ENV=production
PORT=4001
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=super_secure_edge_jwt_secret_override
MATLAB_ADAPTER=mock # Or 'cli' if physical ML runtime is installed
```

## 5. Startup Sequence
```bash
# Terminal 1 - Backend Node
cd retinaguard-backend
npm run start

# Terminal 2 - Frontend Application (Using Vite/Preview for prod)
cd RetinaGuard-Frontend-v3
npm run preview
```

## 6. Verification
Navigate to `http://localhost:5173`.
Attempt login with: `tanu.tech` / `Tech#Rural2026`.
If the technician dashboard loads, the core architecture is properly synchronized.
