import { Router } from "express";
import db from "../db.js";
<<<<<<< HEAD
import { requireAuth, requireWorkspaceAccess, canAccessWorkspace } from "../middleware/auth.js";
import { route } from "../middleware/error.js";
import { logActivity, uid } from "../utils/workspace.js";

const router = Router();

router.get("/:wsId/projects", requireAuth, requireWorkspaceAccess, route((req, res) => {
=======
import { requireAuth } from "../middleware/auth.js";
import { route } from "../middleware/error.js";
import { ensureWorkspaceAccess, logActivity, uid } from "../utils/workspace.js";

const router = Router();

// GET /api/workspaces/:wsId/projects
router.get("/:wsId/projects", requireAuth, route((req, res) => {
  if (!ensureWorkspaceAccess(res, req.params.wsId, req.userId)) return;
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
  const projects = db.prepare("SELECT * FROM projects WHERE workspace_id = ?").all(req.params.wsId);
  res.json(projects);
}));

<<<<<<< HEAD
router.post("/:wsId/projects", requireAuth, requireWorkspaceAccess, route((req, res) => {
=======
// POST /api/workspaces/:wsId/projects
router.post("/:wsId/projects", requireAuth, route((req, res) => {
  if (!ensureWorkspaceAccess(res, req.params.wsId, req.userId)) return;
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
  const { name, description = "", status = "Planning", priority = "Medium", startDate = "", endDate = "" } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const id = uid("p-");
  db.prepare(
    "INSERT INTO projects (id, workspace_id, name, description, status, priority, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, req.params.wsId, name, description, status, priority, startDate, endDate);

  logActivity(req.params.wsId, `Project '${name}' created.`);
  res.status(201).json({ id, workspaceId: req.params.wsId, name, description, status, priority, startDate, endDate });
}));

<<<<<<< HEAD
router.patch("/:id", requireAuth, route((req, res) => {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  if (!canAccessWorkspace(project.workspace_id, req.userId, req.userRole)) {
    return res.status(403).json({ error: "Forbidden" });
  }
=======
// PATCH /api/projects/:id
router.patch("/:id", requireAuth, route((req, res) => {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  if (!ensureWorkspaceAccess(res, project.workspace_id, req.userId)) return;
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66

  const fields = ["name", "description", "status", "priority", "start_date", "end_date"];
  const updates = [];
  const values = [];
  for (const field of fields) {
    const bodyKey = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (req.body[bodyKey] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[bodyKey]);
    } else if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  }
  if (!updates.length) return res.status(400).json({ error: "No fields to update" });

  values.push(req.params.id);
  db.prepare(`UPDATE projects SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  logActivity(project.workspace_id, "Project updated.");
  res.json(db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id));
}));

<<<<<<< HEAD
router.delete("/:id", requireAuth, route((req, res) => {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  if (!canAccessWorkspace(project.workspace_id, req.userId, req.userRole)) {
    return res.status(403).json({ error: "Forbidden" });
  }
=======
// DELETE /api/projects/:id  (tasks cascade via FK)
router.delete("/:id", requireAuth, route((req, res) => {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  if (!ensureWorkspaceAccess(res, project.workspace_id, req.userId)) return;
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66

  db.prepare("DELETE FROM projects WHERE id = ?").run(req.params.id);
  logActivity(project.workspace_id, "Project deleted.");
  res.json({ ok: true });
}));

export default router;
