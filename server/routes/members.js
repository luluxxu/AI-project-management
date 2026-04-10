import { Router } from "express";
import db from "../db.js";
<<<<<<< HEAD
import { requireAuth, requireWorkspaceAccess } from "../middleware/auth.js";
import { route } from "../middleware/error.js";

const router = Router();

// GET /api/v1/members/:wsId/members
// Returns workspace_members joined with users (replaces old members table)
router.get("/:wsId/members", requireAuth, requireWorkspaceAccess, route((req, res) => {
  const members = db.prepare(`
=======
import { requireAuth, canAccessWorkspace, getWorkspaceMembership } from "../middleware/auth.js";
import { route } from "../middleware/error.js";
import { logActivity } from "../utils/workspace.js";

const router = Router();

const listMembers = (workspaceId) =>
  db.prepare(`
>>>>>>> 15f72fd4 (update members.js)
    SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, wm.joined_at, u.name, u.email
    FROM workspace_members wm
    JOIN users u ON u.id = wm.user_id
    WHERE wm.workspace_id = ?
<<<<<<< HEAD
    ORDER BY wm.joined_at
  `).all(req.params.wsId);
  res.json(members);
=======

    UNION ALL

    SELECT m.id, m.workspace_id, m.user_id, m.role, w.created_at AS joined_at, m.name, m.email
    FROM members m
    JOIN workspaces w ON w.id = m.workspace_id
    WHERE m.workspace_id = ?
      AND (
        m.user_id IS NULL
        OR m.user_id = ''
        OR m.user_id NOT IN (
          SELECT user_id
          FROM workspace_members
          WHERE workspace_id = ?
        )
      )

    ORDER BY joined_at
  `).all(workspaceId, workspaceId, workspaceId);

router.get("/:wsId/members", requireAuth, route((req, res) => {
  if (!canAccessWorkspace(req.params.wsId, req.userId, req.userRole)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.json(listMembers(req.params.wsId));
}));

router.patch("/:id", requireAuth, route((req, res) => {
  const member = db.prepare("SELECT * FROM members WHERE id = ?").get(req.params.id);
  const workspaceMember = member
    ? null
    : db.prepare("SELECT * FROM workspace_members WHERE id = ?").get(req.params.id);

  const workspaceId = member?.workspace_id || workspaceMember?.workspace_id;
  if (!workspaceId) return res.status(404).json({ error: "Not found" });

  const actorMembership = getWorkspaceMembership(workspaceId, req.userId);
  if (req.userRole !== "Admin" && (!actorMembership || actorMembership.role === "Member")) {
    return res.status(403).json({ error: "Workspace admin access required" });
  }

  if (member) {
    const fields = ["name", "role", "email"];
    const updates = [];
    const values = [];
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }
    if (!updates.length) return res.status(400).json({ error: "No fields to update" });

    values.push(req.params.id);
    db.prepare(`UPDATE members SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    if (member.user_id && req.body.role !== undefined) {
      db.prepare("UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?")
        .run(req.body.role, workspaceId, member.user_id);
    }
  } else {
    if (req.body.role === undefined) return res.status(400).json({ error: "No fields to update" });
    db.prepare("UPDATE workspace_members SET role = ? WHERE id = ?").run(req.body.role, req.params.id);
    if (workspaceMember.user_id) {
      db.prepare("UPDATE members SET role = ? WHERE workspace_id = ? AND user_id = ?")
        .run(req.body.role, workspaceId, workspaceMember.user_id);
    }
  }

  logActivity(workspaceId, "Member updated.");
  const updated =
    db.prepare("SELECT * FROM members WHERE id = ?").get(req.params.id) ||
    db.prepare(`
      SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, wm.joined_at, u.name, u.email
      FROM workspace_members wm
      JOIN users u ON u.id = wm.user_id
      WHERE wm.id = ?
    `).get(req.params.id);
  res.json(updated);
}));

router.delete("/:id", requireAuth, route((req, res) => {
  const member = db.prepare("SELECT * FROM members WHERE id = ?").get(req.params.id);
  const workspaceMember = member
    ? null
    : db.prepare("SELECT * FROM workspace_members WHERE id = ?").get(req.params.id);

  const target = member || workspaceMember;
  if (!target) return res.status(404).json({ error: "Not found" });

  const workspaceId = target.workspace_id;
  const actorMembership = getWorkspaceMembership(workspaceId, req.userId);
  if (req.userRole !== "Admin" && (!actorMembership || actorMembership.role === "Member")) {
    return res.status(403).json({ error: "Workspace admin access required" });
  }
  if (target.role === "Owner") {
    return res.status(400).json({ error: "The team owner cannot be removed." });
  }

  db.prepare("DELETE FROM members WHERE id = ?").run(req.params.id);
  db.prepare("DELETE FROM workspace_members WHERE id = ?").run(req.params.id);
  if (target.user_id) {
    db.prepare("DELETE FROM members WHERE workspace_id = ? AND user_id = ?").run(workspaceId, target.user_id);
    db.prepare("DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?").run(workspaceId, target.user_id);
  }

  logActivity(workspaceId, "Member removed.");
  res.json({ ok: true });
>>>>>>> 15f72fd4 (update members.js)
}));

export default router;
