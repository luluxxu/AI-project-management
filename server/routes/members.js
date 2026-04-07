import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { route } from "../middleware/error.js";
import { ensureOwnedWorkspace, logActivity, uid } from "../utils/workspace.js";

const router = Router();

// GET /api/workspaces/:wsId/members
router.get("/:wsId/members", requireAuth, route((req, res) => {
  if (!ensureOwnedWorkspace(res, req.params.wsId, req.userId)) return;
  const members = db.prepare("SELECT * FROM members WHERE workspace_id = ?").all(req.params.wsId);
  res.json(members);
}));

// POST /api/workspaces/:wsId/members
router.post("/:wsId/members", requireAuth, route((req, res) => {
  if (!ensureOwnedWorkspace(res, req.params.wsId, req.userId)) return;
  const { email = "", role = "Member" } = req.body;
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return res.status(400).json({ error: "email is required" });

  const user = db.prepare("SELECT id, name, email FROM users WHERE lower(email) = ?").get(normalizedEmail);
  if (!user) {
    return res.status(400).json({ error: "That email is not registered yet. Ask them to sign up first." });
  }

  const existingMember = db.prepare(
    "SELECT id FROM members WHERE workspace_id = ? AND lower(email) = ?"
  ).get(req.params.wsId, normalizedEmail);
  if (existingMember) {
    return res.status(409).json({ error: "That user is already a member of this workspace." });
  }

  const id = uid("m-");
  db.prepare("INSERT INTO members (id, workspace_id, name, role, email) VALUES (?, ?, ?, ?, ?)")
    .run(id, req.params.wsId, user.name, role, user.email);

  logActivity(req.params.wsId, `Member '${user.name}' added.`);
  res.status(201).json({ id, workspaceId: req.params.wsId, name: user.name, role, email: user.email });
}));

// PATCH /api/members/:id  (typically just role updates)
router.patch("/:id", requireAuth, route((req, res) => {
  const member = db.prepare("SELECT * FROM members WHERE id = ?").get(req.params.id);
  if (!member) return res.status(404).json({ error: "Not found" });
  if (!ensureOwnedWorkspace(res, member.workspace_id, req.userId)) return;

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

export default router;
