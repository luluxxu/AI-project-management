import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { route } from "../middleware/error.js";
import { logActivity, uid } from "../utils/workspace.js";

const router = Router();

// GET /api/invitations — list pending invitations for the current user
router.get("/", requireAuth, route((req, res) => {
  const invitations = db.prepare(`
    SELECT i.*, w.name AS workspace_name, inviter.name AS invited_by_name
    FROM invitations i
    JOIN workspaces w ON w.id = i.workspace_id
    JOIN users inviter ON inviter.id = i.invited_by_id
    WHERE i.invited_user_id = ? AND i.status = 'Pending'
    ORDER BY i.created_at DESC
  `).all(req.userId);
  res.json(invitations);
}));

// POST /api/invitations/:id/respond — accept or reject a pending invitation
router.post("/:id/respond", requireAuth, route((req, res) => {
  const { action } = req.body;
  if (!["accept", "reject"].includes(action)) {
    return res.status(400).json({ error: "action must be 'accept' or 'reject'" });
  }

  const invitation = db.prepare("SELECT * FROM invitations WHERE id = ?").get(req.params.id);
  if (!invitation) return res.status(404).json({ error: "Invitation not found" });
  if (invitation.invited_user_id !== req.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (invitation.status !== "Pending") {
    return res.status(400).json({ error: "This invitation has already been responded to." });
  }

  const respondedAt = new Date().toISOString();
  const nextStatus = action === "accept" ? "Accepted" : "Rejected";
  db.prepare("UPDATE invitations SET status = ?, responded_at = ? WHERE id = ?")
    .run(nextStatus, respondedAt, invitation.id);

  if (action === "accept") {
    const existingMember = db.prepare(
      "SELECT id FROM members WHERE workspace_id = ? AND user_id = ?"
    ).get(invitation.workspace_id, req.userId);
<<<<<<< HEAD
    const existingWorkspaceMember = db.prepare(
      "SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?"
    ).get(invitation.workspace_id, req.userId);
=======
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66

    if (!existingMember) {
      db.prepare(
        "INSERT INTO members (id, workspace_id, user_id, name, role, email) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(
        uid("m-"),
        invitation.workspace_id,
        req.userId,
        invitation.invited_name,
        invitation.role,
        invitation.invited_email
      );
    }
<<<<<<< HEAD
    if (!existingWorkspaceMember) {
      db.prepare(
        "INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)"
      ).run(
        uid("wm-"),
        invitation.workspace_id,
        req.userId,
        invitation.role,
        respondedAt
      );
    }
=======
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66

    logActivity(invitation.workspace_id, `Invitation accepted by '${invitation.invited_name}'.`);
  } else {
    logActivity(invitation.workspace_id, `Invitation rejected by '${invitation.invited_name}'.`);
  }

  res.json({
    id: invitation.id,
    status: nextStatus,
    respondedAt,
  });
}));

export default router;
