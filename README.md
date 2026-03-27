# AI-Assisted Task & Project Management

A clean, GitHub-ready React + Vite project management platform inspired by the reference repository and scoped to the course proposal.

## What is included

- Workspace management
- Project CRUD
- Task CRUD with priority, status, due date, assignee, effort estimate
- Team member management
- Dashboard analytics
- Calendar view
- Activity log
- Lightweight AI helper features implemented locally:
  - task extraction from free-form text
  - daily planning suggestions based on due date, priority, and effort
- Local persistence with `localStorage`
- Responsive UI

## What is intentionally simplified

This version is designed to be stable, demo-friendly, and easy to put on GitHub. It does **not** include a backend, authentication, real email invitations, or real LLM/calendar APIs.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Suggested GitHub repo structure

- `src/components`: reusable UI
- `src/pages`: routed views
- `src/utils`: storage, analytics, seed data, AI helper logic

## Future extension ideas

- Replace localStorage with PostgreSQL + Express API
- Add JWT authentication
- Add real Google Calendar sync
- Replace heuristic AI helper with OpenAI/Gemini APIs
- Add role-based permissions and audit history persistence
