import { Router } from "express";
import { randomUUID } from "crypto";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const uid = () => randomUUID().slice(0, 8);

const logActivity = (workspaceId, message) => {
  db.prepare("INSERT INTO activities (id, workspace_id, message, created_at) VALUES (?, ?, ?, ?)")
    .run(`a-${uid()}`, workspaceId, message, new Date().toISOString());
};

// Verify the workspace belongs to the requesting user
function ownedWorkspace(workspaceId, userId) {
  return db.prepare("SELECT id FROM workspaces WHERE id = ? AND owner_id = ?").get(workspaceId, userId);
}

// GET /api/workspaces/:wsId/projects
router.get("/:wsId/projects", requireAuth, (req, res) => {
  if (!ownedWorkspace(req.params.wsId, req.userId)) return res.status(403).json({ error: "Forbidden" });
  const projects = db.prepare("SELECT * FROM projects WHERE workspace_id = ?").all(req.params.wsId);
  res.json(projects);
});

// POST /api/workspaces/:wsId/projects
router.post("/:wsId/projects", requireAuth, (req, res) => {
  if (!ownedWorkspace(req.params.wsId, req.userId)) return res.status(403).json({ error: "Forbidden" });
  const { name, description = "", status = "Planning", priority = "Medium", startDate = "", endDate = "" } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const id = `p-${uid()}`;
  db.prepare(
    "INSERT INTO projects (id, workspace_id, name, description, status, priority, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, req.params.wsId, name, description, status, priority, startDate, endDate);

  logActivity(req.params.wsId, `Project '${name}' created.`);
  res.status(201).json({ id, workspaceId: req.params.wsId, name, description, status, priority, startDate, endDate });
});

// PATCH /api/projects/:id
router.patch("/:id", requireAuth, (req, res) => {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  if (!ownedWorkspace(project.workspace_id, req.userId)) return res.status(403).json({ error: "Forbidden" });

  const fields = ["name", "description", "status", "priority", "start_date", "end_date"];
  const updates = [];
  const values = [];
  for (const field of fields) {
    const bodyKey = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase()); // snake_case → camelCase
    if (req.body[bodyKey] !== undefined) { updates.push(`${field} = ?`); values.push(req.body[bodyKey]); }
    else if (req.body[field] !== undefined) { updates.push(`${field} = ?`); values.push(req.body[field]); }
  }
  if (!updates.length) return res.status(400).json({ error: "No fields to update" });

  values.push(req.params.id);
  db.prepare(`UPDATE projects SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  logActivity(project.workspace_id, "Project updated.");
  res.json(db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id));
});

// DELETE /api/projects/:id  (tasks cascade via FK)
router.delete("/:id", requireAuth, (req, res) => {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  if (!ownedWorkspace(project.workspace_id, req.userId)) return res.status(403).json({ error: "Forbidden" });

  db.prepare("DELETE FROM projects WHERE id = ?").run(req.params.id);
  logActivity(project.workspace_id, "Project deleted.");
  res.json({ ok: true });
});

export default router;
