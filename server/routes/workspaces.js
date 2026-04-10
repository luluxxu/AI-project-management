import { Router } from "express";
import db from "../db.js";
import {
  requireAuth,
  requireWorkspaceAccess,
  requireWorkspaceAdmin,
  getWorkspaceMembership,
} from "../middleware/auth.js";
import { route } from "../middleware/error.js";
import { logActivity, uid } from "../utils/workspace.js";

const router = Router();

const listWorkspaceMembers = (workspaceId) =>
  db.prepare(`
    SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, wm.joined_at, u.name, u.email
    FROM workspace_members wm
    JOIN users u ON u.id = wm.user_id
    WHERE wm.workspace_id = ?

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

router.get("/discover", requireAuth, route((req, res) => {
  const workspaces = db.prepare(`
    SELECT
      w.id,
      w.name,
      w.description,
      (
        SELECT COUNT(*)
        FROM (
          SELECT user_id
          FROM workspace_members
          WHERE workspace_id = w.id
          UNION
          SELECT user_id
          FROM members
          WHERE workspace_id = w.id AND user_id IS NOT NULL AND user_id <> ''
        ) joined_members
      ) AS member_count
    FROM workspaces w
    WHERE w.id NOT IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = ?
      UNION
      SELECT workspace_id FROM members WHERE user_id = ?
    )
    ORDER BY w.created_at DESC
  `).all(req.userId, req.userId);
  res.json(workspaces);
}));

router.get("/", requireAuth, route((req, res) => {
  const workspaces = req.userRole === "Admin"
    ? db.prepare(`
        SELECT
          w.*,
          COALESCE(wm.role, m.role, 'Admin') AS my_role,
          COALESCE(wm.role, m.role, 'Admin') AS current_role
        FROM workspaces w
        LEFT JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = ?
        LEFT JOIN members m ON m.workspace_id = w.id AND m.user_id = ?
        ORDER BY w.created_at
      `).all(req.userId, req.userId)
    : db.prepare(`
        SELECT DISTINCT
          w.*,
          COALESCE(wm.role, m.role) AS my_role,
          COALESCE(wm.role, m.role) AS current_role
        FROM workspaces w
        LEFT JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = ?
        LEFT JOIN members m ON m.workspace_id = w.id AND m.user_id = ?
        WHERE wm.user_id IS NOT NULL OR m.user_id IS NOT NULL
        ORDER BY w.created_at
      `).all(req.userId, req.userId);
  res.json(workspaces);
}));

router.post("/", requireAuth, route((req, res) => {
  const { name, description = "" } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const id = uid("ws-");
  const now = new Date().toISOString();
  db.prepare("INSERT INTO workspaces (id, name, description, created_at, owner_id) VALUES (?, ?, ?, ?, ?)")
    .run(id, name, description, now, req.userId);

  const owner = db.prepare("SELECT name, email FROM users WHERE id = ?").get(req.userId);
  db.prepare("INSERT OR IGNORE INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, 'Owner', ?)")
    .run(uid("wm-"), id, req.userId, now);
  db.prepare("INSERT OR IGNORE INTO members (id, workspace_id, user_id, name, role, email) VALUES (?, ?, ?, ?, ?, ?)")
    .run(uid("m-"), id, req.userId, owner?.name || "Owner", "Owner", owner?.email || "");

  logActivity(id, `Workspace '${name}' created.`);
  res.status(201).json({
    id,
    name,
    description,
    createdAt: now,
    ownerId: req.userId,
    my_role: "Owner",
    current_role: "Owner",
  });
}));

router.delete("/:id", requireAuth, route((req, res) => {
  const workspace = db.prepare("SELECT id, owner_id FROM workspaces WHERE id = ?").get(req.params.id);
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });

  const membership = getWorkspaceMembership(req.params.id, req.userId);
  if (req.userRole !== "Admin" && (!membership || membership.role !== "Owner")) {
    return res.status(403).json({ error: "Only workspace Owner or platform Admin can delete" });
  }

  db.prepare("DELETE FROM workspaces WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
}));

router.get("/:wsId/members", requireAuth, requireWorkspaceAccess, route((req, res) => {
  res.json(listWorkspaceMembers(req.params.wsId));
}));

router.post("/:wsId/members", requireAuth, requireWorkspaceAdmin, route((req, res) => {
  const { email = "", role = "Member" } = req.body;
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return res.status(400).json({ error: "email is required" });
  if (!["Owner", "Admin", "Member"].includes(role)) {
    return res.status(400).json({ error: "role must be Owner, Admin, or Member" });
  }

  const user = db.prepare("SELECT id, name, email FROM users WHERE lower(email) = ?").get(normalizedEmail);
  if (!user) {
    return res.status(404).json({ error: "User not found. They need to register first." });
  }

  const existing = getWorkspaceMembership(req.params.wsId, user.id);
  if (existing) {
    return res.status(409).json({ error: "User is already a member of this workspace" });
  }

  const now = new Date().toISOString();
  db.prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)")
    .run(uid("wm-"), req.params.wsId, user.id, role, now);
  db.prepare("INSERT OR IGNORE INTO members (id, workspace_id, user_id, name, role, email) VALUES (?, ?, ?, ?, ?, ?)")
    .run(uid("m-"), req.params.wsId, user.id, user.name, role, user.email);

  logActivity(req.params.wsId, `${user.name} was added as ${role}.`);
  res.status(201).json({
    id: uid("wm-response-"),
    workspaceId: req.params.wsId,
    userId: user.id,
    name: user.name,
    email: user.email,
    role,
    joinedAt: now,
  });
}));

router.patch("/:wsId/members/:userId", requireAuth, requireWorkspaceAdmin, route((req, res) => {
  const { role } = req.body;
  if (!role || !["Owner", "Admin", "Member"].includes(role)) {
    return res.status(400).json({ error: "role must be Owner, Admin, or Member" });
  }

  const membership = getWorkspaceMembership(req.params.wsId, req.params.userId);
  if (!membership) return res.status(404).json({ error: "User is not a member" });

  db.prepare("UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?")
    .run(role, req.params.wsId, req.params.userId);
  db.prepare("UPDATE members SET role = ? WHERE workspace_id = ? AND user_id = ?")
    .run(role, req.params.wsId, req.params.userId);

  const updated = listWorkspaceMembers(req.params.wsId).find((member) => member.user_id === req.params.userId);
  logActivity(req.params.wsId, "Member role updated.");
  res.json(updated);
}));

router.delete("/:wsId/members/:userId", requireAuth, requireWorkspaceAdmin, route((req, res) => {
  if (req.params.userId === req.userId) {
    const myMembership = getWorkspaceMembership(req.params.wsId, req.userId);
    if (myMembership?.role === "Owner") {
      return res.status(400).json({ error: "Owner cannot remove themselves" });
    }
  }

  const membership = getWorkspaceMembership(req.params.wsId, req.params.userId);
  if (!membership) return res.status(404).json({ error: "User is not a member" });

  db.prepare("DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?")
    .run(req.params.wsId, req.params.userId);
  db.prepare("DELETE FROM members WHERE workspace_id = ? AND user_id = ?")
    .run(req.params.wsId, req.params.userId);

  logActivity(req.params.wsId, "A member was removed.");
  res.json({ ok: true });
}));

router.get("/:wsId/invitations", requireAuth, requireWorkspaceAdmin, route((req, res) => {
  const invitations = db.prepare(`
    SELECT id, workspace_id, invited_user_id, invited_email, invited_name, role, status, invited_by_id, created_at, responded_at
    FROM invitations
    WHERE workspace_id = ?
    ORDER BY created_at DESC
  `).all(req.params.wsId);
  res.json(invitations);
}));

router.post("/:wsId/invitations", requireAuth, requireWorkspaceAdmin, route((req, res) => {
  const { email = "", role = "Member" } = req.body;
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return res.status(400).json({ error: "email is required" });
  if (!["Owner", "Admin", "Member"].includes(role)) {
    return res.status(400).json({ error: "role must be Owner, Admin, or Member" });
  }

  const user = db.prepare("SELECT id, name, email FROM users WHERE lower(email) = ?").get(normalizedEmail);
  if (!user) {
    return res.status(400).json({ error: "That email is not registered yet. Ask them to sign up first." });
  }

  if (getWorkspaceMembership(req.params.wsId, user.id)) {
    return res.status(409).json({ error: "That user is already a member of this team." });
  }

  const pending = db.prepare(
    "SELECT id FROM invitations WHERE workspace_id = ? AND invited_user_id = ? AND status = 'Pending'"
  ).get(req.params.wsId, user.id);
  if (pending) {
    return res.status(409).json({ error: "That user already has a pending invitation." });
  }

  const invitation = {
    id: uid("inv-"),
    workspaceId: req.params.wsId,
    invitedUserId: user.id,
    invitedEmail: user.email,
    invitedName: user.name,
    role,
    status: "Pending",
    invitedById: req.userId,
    createdAt: new Date().toISOString(),
    respondedAt: null,
  };

  db.prepare(`
    INSERT INTO invitations (id, workspace_id, invited_user_id, invited_email, invited_name, role, status, invited_by_id, created_at, responded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    invitation.id,
    invitation.workspaceId,
    invitation.invitedUserId,
    invitation.invitedEmail,
    invitation.invitedName,
    invitation.role,
    invitation.status,
    invitation.invitedById,
    invitation.createdAt,
    invitation.respondedAt
  );

  logActivity(req.params.wsId, `Invitation sent to '${user.name}'.`);
  res.status(201).json(invitation);
}));

router.post("/:wsId/join-request", requireAuth, route((req, res) => {
  const workspace = db.prepare("SELECT id FROM workspaces WHERE id = ?").get(req.params.wsId);
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });

  if (getWorkspaceMembership(req.params.wsId, req.userId)) {
    return res.status(409).json({ error: "Already a member" });
  }

  const existingReq = db.prepare(
    "SELECT id, status FROM workspace_join_requests WHERE workspace_id = ? AND user_id = ?"
  ).get(req.params.wsId, req.userId);

  const now = new Date().toISOString();
  if (existingReq && existingReq.status === "Pending") {
    return res.status(409).json({ error: "Request already pending" });
  }

  if (existingReq) {
    db.prepare("UPDATE workspace_join_requests SET status = 'Pending', created_at = ? WHERE id = ?")
      .run(now, existingReq.id);
    return res.json({ id: existingReq.id, status: "Pending" });
  }

  const id = uid("jr-");
  db.prepare("INSERT INTO workspace_join_requests (id, workspace_id, user_id, status, created_at) VALUES (?, ?, ?, 'Pending', ?)")
    .run(id, req.params.wsId, req.userId, now);
  res.status(201).json({ id, status: "Pending" });
}));

router.get("/:wsId/join-requests", requireAuth, requireWorkspaceAdmin, route((req, res) => {
  const requests = db.prepare(`
    SELECT jr.id, jr.user_id, jr.status, jr.created_at, u.name, u.email
    FROM workspace_join_requests jr
    JOIN users u ON u.id = jr.user_id
    WHERE jr.workspace_id = ? AND jr.status = 'Pending'
    ORDER BY jr.created_at
  `).all(req.params.wsId);
  res.json(requests);
}));

router.patch("/:wsId/join-requests/:requestId", requireAuth, requireWorkspaceAdmin, route((req, res) => {
  const { status } = req.body;
  if (!["Approved", "Rejected"].includes(status)) {
    return res.status(400).json({ error: "status must be Approved or Rejected" });
  }

  const request = db.prepare(
    "SELECT * FROM workspace_join_requests WHERE id = ? AND workspace_id = ?"
  ).get(req.params.requestId, req.params.wsId);
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (request.status !== "Pending") return res.status(400).json({ error: "Request already processed" });

  db.prepare("UPDATE workspace_join_requests SET status = ? WHERE id = ?").run(status, request.id);

  if (status === "Approved") {
    const user = db.prepare("SELECT name, email FROM users WHERE id = ?").get(request.user_id);
    const now = new Date().toISOString();
    db.prepare("INSERT OR IGNORE INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, 'Member', ?)")
      .run(uid("wm-"), req.params.wsId, request.user_id, now);
    db.prepare("INSERT OR IGNORE INTO members (id, workspace_id, user_id, name, role, email) VALUES (?, ?, ?, ?, 'Member', ?)")
      .run(uid("m-"), req.params.wsId, request.user_id, user?.name || "Member", user?.email || "");
    logActivity(req.params.wsId, "A join request was approved.");
  }

  res.json({ ok: true, status });
}));

export default router;
