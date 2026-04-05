# Assignment Workflow Portal - Backend

This is the Node.js/Express backend for the Assignment Workflow Portal.

## Features
- JWT Authentication (Teacher & Student roles)
- Role-based Access Control (RBAC)
- State-driven Assignment Workflow (Draft → Published → Completed)
- Single Submission per Student per Assignment
- Due Date Validation
- JSON-based persistent storage

## Prerequisites
- Node.js (v16+)
- npm

## Setup & Running Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Create a `.env` file in the root (a default one is provided):
   ```
   PORT=5000
   JWT_SECRET=your_jwt_secret
   ```

3. **Start the server**:
   ```bash
   npm start
   ```
   For development:
   ```bash
   npm run dev
   ```

## Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Teacher | `teacher@school.com` | `password` |
| Student | `student@school.com` | `password` |
| Student | `bob@school.com` | `password` |

## API Endpoints
- `POST /api/auth/login` - Login and get JWT
- `GET /api/assignments` - Get assignments (role-filtered)
- `POST /api/assignments` - Create assignment (Teacher only)
- `PUT /api/assignments/:id` - Update assignment (Teacher only, Draft only)
- `DELETE /api/assignments/:id` - Delete assignment (Teacher only, Draft only)
- `PATCH /api/assignments/:id/transition` - Workflow transition (publish/complete)
- `GET /api/assignments/:id/submissions` - View submissions (Teacher only)
- `POST /api/submissions` - Submit answer (Student only)
- `GET /api/submissions/my` - View own submissions (Student only)
