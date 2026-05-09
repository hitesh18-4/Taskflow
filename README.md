# TaskFlow — Team Task Manager

> A full-stack team collaboration tool with projects, tasks, role-based access, and a real-time dashboard.

![TaskFlow](https://img.shields.io/badge/Stack-Node.js%20%2B%20React-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🚀 Live Demo

**Live URL:** `taskflow-production-f926.up.railway.app`  
**GitHub:** `https://github.com/hitesh18-4/Taskflow`

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
<img width="1366" height="768" alt="Screenshot (36)" src="https://github.com/user-attachments/assets/53655c97-7ddf-4883-b106-1f8fdcbc9303" />

---

## 📝 License

MIT
