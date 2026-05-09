# TaskFlow — Team Task Manager

> A full-stack team collaboration tool with projects, tasks, role-based access, and a real-time dashboard.

![TaskFlow](https://img.shields.io/badge/Stack-Node.js%20%2B%20React-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🚀 Live Demo

**Live URL:** `https://YOUR-APP.up.railway.app`  
**GitHub:** `https://github.com/YOUR-USERNAME/taskflow`

---

## ✨ Features

### Authentication
- JWT-based signup / login
- Secure password hashing with bcryptjs
- Protected routes (frontend + backend)
- Persistent sessions via localStorage

### Projects
- Create, update, archive, and delete projects
- View progress bars and task completion rates
- Each project has a Board view + List view

### Task Management
- Create tasks with title, description, status, priority, assignee, due date
- **New tasks auto-assign to the logged-in user** (can be changed before saving)
- **4 statuses:** To Do → In Progress → Review → Done
- **4 priority levels:** Low / Medium / High / Urgent
- Quick status transitions from the task detail modal
- Overdue detection (red indicator + dashboard alert)
- Comments on tasks
- Assignee can be cleared (unassigned) when editing a task

### Team Management
- Invite members by email (must have an account)
- **Roles:** Admin (manage members, project settings) / Member (manage tasks)
- Project owner always has admin rights
- Admins can promote/demote members
- All members (including the project owner) appear in the assignee dropdown

### Dashboard
- Total tasks, assigned to me, overdue count, completed today
- Status breakdown with progress bars
- **Tasks by Assignee** — visual bar chart showing each member's active task load
- My Tasks panel (tasks assigned to you, across all projects)
- Overdue tasks table with direct links
- Recent activity feed

---

## 🐛 Bug Fixes (v1.1)

The following bugs were identified and resolved:

### 1. Assignee validation rejected `null` — tasks saved without assignee silently
**File:** `backend/routes/tasks.js`  
The `express-validator` rule `body('assignee_id').optional().isInt()` rejected `null` values (sent when clearing an assignee) with a 400 validation error. Because the frontend didn't surface these errors visibly, tasks were silently created without an assignee even when one was selected.  
**Fix:** Changed to `optional({ nullable: true }).isInt({ min: 1 })` and added explicit `parseInt` parsing of the value.

### 2. Updating a task could not clear the assignee
**File:** `backend/routes/tasks.js`  
The SQL `CASE WHEN assignee_id IS NOT NULL THEN ? ELSE assignee_id END` logic in the `PUT` handler did not correctly handle `assignee_id: null` (unassign). Sending null would leave the old assignee in place.  
**Fix:** Rewrote the update logic to track whether `assignee_id` was explicitly included in the request body (change intended) vs absent (leave unchanged), and handles null correctly to clear the field.

### 3. "New Task" modal defaulted to Unassigned
**File:** `frontend/src/pages/ProjectDetailPage.jsx`  
`CreateTaskModal` initialised `assignee_id: ''` (Unassigned) so users had to manually select themselves, which most skipped. This caused the dashboard "Assigned to Me" counter to stay at 0.  
**Fix:** The modal now defaults `assignee_id` to the currently logged-in user's ID. Users can still change it to any member or set it to Unassigned before saving.

### 4. Dashboard showed no team-level assignment visibility
**Files:** `backend/routes/dashboard.js`, `frontend/src/pages/DashboardPage.jsx`  
The dashboard had no way to see how tasks were distributed across team members. The only assignment-related stat was "Assigned to Me", which only counted the logged-in user's own tasks.  
**Fix:** Added a `tasksByAssignee` query to the dashboard API and a new **Tasks by Assignee** card in the UI showing every assigned member with a proportional bar of their active (non-done) task count vs total assigned.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Database | SQLite (via better-sqlite3) |
| Auth | JWT + bcryptjs |
| Validation | express-validator |
| Frontend | React 18 + React Router v6 |
| HTTP Client | Axios |
| Date utils | date-fns |
| Icons | lucide-react |
| Build | Vite |
| Deployment | Railway |

---

## 📁 Project Structure

```
taskflow/
├── backend/
│   ├── middleware/
│   │   └── auth.js          # JWT auth + role checking
│   ├── models/
│   │   └── db.js            # SQLite schema + connection
│   ├── routes/
│   │   ├── auth.js          # POST /signup, /login, GET /me
│   │   ├── projects.js      # CRUD projects + member management
│   │   ├── tasks.js         # CRUD tasks + comments
│   │   └── dashboard.js     # Analytics endpoint (incl. tasksByAssignee)
│   └── server.js            # Express app + static file serving
├── frontend/
│   └── src/
│       ├── api.js            # Axios client + API wrappers
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── components/
│       │   ├── Layout.jsx    # Sidebar + shell
│       │   └── TaskModal.jsx # Task detail + edit + comments
│       └── pages/
│           ├── AuthPages.jsx
│           ├── DashboardPage.jsx      # Now includes Tasks by Assignee card
│           ├── ProjectsPage.jsx
│           └── ProjectDetailPage.jsx  # CreateTaskModal auto-assigns to self
├── railway.toml
├── nixpacks.toml
└── README.md
```

---

## 🗄 Database Schema

```sql
users          (id, name, email, password, created_at)
projects       (id, name, description, owner_id, status, created_at)
project_members(id, project_id, user_id, role, joined_at)
tasks          (id, project_id, title, description, status, priority,
                assignee_id, created_by, due_date, created_at, updated_at)
task_comments  (id, task_id, user_id, content, created_at)
```

---

## 🔒 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |

### Projects (all require auth)
| Method | Endpoint | Role Required |
|--------|----------|---------------|
| GET | `/api/projects` | Any |
| POST | `/api/projects` | Any |
| GET | `/api/projects/:id` | Member+ |
| PUT | `/api/projects/:id` | Admin |
| DELETE | `/api/projects/:id` | Owner |
| POST | `/api/projects/:id/members` | Admin |
| DELETE | `/api/projects/:id/members/:uid` | Admin |
| PUT | `/api/projects/:id/members/:uid/role` | Admin |

### Tasks
| Method | Endpoint | Role Required |
|--------|----------|---------------|
| GET | `/api/projects/:id/tasks` | Member+ |
| POST | `/api/projects/:id/tasks` | Member+ |
| GET | `/api/projects/:id/tasks/:tid` | Member+ |
| PUT | `/api/projects/:id/tasks/:tid` | Member+ |
| DELETE | `/api/projects/:id/tasks/:tid` | Creator or Admin |
| POST | `/api/projects/:id/tasks/:tid/comments` | Member+ |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Stats, activity, assignee breakdown |

**Dashboard response includes:**
```json
{
  "stats": { "total_tasks": 0, "my_tasks": 0, "overdue": 0, "done_today": 0 },
  "tasksByStatus": { "todo": 0, "in_progress": 0, "review": 0, "done": 0 },
  "tasksByAssignee": [{ "id": 1, "name": "Alice", "total": 5, "active": 3 }],
  "myTasks": [],
  "overdueTasks": [],
  "recentTasks": [],
  "weeklyActivity": []
}
```

---

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- npm

### Setup

```bash
# Clone
git clone https://github.com/YOUR-USERNAME/taskflow.git
cd taskflow

# Install backend deps
cd backend && npm install && cd ..

# Install frontend deps
cd frontend && npm install && cd ..
```

### Run (two terminals)

```bash
# Terminal 1 — Backend (http://localhost:5000)
cd backend && npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend && npm run dev
```

The frontend proxies `/api` requests to the backend automatically (configured in `vite.config.js`).

---

## 🚂 Deploy to Railway

### Option A: From GitHub (Recommended)

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo
4. Railway auto-detects the `nixpacks.toml` and builds everything
5. Set environment variables in Railway dashboard:
   ```
   JWT_SECRET=your-super-secret-key-here
   NODE_ENV=production
   DB_PATH=/data/taskflow.db
   ```
6. *(Optional)* Add a Railway Volume mounted at `/data` for persistent SQLite storage

### Option B: Railway CLI

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 5000 | Server port (Railway sets automatically) |
| `JWT_SECRET` | **Yes** | fallback | Secret for signing JWTs — change this! |
| `DB_PATH` | No | `./taskflow.db` | Path to SQLite file |
| `NODE_ENV` | No | development | Set to `production` on Railway |

> ⚠️ **Important:** SQLite on Railway's ephemeral filesystem will reset on redeploy. For persistence, attach a Railway Volume and set `DB_PATH=/data/taskflow.db`. For production at scale, swap to PostgreSQL using the `pg` package.

---

## 📸 Screenshots

> Add your screenshots here after deploying.

---

## 📝 License

MIT
