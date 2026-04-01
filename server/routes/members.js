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

function ownedWorkspace(workspaceId, userId) {
  return db.prepare("SELECT id FROM workspaces WHERE id = ? AND owner_id = ?").get(workspaceId, userId);
}

// GET /api/workspaces/:wsId/members
router.get("/:wsId/members", requireAuth, (req, res) => {
  if (!ownedWorkspace(req.params.wsId, req.userId)) return res.status(403).json({ error: "Forbidden" });
  const members = db.prepare("SELECT * FROM members WHERE workspace_id = ?").all(req.params.wsId);
  res.json(members);
});

// POST /api/workspaces/:wsId/members
router.post("/:wsId/members", requireAuth, (req, res) => {
  if (!ownedWorkspace(req.params.wsId, req.userId)) return res.status(403).json({ error: "Forbidden" });
  const { name, email = "", role = "Member" } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const id = `m-${uid()}`;
  db.prepare("INSERT INTO members (id, workspace_id, name, role, email) VALUES (?, ?, ?, ?, ?)")
    .run(id, req.params.wsId, name, role, email);

  logActivity(req.params.wsId, `Member '${name}' added.`);
  res.status(201).json({ id, workspaceId: req.params.wsId, name, role, email });
});

// PATCH /api/members/:id  (typically just role updates)
router.patch("/:id", requireAuth, (req, res) => {
  const member = db.prepare("SELECT * FROM members WHERE id = ?").get(req.params.id);
  if (!member) return res.status(404).json({ error: "Not found" });
  if (!ownedWorkspace(member.workspace_id, req.userId)) return res.status(403).json({ error: "Forbidden" });

  const fields = ["name", "role", "email"];
  const updates = [];
  const values = [];
  for (const field of fields) {
    if (req.body[field] !== undefined) { updates.push(`${field} = ?`); values.push(req.body[field]); }
  }
  if (!updates.length) return res.status(400).json({ error: "No fields to update" });

  values.push(req.params.id);
  db.prepare(`UPDATE members SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  logActivity(member.workspace_id, "Member updated.");
  res.json(db.prepare("SELECT * FROM members WHERE id = ?").get(req.params.id));
});

export default router;