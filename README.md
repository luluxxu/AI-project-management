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


### Authentication & Persistence
- Email + password registration and login
- JWT-based session management (7-day expiry)
- SQLite database — data persists across page refreshes and browser clears
- Each user sees only their own workspaces