import { Router } from "express";
import db from "../db.js";
import {
  requireAuth,
  requireWorkspaceAccess, requireWorkspaceAdmin,
  getWorkspaceMembership,
} from "../middleware/auth.js";
import { route } from "../middleware/error.js";
import { logActivity, uid } from "../utils/workspace.js";

const router = Router();

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
router.post("/", requireAuth, route((req, res) => {
  const { name, description = "" } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const id = uid("ws-");
  const now = new Date().toISOString();
  db.prepare("INSERT INTO workspaces (id, name, description, created_at, owner_id) VALUES (?, ?, ?, ?, ?)")
    .run(id, name, description, now, req.userId);

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

  const membership = getWorkspaceMembership(req.params.id, req.userId);
  if (req.userRole !== "Admin" && (!membership || membership.role !== "Owner")) {
    return res.status(403).json({ error: "Only workspace Owner or platform Admin can delete" });
  }

  db.prepare("DELETE FROM workspaces WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
}));

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
router.patch("/:wsId/members/:userId", requireAuth, requireWorkspaceAdmin, route((req, res) => {
  const { role } = req.body;
  if (!role || !["Owner", "Admin", "Member"].includes(role)) {
    return res.status(400).json({ error: "role must be Owner, Admin, or Member" });
  }

  const membership = getWorkspaceMembership(req.params.wsId, req.params.userId);
  if (!membership) return res.status(404).json({ error: "User is not a member" });

  db.prepare("UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?")
    .run(role, req.params.wsId, req.params.userId);

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
  }

  const membership = getWorkspaceMembership(req.params.wsId, req.params.userId);
  if (!membership) return res.status(404).json({ error: "User is not a member" });

  db.prepare("DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?")
    .run(req.params.wsId, req.params.userId);

  logActivity(req.params.wsId, "A member was removed.");
  res.json({ ok: true });
}));

// ── Join Requests ──

// POST /:wsId/join-request — request to join a workspace
router.post("/:wsId/join-request", requireAuth, route((req, res) => {
  const ws = db.prepare("SELECT id FROM workspaces WHERE id = ?").get(req.params.wsId);
  if (!ws) return res.status(404).json({ error: "Workspace not found" });

  const existing = getWorkspaceMembership(req.params.wsId, req.userId);
  if (existing) return res.status(409).json({ error: "Already a member" });

  const existingReq = db.prepare(
    "SELECT id, status FROM workspace_join_requests WHERE workspace_id = ? AND user_id = ?"
  ).get(req.params.wsId, req.userId);
  if (existingReq && existingReq.status === "Pending") {
    return res.status(409).json({ error: "Request already pending" });
  }

  const id = uid("jr-");
  const now = new Date().toISOString();
  if (existingReq) {
    // Re-request after rejection
    db.prepare("UPDATE workspace_join_requests SET status = 'Pending', created_at = ? WHERE id = ?")
      .run(now, existingReq.id);
    return res.json({ id: existingReq.id, status: "Pending" });
  }

  db.prepare("INSERT INTO workspace_join_requests (id, workspace_id, user_id, status, created_at) VALUES (?, ?, ?, 'Pending', ?)")
    .run(id, req.params.wsId, req.userId, now);
  res.status(201).json({ id, status: "Pending" });
}));

// GET /:wsId/join-requests — list pending join requests (Owner/Admin only)
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

// PATCH /:wsId/join-requests/:requestId — approve or reject
router.patch("/:wsId/join-requests/:requestId", requireAuth, requireWorkspaceAdmin, route((req, res) => {
  const { status } = req.body;
  if (!status || !["Approved", "Rejected"].includes(status)) {
    return res.status(400).json({ error: "status must be Approved or Rejected" });
  }

  const request = db.prepare(
    "SELECT * FROM workspace_join_requests WHERE id = ? AND workspace_id = ?"
  ).get(req.params.requestId, req.params.wsId);
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (request.status !== "Pending") return res.status(400).json({ error: "Request already processed" });

  db.prepare("UPDATE workspace_join_requests SET status = ? WHERE id = ?").run(status, request.id);

  if (status === "Approved") {
    const now = new Date().toISOString();
    db.prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, 'Member', ?)")
      .run(uid("wm-"), req.params.wsId, request.user_id, now);
    logActivity(req.params.wsId, "A join request was approved.");
  }

  res.json({ ok: true, status });
}));

export default router;
