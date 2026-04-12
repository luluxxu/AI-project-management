# TaskPilot AI — Project Management Platform

A full-stack project management platform with AI-powered task assistance, built with React + Vite on the frontend and Node.js + Express + SQLite on the backend.

## Features

### Core Project Management
- **Multi-workspace support** — create and switch between separate workspaces
- **Projects** — create, edit, archive/restore, and delete projects with status, priority, and date range
- **Tasks** — manage tasks with title, description, status, priority, assignee, due date, and effort estimate (1-8 hours)
- **Team collaboration** — role-based access control (Owner / Admin / Member), invitation and join-request workflows
- **Notifications** — automatic reminders for tasks due in 3 days, 1 day, and today
- **Activity log** — automatic audit trail of all changes
- **Dashboard analytics** — completion rate, overdue tasks, workload by member

### AI Features
- **Task extraction** — paste meeting notes or a description; AI extracts a structured task list
- **Daily planning** — AI generates a prioritized plan for the day based on current tasks (with heuristic fallback when no API key is configured)
- **AI chat assistant** — ask questions about your workspace; AI can suggest creating or updating tasks

### Authentication & Authorization
- Email + password registration and login
- JWT-based session management (7-day expiry)
- Platform-level roles (Admin / Member) and workspace-level roles (Owner / Admin / Member)
- SQLite database — data persists across restarts

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Vite 5, Tailwind CSS 4 |
| Backend | Node.js, Express 5 |
| Database | SQLite via `better-sqlite3` (WAL mode, foreign keys) |
| Auth | JWT (`jsonwebtoken`), bcrypt (`bcryptjs`) |
| AI | OpenAI-compatible API (configurable via `OPENAI_API_KEY`) |
| Testing | Vitest, Supertest |
| Linting | ESLint 9 (flat config) |
| Dev tooling | Vite proxy, `concurrently` |

---

## Project Structure

```
ai-project-management/
├── server/                        # Express backend (port 3001)
│   ├── index.js                   # Server entry point
│   ├── db.js                      # SQLite setup, migrations, seeding
│   ├── middleware/
│   │   ├── auth.js                # JWT verification, role-based access
│   │   ├── validation.js          # Input validation helpers
│   │   └── error.js               # Global error & not-found handlers
│   ├── routes/
│   │   ├── auth.js                # Register, login, GET /me
│   │   ├── workspaces.js          # Workspace CRUD, members, invitations, join requests
│   │   ├── projects.js            # Project CRUD, archive/restore
│   │   ├── tasks.js               # Task CRUD, archive/restore
│   │   ├── members.js             # Legacy member management
│   │   ├── activities.js          # Activity log
│   │   ├── invitations.js         # Invitation accept/reject
│   │   ├── notifications.js       # Task reminders, mark read
│   │   ├── users.js               # Admin user management
│   │   └── ai.js                  # AI task extraction, daily planning, chat
│   ├── utils/
│   │   ├── workspace.js           # uid(), logActivity()
│   │   └── notifications.js       # Task notification sync
│   └── __tests__/                 # Backend tests (Vitest + Supertest)
├── src/                           # React frontend (port 5173)
│   ├── context/                   # AuthContext, ConfirmDialogContext
│   ├── utils/
│   │   ├── api.js                 # Fetch wrapper with JWT injection
│   │   ├── useProjectStore.js     # Central state hook
│   │   ├── claudeApi.js           # AI integration
│   │   └── analytics.js           # Workspace statistics
│   ├── components/                # Reusable UI components
│   ├── pages/                     # Page components
│   └── __tests__/                 # Frontend unit tests
├── eslint.config.js               # ESLint flat config
├── vitest.config.js               # Vitest configuration
├── vite.config.js                 # Vite config + /api proxy
└── package.json
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Clone the repository

```bash
git clone https://github.com/luluxxu/AI-project-management.git
cd AI-project-management
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

Go to [http://localhost:5173](http://localhost:5173). Register a new account, then start creating workspaces, projects, and tasks.

> The SQLite database is created automatically at `server/taskpilot.db` on first run.

---

## AI Setup (Optional)

The AI features require an OpenAI-compatible API key.

1. Create a `.env` file in the project root:
   ```
   OPENAI_API_KEY=your-api-key-here
   ```
2. Restart the server

Without an API key, the daily planner falls back to a built-in heuristic engine. Task extraction and chat features return a "not configured" message.

---

## Testing

The project includes 165 tests covering all backend API routes and frontend utility functions.

```bash
npm test              # Run all tests once
npm run test:watch    # Watch mode
```

### Test Coverage

| Test File | Tests | Coverage |
|---|---|---|
| `validation.test.js` | 47 | Input validation functions and payload validators |
| `auth.test.js` | 13 | Register, login, /me, token verification |
| `crud.test.js` | 25 | Workspace/Project/Task CRUD, access control, archive cascade |
| `members.test.js` | 9 | Member CRUD by membership ID, role updates, Owner protection |
| `activities.test.js` | 5 | Activity log generation and access control |
| `invitations.test.js` | 14 | Full invitation flow: create, accept, reject, guards |
| `join-requests.test.js` | 14 | Join request flow: submit, approve, reject, re-apply |
| `notifications.test.js` | 6 | Notification generation, mark read, access control |
| `users.test.js` | 12 | Admin user management, role changes, self-delete guard |
| `ai.test.js` | 11 | AI status, 503 fallback, heuristic daily planner |
| `analytics.test.js` | 9 | Workspace statistics and task grouping |

---

## Linting

```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix where possible
```

ESLint is configured with separate environments for frontend (browser + React hooks), backend (Node.js), and test files (Vitest globals).

---

## API Endpoints

All endpoints are under `/api/v1/`. Endpoints except `/api/v1/auth/*` require `Authorization: Bearer <token>` header.

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/auth/me` | Current user info |

### Workspaces
| Method | Path | Description |
|---|---|---|
| GET | `/workspaces` | List user's workspaces |
| GET | `/workspaces/discover` | Browse public workspaces |
| POST | `/workspaces` | Create workspace |
| DELETE | `/workspaces/:id` | Delete workspace (Owner only) |
| POST | `/workspaces/:id/archive` | Archive workspace + cascade |
| POST | `/workspaces/:id/restore` | Restore workspace + cascade |
| GET | `/workspaces/:wsId/members` | List workspace members |
| POST | `/workspaces/:wsId/members` | Add member (Admin+) |
| PATCH | `/workspaces/:wsId/members/:userId` | Update member role |
| DELETE | `/workspaces/:wsId/members/:userId` | Remove member |
| POST | `/workspaces/:wsId/invitations` | Send invitation |
| POST | `/workspaces/:wsId/join-request` | Request to join |
| PATCH | `/workspaces/:wsId/join-requests/:id` | Approve/reject request |

### Projects
| Method | Path | Description |
|---|---|---|
| GET | `/projects/:wsId/projects` | List projects |
| POST | `/projects/:wsId/projects` | Create project |
| PATCH | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Delete project |
| POST | `/projects/:id/archive` | Archive project + tasks |
| POST | `/projects/:id/restore` | Restore project + tasks |

### Tasks
| Method | Path | Description |
|---|---|---|
| GET | `/tasks/:wsId/tasks` | List tasks |
| POST | `/tasks/:wsId/tasks` | Create task |
| PATCH | `/tasks/:id` | Update task |
| DELETE | `/tasks/:id` | Delete task |
| POST | `/tasks/:id/archive` | Archive task |
| POST | `/tasks/:id/restore` | Restore task |

### Other
| Method | Path | Description |
|---|---|---|
| GET | `/invitations` | List user's pending invitations |
| POST | `/invitations/:id/respond` | Accept or reject invitation |
| GET | `/notifications` | List task reminders |
| PATCH | `/notifications/:id/read` | Mark notification as read |
| GET | `/users` | List all users (Admin only) |
| PATCH | `/users/:id` | Update user role (Admin only) |
| DELETE | `/users/:id` | Delete user (Admin only) |
| GET | `/activities/:wsId/activities` | Activity log |
| GET | `/ai/status` | AI provider status |
| POST | `/ai/extract-tasks` | Extract tasks from text |
| POST | `/ai/daily-plan` | Generate daily plan |
| POST | `/ai/chat` | AI chat assistant |

---

## Database Schema

```sql
users                  (id, email, password_hash, name, role, created_at)
workspaces             (id, name, description, created_at, owner_id, archived_at)
workspace_members      (id, workspace_id, user_id, role, joined_at)
projects               (id, workspace_id, name, description, status, priority,
                        start_date, end_date, archived_at)
tasks                  (id, workspace_id, project_id, title, description, status,
                        priority, assignee_id, due_date, effort, planned_start,
                        planned_end, archived_at)
activities             (id, workspace_id, message, created_at)
invitations            (id, workspace_id, invited_user_id, role, status, ...)
workspace_join_requests (id, workspace_id, user_id, status, created_at)
notifications          (id, user_id, workspace_id, task_id, type, message,
                        trigger_date, created_at, read_at)
```

Foreign keys with `ON DELETE CASCADE` — deleting a workspace removes all its projects, tasks, members, and activity logs. Database-level triggers enforce status enums, required fields, and date range validity.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start frontend + backend together |
| `npm run client` | Frontend only (Vite) |
| `npm run server` | Backend only (Express) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm test` | Run all tests |
| `npm run test:watch` | Tests in watch mode |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | ESLint auto-fix |
