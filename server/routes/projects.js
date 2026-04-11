import { Router } from "express";
import db from "../db.js";
import { requireAuth, requireWorkspaceAccess, canAccessWorkspace } from "../middleware/auth.js";
import { route } from "../middleware/error.js";
import { validateProjectPayload } from "../middleware/validation.js";
import { logActivity, uid } from "../utils/workspace.js";

const router = Router();

router.get("/:wsId/projects", requireAuth, requireWorkspaceAccess, route((req, res) => {
  const projects = db.prepare("SELECT * FROM projects WHERE workspace_id = ?").all(req.params.wsId);
  res.json(projects);
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
