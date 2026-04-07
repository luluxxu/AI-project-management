import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { route } from "../middleware/error.js";
import { ensureWorkspaceAccess, ensureWorkspaceOwner, logActivity } from "../utils/workspace.js";

const router = Router();

// GET /api/workspaces/:wsId/members
router.get("/:wsId/members", requireAuth, route((req, res) => {
  if (!ensureWorkspaceAccess(res, req.params.wsId, req.userId)) return;
  const members = db.prepare("SELECT * FROM members WHERE workspace_id = ?").all(req.params.wsId);
  res.json(members);
}));

// PATCH /api/members/:id  (typically just role updates)
router.patch("/:id", requireAuth, route((req, res) => {
  const member = db.prepare("SELECT * FROM members WHERE id = ?").get(req.params.id);
  if (!member) return res.status(404).json({ error: "Not found" });
  if (!ensureWorkspaceOwner(res, member.workspace_id, req.userId)) return;

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
}));

// DELETE /api/members/:id
router.delete("/:id", requireAuth, route((req, res) => {
  const member = db.prepare("SELECT * FROM members WHERE id = ?").get(req.params.id);
  if (!member) return res.status(404).json({ error: "Not found" });
  if (!ensureWorkspaceOwner(res, member.workspace_id, req.userId)) return;
  if (member.role === "Owner") {
    return res.status(400).json({ error: "The team owner cannot be removed." });
  }

  db.prepare("DELETE FROM members WHERE id = ?").run(req.params.id);
  logActivity(member.workspace_id, `Member '${member.name}' removed.`);
  res.json({ ok: true });
}));

export default router;
