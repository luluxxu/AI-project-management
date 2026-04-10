import { Router } from "express";
import db from "../db.js";
import {
  requireAuth,
<<<<<<< HEAD
  requireWorkspaceAccess, requireWorkspaceAdmin,
=======
  requireWorkspaceAccess,
  requireWorkspaceAdmin,
>>>>>>> 15f72fd4 (update members.js)
  getWorkspaceMembership,
} from "../middleware/auth.js";
import { route } from "../middleware/error.js";
import { logActivity, uid } from "../utils/workspace.js";

const router = Router();

<<<<<<< HEAD
// ── Discover (must be before /:id routes) ──

// GET /discover — list workspaces the user is NOT in (for requesting access)
router.get("/discover", requireAuth, route((req, res) => {
  const workspaces = db.prepare(`
    SELECT w.id, w.name, w.description,
           (SELECT COUNT(*) FROM workspace_members wm2 WHERE wm2.workspace_id = w.id) AS member_count
    FROM workspaces w
    WHERE w.id NOT IN (
      SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = ?
    )
    ORDER BY w.created_at DESC
  `).all(req.userId);
  res.json(workspaces);
}));

// ── Workspace CRUD ──

// GET / — list workspaces the user belongs to (admin sees all)
router.get("/", requireAuth, route((req, res) => {
  const workspaces = req.userRole === "Admin"
    ? db.prepare(`
        SELECT w.*, COALESCE(wm.role, 'Admin') AS my_role
        FROM workspaces w
        LEFT JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = ?
        ORDER BY w.created_at
      `).all(req.userId)
    : db.prepare(`
        SELECT w.*, wm.role AS my_role
        FROM workspaces w
        JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = ?
        ORDER BY w.created_at
      `).all(req.userId);
  res.json(workspaces);
}));

// POST / — create a new workspace (creator becomes Owner)
=======
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

>>>>>>> 15f72fd4 (update members.js)
router.post("/", requireAuth, route((req, res) => {
  const { name, description = "" } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const id = uid("ws-");
  const now = new Date().toISOString();
  db.prepare("INSERT INTO workspaces (id, name, description, created_at, owner_id) VALUES (?, ?, ?, ?, ?)")
    .run(id, name, description, now, req.userId);

<<<<<<< HEAD
  // Add creator as Owner member
  db.prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, 'Owner', ?)")
    .run(uid("wm-"), id, req.userId, now);

  logActivity(id, `Workspace '${name}' created.`);
  res.status(201).json({ id, name, description, createdAt: now, ownerId: req.userId, my_role: "Owner" });
}));

// DELETE /:id — workspace Owner or platform Admin
router.delete("/:id", requireAuth, route((req, res) => {
  const ws = db.prepare("SELECT id, owner_id FROM workspaces WHERE id = ?").get(req.params.id);
  if (!ws) return res.status(404).json({ error: "Workspace not found" });
=======
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
>>>>>>> 15f72fd4 (update members.js)

  const membership = getWorkspaceMembership(req.params.id, req.userId);
  if (req.userRole !== "Admin" && (!membership || membership.role !== "Owner")) {
    return res.status(403).json({ error: "Only workspace Owner or platform Admin can delete" });
  }

  db.prepare("DELETE FROM workspaces WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
}));

<<<<<<< HEAD
// ── Workspace Members ──

// GET /:wsId/members — list members (any workspace member can view)
router.get("/:wsId/members", requireAuth, requireWorkspaceAccess, route((req, res) => {
  const members = db.prepare(`
    SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, wm.joined_at, u.name, u.email
    FROM workspace_members wm
    JOIN users u ON u.id = wm.user_id
    WHERE wm.workspace_id = ?
    ORDER BY wm.joined_at
  `).all(req.params.wsId);
  res.json(members);
}));

// POST /:wsId/members — invite a user by email (Owner/Admin only)
router.post("/:wsId/members", requireAuth, requireWorkspaceAdmin, route((req, res) => {
  const { email, role = "Member" } = req.body;
  if (!email) return res.status(400).json({ error: "email is required" });
  if (!["Admin", "Member"].includes(role)) return res.status(400).json({ error: "role must be Admin or Member" });

  const user = db.prepare("SELECT id, name, email FROM users WHERE email = ?").get(email);
  if (!user) return res.status(404).json({ error: "User not found. They need to register first." });

  const existing = getWorkspaceMembership(req.params.wsId, user.id);
  if (existing) return res.status(409).json({ error: "User is already a member of this workspace" });

  const id = uid("wm-");
  const now = new Date().toISOString();
  db.prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, req.params.wsId, user.id, role, now);

  logActivity(req.params.wsId, `${user.name} was invited as ${role}.`);
  res.status(201).json({ id, userId: user.id, name: user.name, email: user.email, role, joinedAt: now });
}));

// PATCH /:wsId/members/:userId — change a member's workspace role (Owner/Admin only)
=======
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
  const memberId = uid("wm-");
  db.prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)")
    .run(memberId, req.params.wsId, user.id, role, now);
  db.prepare("INSERT OR IGNORE INTO members (id, workspace_id, user_id, name, role, email) VALUES (?, ?, ?, ?, ?, ?)")
    .run(uid("m-"), req.params.wsId, user.id, user.name, role, user.email);

  logActivity(req.params.wsId, `${user.name} was added as ${role}.`);
  res.status(201).json({
    id: memberId,
    workspaceId: req.params.wsId,
    userId: user.id,
    name: user.name,
    email: user.email,
    role,
    joinedAt: now,
  });
}));

>>>>>>> 15f72fd4 (update members.js)
router.patch("/:wsId/members/:userId", requireAuth, requireWorkspaceAdmin, route((req, res) => {
  const { role } = req.body;
  if (!role || !["Owner", "Admin", "Member"].includes(role)) {
    return res.status(400).json({ error: "role must be Owner, Admin, or Member" });
  }

  const membership = getWorkspaceMembership(req.params.wsId, req.params.userId);
  if (!membership) return res.status(404).json({ error: "User is not a member" });

  db.prepare("UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?")
    .run(role, req.params.wsId, req.params.userId);
<<<<<<< HEAD

  const updated = db.prepare(`
    SELECT wm.id, wm.user_id, wm.role, wm.joined_at, u.name, u.email
    FROM workspace_members wm JOIN users u ON u.id = wm.user_id
    WHERE wm.workspace_id = ? AND wm.user_id = ?
  `).get(req.params.wsId, req.params.userId);
  res.json(updated);
}));

// DELETE /:wsId/members/:userId — remove a member (Owner/Admin only, cannot remove self if Owner)
router.delete("/:wsId/members/:userId", requireAuth, requireWorkspaceAdmin, route((req, res) => {
  if (req.params.userId === req.userId) {
    const myRole = getWorkspaceMembership(req.params.wsId, req.userId);
    if (myRole?.role === "Owner") return res.status(400).json({ error: "Owner cannot remove themselves" });
=======
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
>>>>>>> 15f72fd4 (update members.js)
  }

  const membership = getWorkspaceMembership(req.params.wsId, req.params.userId);
  if (!membership) return res.status(404).json({ error: "User is not a member" });

  db.prepare("DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?")
    .run(req.params.wsId, req.params.userId);
<<<<<<< HEAD
=======
  db.prepare("DELETE FROM members WHERE workspace_id = ? AND user_id = ?")
    .run(req.params.wsId, req.params.userId);
>>>>>>> 15f72fd4 (update members.js)

  logActivity(req.params.wsId, "A member was removed.");
  res.json({ ok: true });
}));

<<<<<<< HEAD
// ── Join Requests ──

// POST /:wsId/join-request — request to join a workspace
router.post("/:wsId/join-request", requireAuth, route((req, res) => {
  const ws = db.prepare("SELECT id FROM workspaces WHERE id = ?").get(req.params.wsId);
  if (!ws) return res.status(404).json({ error: "Workspace not found" });

  const existing = getWorkspaceMembership(req.params.wsId, req.userId);
  if (existing) return res.status(409).json({ error: "Already a member" });
=======
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
>>>>>>> 15f72fd4 (update members.js)

  const existingReq = db.prepare(
    "SELECT id, status FROM workspace_join_requests WHERE workspace_id = ? AND user_id = ?"
  ).get(req.params.wsId, req.userId);
<<<<<<< HEAD
=======
  const now = new Date().toISOString();

>>>>>>> 15f72fd4 (update members.js)
  if (existingReq && existingReq.status === "Pending") {
    return res.status(409).json({ error: "Request already pending" });
  }

<<<<<<< HEAD
  const id = uid("jr-");
  const now = new Date().toISOString();
  if (existingReq) {
    // Re-request after rejection
=======
  if (existingReq) {
>>>>>>> 15f72fd4 (update members.js)
    db.prepare("UPDATE workspace_join_requests SET status = 'Pending', created_at = ? WHERE id = ?")
      .run(now, existingReq.id);
    return res.json({ id: existingReq.id, status: "Pending" });
  }

<<<<<<< HEAD
=======
  const id = uid("jr-");
>>>>>>> 15f72fd4 (update members.js)
  db.prepare("INSERT INTO workspace_join_requests (id, workspace_id, user_id, status, created_at) VALUES (?, ?, ?, 'Pending', ?)")
    .run(id, req.params.wsId, req.userId, now);
  res.status(201).json({ id, status: "Pending" });
}));

<<<<<<< HEAD
// GET /:wsId/join-requests — list pending join requests (Owner/Admin only)
=======
>>>>>>> 15f72fd4 (update members.js)
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

<<<<<<< HEAD
// PATCH /:wsId/join-requests/:requestId — approve or reject
router.patch("/:wsId/join-requests/:requestId", requireAuth, requireWorkspaceAdmin, route((req, res) => {
  const { status } = req.body;
  if (!status || !["Approved", "Rejected"].includes(status)) {
=======
router.patch("/:wsId/join-requests/:requestId", requireAuth, requireWorkspaceAdmin, route((req, res) => {
  const { status } = req.body;
  if (!["Approved", "Rejected"].includes(status)) {
>>>>>>> 15f72fd4 (update members.js)
    return res.status(400).json({ error: "status must be Approved or Rejected" });
  }

  const request = db.prepare(
    "SELECT * FROM workspace_join_requests WHERE id = ? AND workspace_id = ?"
  ).get(req.params.requestId, req.params.wsId);
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (request.status !== "Pending") return res.status(400).json({ error: "Request already processed" });

  db.prepare("UPDATE workspace_join_requests SET status = ? WHERE id = ?").run(status, request.id);

  if (status === "Approved") {
<<<<<<< HEAD
    const now = new Date().toISOString();
    db.prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, 'Member', ?)")
      .run(uid("wm-"), req.params.wsId, request.user_id, now);
=======
    const user = db.prepare("SELECT name, email FROM users WHERE id = ?").get(request.user_id);
    const now = new Date().toISOString();
    db.prepare("INSERT OR IGNORE INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, 'Member', ?)")
      .run(uid("wm-"), req.params.wsId, request.user_id, now);
    db.prepare("INSERT OR IGNORE INTO members (id, workspace_id, user_id, name, role, email) VALUES (?, ?, ?, ?, 'Member', ?)")
      .run(uid("m-"), req.params.wsId, request.user_id, user?.name || "Member", user?.email || "");
>>>>>>> 15f72fd4 (update members.js)
    logActivity(req.params.wsId, "A join request was approved.");
  }

  res.json({ ok: true, status });
}));

export default router;
