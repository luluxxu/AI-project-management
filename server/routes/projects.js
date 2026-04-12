import { Router } from "express";
import db from "../db.js";
import { requireAuth, requireWorkspaceAccess, canAccessWorkspace } from "../middleware/auth.js";
import { route } from "../middleware/error.js";
import { validateProjectPayload } from "../middleware/validation.js";
import { logActivity, uid } from "../utils/workspace.js";
import { syncTaskNotifications } from "../utils/notifications.js";
import { parsePagination, paginatedResponse } from "../middleware/pagination.js";

const router = Router();

const setProjectArchivedStateTx = db.transaction((project, archivedAt) => {
  db.prepare("UPDATE projects SET archived_at = ? WHERE id = ?").run(archivedAt, project.id);
  db.prepare("UPDATE tasks SET archived_at = ? WHERE project_id = ?").run(archivedAt, project.id);

  if (archivedAt) {
    db.prepare("DELETE FROM notifications WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)").run(project.id);
    logActivity(project.workspace_id, `Project '${project.name}' archived.`);
  } else {
    const tasks = db.prepare("SELECT id FROM tasks WHERE project_id = ?").all(project.id);
    for (const task of tasks) {
      syncTaskNotifications(task.id);
    }
    logActivity(project.workspace_id, `Project '${project.name}' restored.`);
  }
});

router.get("/:wsId/projects", requireAuth, requireWorkspaceAccess, route((req, res) => {
  const includeArchived = req.query.includeArchived === "true";
  const { paginate, page, limit, offset } = parsePagination(req.query);

  if (!paginate) {
    const projects = db.prepare(`
      SELECT * FROM projects
      WHERE workspace_id = ? AND (? = 1 OR archived_at IS NULL)
    `).all(req.params.wsId, includeArchived ? 1 : 0);
    return res.json(projects);
  }

  const total = db.prepare(`
    SELECT COUNT(*) AS count FROM projects
    WHERE workspace_id = ? AND (? = 1 OR archived_at IS NULL)
  `).get(req.params.wsId, includeArchived ? 1 : 0).count;

  const rows = db.prepare(`
    SELECT * FROM projects
    WHERE workspace_id = ? AND (? = 1 OR archived_at IS NULL)
    LIMIT ? OFFSET ?
  `).all(req.params.wsId, includeArchived ? 1 : 0, limit, offset);

  paginatedResponse(res, { rows, total, page, limit });
}));

router.post("/:wsId/projects", requireAuth, requireWorkspaceAccess, route((req, res) => {
  const {
    name,
    description = "",
    status = "Planning",
    priority = "Medium",
    startDate = "",
    endDate = "",
  } = validateProjectPayload(req.body);

  const id = uid("p-");
  db.prepare(
    "INSERT INTO projects (id, workspace_id, name, description, status, priority, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, req.params.wsId, name, description, status, priority, startDate, endDate);

  logActivity(req.params.wsId, `Project '${name}' created.`);
  res.status(201).json({ id, workspaceId: req.params.wsId, name, description, status, priority, startDate, endDate });
}));

router.patch("/:id", requireAuth, route((req, res) => {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  if (!canAccessWorkspace(project.workspace_id, req.userId, req.userRole)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const payload = validateProjectPayload(req.body, { partial: true });
  const fields = ["name", "description", "status", "priority", "start_date", "end_date"];
  const updates = [];
  const values = [];
  for (const field of fields) {
    const bodyKey = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (payload[bodyKey] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(payload[bodyKey]);
    } else if (payload[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(payload[field]);
    }
  }

  values.push(req.params.id);
  db.prepare(`UPDATE projects SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  logActivity(project.workspace_id, "Project updated.");
  res.json(db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id));
}));

router.post("/:id/archive", requireAuth, route((req, res) => {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  if (!canAccessWorkspace(project.workspace_id, req.userId, req.userRole)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (project.archived_at) return res.status(400).json({ error: "Project is already archived" });

  const archivedAt = new Date().toISOString();
  setProjectArchivedStateTx(project, archivedAt);
  res.json({ ok: true, archivedAt });
}));

router.post("/:id/restore", requireAuth, route((req, res) => {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  if (!canAccessWorkspace(project.workspace_id, req.userId, req.userRole)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (!project.archived_at) return res.status(400).json({ error: "Project is not archived" });

  setProjectArchivedStateTx(project, null);
  res.json({ ok: true });
}));

router.delete("/:id", requireAuth, route((req, res) => {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  if (!canAccessWorkspace(project.workspace_id, req.userId, req.userRole)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  db.prepare("DELETE FROM projects WHERE id = ?").run(req.params.id);
  logActivity(project.workspace_id, "Project deleted.");
  res.json({ ok: true });
}));

export default router;
