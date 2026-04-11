import { Router } from "express";
import db from "../db.js";
import { requireAuth, canAccessWorkspace, getWorkspaceMembership } from "../middleware/auth.js";
import { route } from "../middleware/error.js";
import { validateLegacyMemberUpdatePayload } from "../middleware/validation.js";
import { logActivity } from "../utils/workspace.js";

const router = Router();

const listMembers = (workspaceId) =>
  db.prepare(`
    SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, wm.joined_at, u.name, u.email
    FROM workspace_members wm
    JOIN users u ON u.id = wm.user_id
    WHERE wm.workspace_id = ?
    ORDER BY wm.joined_at
  `).all(workspaceId);

const updateMemberTx = db.transaction((workspaceId, memberId, payload) => {
  const member = db.prepare(`
    SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, wm.joined_at, u.name, u.email
    FROM workspace_members wm
    JOIN users u ON u.id = wm.user_id
    WHERE wm.id = ?
  `).get(memberId);

  if (!member) {
    const error = new Error("Not found");
    error.statusCode = 404;
    throw error;
  }

  if (payload.role !== undefined) {
    db.prepare("UPDATE workspace_members SET role = ? WHERE id = ?").run(payload.role, memberId);
  }

  if (payload.name !== undefined || payload.email !== undefined) {
    const nextName = payload.name !== undefined ? payload.name : member.name;
    const nextEmail = payload.email !== undefined ? payload.email : member.email;
    db.prepare("UPDATE users SET name = ?, email = ? WHERE id = ?").run(nextName, nextEmail, member.user_id);
  }

  logActivity(workspaceId, "Member updated.");
});

const deleteMemberTx = db.transaction((workspaceId, memberId) => {
  db.prepare("DELETE FROM workspace_members WHERE id = ?").run(memberId);
  logActivity(workspaceId, "Member removed.");
});

router.get("/:wsId/members", requireAuth, route((req, res) => {
  if (!canAccessWorkspace(req.params.wsId, req.userId, req.userRole)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.json(listMembers(req.params.wsId));
}));

router.patch("/:id", requireAuth, route((req, res) => {
  const member = db.prepare("SELECT * FROM workspace_members WHERE id = ?").get(req.params.id);
  const workspaceId = member?.workspace_id;
  if (!workspaceId) return res.status(404).json({ error: "Not found" });

  const payload = validateLegacyMemberUpdatePayload(req.body, { partial: true });
  const actorMembership = getWorkspaceMembership(workspaceId, req.userId);
  if (req.userRole !== "Admin" && (!actorMembership || actorMembership.role === "Member")) {
    return res.status(403).json({ error: "Workspace admin access required" });
  }

  updateMemberTx(workspaceId, req.params.id, payload);
  const updated = db.prepare(`
    SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, wm.joined_at, u.name, u.email
    FROM workspace_members wm
    JOIN users u ON u.id = wm.user_id
    WHERE wm.id = ?
  `).get(req.params.id);
  res.json(updated);
}));

router.delete("/:id", requireAuth, route((req, res) => {
  const target = db.prepare("SELECT * FROM workspace_members WHERE id = ?").get(req.params.id);
  if (!target) return res.status(404).json({ error: "Not found" });

  const workspaceId = target.workspace_id;
  const actorMembership = getWorkspaceMembership(workspaceId, req.userId);
  if (req.userRole !== "Admin" && (!actorMembership || actorMembership.role === "Member")) {
    return res.status(403).json({ error: "Workspace admin access required" });
  }
  if (target.role === "Owner") {
    return res.status(400).json({ error: "The team owner cannot be removed." });
  }

  deleteMemberTx(workspaceId, req.params.id);
  res.json({ ok: true });
}));

export default router;
