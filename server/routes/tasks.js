import { Router } from "express";
import db from "../db.js";
<<<<<<< HEAD
import { requireAuth, requireWorkspaceAccess, canAccessWorkspace } from "../middleware/auth.js";
import { route } from "../middleware/error.js";
import { logActivity, uid } from "../utils/workspace.js";

const router = Router();

router.get("/:wsId/tasks", requireAuth, requireWorkspaceAccess, route((req, res) => {
=======
import { requireAuth } from "../middleware/auth.js";
import { route } from "../middleware/error.js";
import { ensureWorkspaceAccess, logActivity, uid } from "../utils/workspace.js";

const router = Router();

// GET /api/workspaces/:wsId/tasks
router.get("/:wsId/tasks", requireAuth, route((req, res) => {
  if (!ensureWorkspaceAccess(res, req.params.wsId, req.userId)) return;
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
  const tasks = db.prepare("SELECT * FROM tasks WHERE workspace_id = ?").all(req.params.wsId);
  res.json(tasks);
}));

<<<<<<< HEAD
router.post("/:wsId/tasks", requireAuth, requireWorkspaceAccess, route((req, res) => {
=======
// POST /api/workspaces/:wsId/tasks
router.post("/:wsId/tasks", requireAuth, route((req, res) => {
  if (!ensureWorkspaceAccess(res, req.params.wsId, req.userId)) return;
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
  const {
    projectId,
    title,
    description = "",
    status = "Todo",
    priority = "Medium",
    assigneeId = "",
    dueDate = "",
    effort = 2,
    plannedStart = "",
    plannedEnd = "",
  } = req.body;
  if (!projectId || !title) return res.status(400).json({ error: "projectId and title are required" });

  const id = uid("t-");
  db.prepare(
    "INSERT INTO tasks (id, workspace_id, project_id, title, description, status, priority, assignee_id, due_date, effort, planned_start, planned_end) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, req.params.wsId, projectId, title, description, status, priority, assigneeId, dueDate, effort, plannedStart, plannedEnd);

  logActivity(req.params.wsId, `Task '${title}' created.`);
<<<<<<< HEAD
  res.status(201).json({
    id,
    workspaceId: req.params.wsId,
    projectId,
    title,
    description,
    status,
    priority,
    assigneeId,
    dueDate,
    effort,
    plannedStart,
    plannedEnd,
  });
}));

router.patch("/:id", requireAuth, route((req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });
  if (!canAccessWorkspace(task.workspace_id, req.userId, req.userRole)) {
    return res.status(403).json({ error: "Forbidden" });
  }
=======
  res.status(201).json({ id, workspaceId: req.params.wsId, projectId, title, description, status, priority, assigneeId, dueDate, effort });
}));

// PATCH /api/tasks/:id
router.patch("/:id", requireAuth, route((req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });
  if (!ensureWorkspaceAccess(res, task.workspace_id, req.userId)) return;
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66

  const colMap = {
    title: "title",
    description: "description",
    status: "status",
    priority: "priority",
    assigneeId: "assignee_id",
    dueDate: "due_date",
    effort: "effort",
    projectId: "project_id",
    plannedStart: "planned_start",
    plannedEnd: "planned_end",
  };

  const updates = [];
  const values = [];
  for (const [bodyKey, col] of Object.entries(colMap)) {
    if (req.body[bodyKey] !== undefined) {
      updates.push(`${col} = ?`);
      values.push(req.body[bodyKey]);
    }
  }
  if (!updates.length) return res.status(400).json({ error: "No fields to update" });

  values.push(req.params.id);
  db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  logActivity(task.workspace_id, "Task updated.");
  res.json(db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id));
}));

<<<<<<< HEAD
router.delete("/:id", requireAuth, route((req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });
  if (!canAccessWorkspace(task.workspace_id, req.userId, req.userRole)) {
    return res.status(403).json({ error: "Forbidden" });
  }
=======
// DELETE /api/tasks/:id
router.delete("/:id", requireAuth, route((req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });
  if (!ensureWorkspaceAccess(res, task.workspace_id, req.userId)) return;
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66

  db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
  logActivity(task.workspace_id, "Task deleted.");
  res.json({ ok: true });
}));

export default router;
