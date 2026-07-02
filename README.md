# LocalSM Hiring Platform & Admin Portal

This repository contains the integrated Hiring Platform and Admin Dashboard for LocalSM.

## System Architecture

The platform operates across three main components:
1. **Public Hiring Portal (Frontend)**: The public-facing website where candidates can view open jobs and submit their applications.
2. **Admin Panel (Client)**: The administrative backend dashboard where managers can create, update, delete jobs, view candidate submissions, and manage applications.
3. **Backend API**: An Express/Node.js API connected to MongoDB that handles all database operations and file uploads (resumes) via Cloudinary.

## Links & Ports

When running locally, the services are available at the following URLs:

*   **Public Hiring Portal**: `http://localhost:5173/`
*   **Admin Dashboard Login**: `http://localhost:3000/login`
*   **Backend API**: `http://localhost:3001/`

## Admin Credentials

The backend administrative portal is restricted to authorized personnel. The quick-fill demo buttons have been removed for security purposes. Use the following credentials to access the admin dashboard:

### Administrator
*   **Email**: `admin@localsm.com`
*   **Password**: `admin123`

### Human Resources (HR)
*   **Email**: `hr@localsm.com`
*   **Password**: `hr123`

*(Note: These are hardcoded demo credentials located in `client/src/hooks/useAuth.tsx`. When transitioning to a production environment, you should replace this with a secure database-driven JWT authentication system.)*

## Environment Setup

Ensure the `.env` file in the `backend` directory is properly configured with your Cloudinary and MongoDB credentials:

```
MONGODB_URI=your_mongodb_connection_string
PORT=3001
CLOUDINARY_URL=cloudinary://<API_KEY>:<API_SECRET>@<CLOUD_NAME>
CLOUDINARY_CLOUD_NAME=<CLOUD_NAME>
CLOUDINARY_API_KEY=<API_KEY>
CLOUDINARY_API_SECRET=<API_SECRET>
```

## Running the Project

From the root of the respective directories:

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Admin Panel:**
```bash
cd client
npm install
npm run dev
```

**Public Hiring Portal:**
(Run the Vite frontend from its respective directory)
```bash
npm install
npm run dev
```
