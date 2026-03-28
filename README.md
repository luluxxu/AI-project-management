# TaskPilot AI — Project Management Platform

A full-stack project management platform with AI-powered task assistance, built with React + Vite on the frontend and Node.js + Express + SQLite on the backend.

---

## Features

### Core Project Management
- **Multi-workspace support** — create and switch between separate workspaces
- **Projects** — create, edit, and delete projects with status, priority, and date range
- **Tasks** — manage tasks with title, description, status, priority, assignee, due date, and effort estimate
- **Team members** — add and manage team members with roles
- **Activity log** — automatic audit trail of all changes
- **Dashboard analytics** — completion rate, overdue tasks, workload by member

### AI Features (powered by Groq Llama 3.3 70B)
- **Task extraction** — paste meeting notes or a description; AI extracts a structured task list
- **Daily planning** — AI generates a prioritized plan for the day based on current tasks
- **AI chat assistant** — ask questions about your workspace; AI can suggest creating or updating tasks
- **Free to use** — runs on [Groq's free API](https://console.groq.com) (no credit card required)

### Authentication & Persistence
- Email + password registration and login
- JWT-based session management (7-day expiry)
- SQLite database — data persists across page refreshes and browser clears
- Each user sees only their own workspaces

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Vite 5 |
| Backend | Node.js, Express 5 |
| Database | SQLite via `better-sqlite3` |
| Auth | JWT (`jsonwebtoken`), bcrypt (`bcryptjs`) |
| AI | Groq API (OpenAI-compatible), `llama-3.3-70b-versatile` |
| Dev tooling | Vite proxy, `concurrently` |

---

## Project Structure

```
ai-project-management-platform/
├── server/                    # Express backend (port 3001)
│   ├── index.js               # Server entry point
│   ├── db.js                  # SQLite setup & table creation
│   ├── middleware/
│   │   └── auth.js            # JWT verification middleware
│   └── routes/
│       ├── auth.js            # POST /api/auth/register, /login, GET /me
│       ├── workspaces.js      # GET/POST /api/workspaces
│       ├── projects.js        # GET/POST/PATCH/DELETE /api/projects
│       ├── tasks.js           # GET/POST/PATCH/DELETE /api/tasks
│       ├── members.js         # GET/POST/PATCH /api/members
│       └── activities.js      # GET /api/activities
├── src/                       # React frontend (port 5173)
│   ├── context/
│   │   └── AuthContext.jsx    # JWT token & user state
│   ├── utils/
│   │   ├── api.js             # Fetch wrapper with JWT injection
│   │   ├── useProjectStore.js # Central state hook (calls REST API)
│   │   ├── claudeApi.js       # Groq AI integration
│   │   ├── aiHelpers.js       # Heuristic fallback (no API key)
│   │   └── buildWorkspaceContext.js  # AI context builder
│   ├── components/            # Reusable UI components
│   ├── pages/
│   │   ├── LoginPage.jsx      # Login / register
│   │   ├── DashboardPage.jsx  # Overview & analytics
│   │   ├── ProjectsPage.jsx   # Project CRUD
│   │   ├── CalendarPage.jsx   # Tasks by due date
│   │   ├── TeamPage.jsx       # Team members
│   │   ├── AiAssistantPage.jsx # AI features
│   │   └── ActivityPage.jsx   # Audit log
│   └── App.jsx                # Root: routing + auth guard
├── vite.config.js             # Vite config + /api proxy
└── package.json
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Clone the repository

```bash
git clone https://github.com/jiayuli1104/5500team3projectnew.git
cd 5500team3projectnew
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development servers

```bash
npm run dev
```

This starts both:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

### 4. Open the app

Go to [http://localhost:5173](http://localhost:5173). You will be redirected to the login page.

Register a new account, then start creating workspaces, projects, and tasks.

> The SQLite database file is created automatically at `server/taskpilot.db` on first run.

---

## AI Assistant Setup

The AI features use [Groq](https://console.groq.com) — a free, fast LLM API.

1. Sign up at https://console.groq.com
2. Create an API key (starts with `gsk_...`)
3. In the app, navigate to **AI Helper** and paste your key into the API key field
4. The key is saved in your browser's localStorage — it is never sent to any server other than Groq

If no API key is provided, the app falls back to a simple heuristic mode for task extraction.

---

## API Endpoints

All endpoints except `/api/auth/*` require `Authorization: Bearer <token>` header.

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Current user info |
| GET | `/api/workspaces` | List workspaces |
| POST | `/api/workspaces` | Create workspace |
| GET | `/api/projects/:wsId/projects` | List projects |
| POST | `/api/projects/:wsId/projects` | Create project |
| PATCH | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/tasks/:wsId/tasks` | List tasks |
| POST | `/api/tasks/:wsId/tasks` | Create task |
| PATCH | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| GET | `/api/members/:wsId/members` | List members |
| POST | `/api/members/:wsId/members` | Add member |
| PATCH | `/api/members/:id` | Update member |
| GET | `/api/activities/:wsId/activities` | Activity log |

---

## Database Schema

```sql
users       (id, email, password_hash, name, created_at)
workspaces  (id, name, description, created_at, owner_id)
projects    (id, workspace_id, name, description, status, priority, start_date, end_date)
tasks       (id, workspace_id, project_id, title, description, status, priority,
             assignee_id, due_date, effort)
members     (id, workspace_id, name, role, email)
activities  (id, workspace_id, message, created_at)
```

Foreign keys with `ON DELETE CASCADE` — deleting a workspace removes all its projects, tasks, members, and activity logs.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start frontend + backend together |
| `npm run client` | Frontend only (Vite) |
| `npm run server` | Backend only (Express) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
