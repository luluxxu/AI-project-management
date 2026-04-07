import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { route } from "../middleware/error.js";
import { ensureWorkspaceOwner, logActivity, uid } from "../utils/workspace.js";

const router = Router();

// GET /api/workspaces — list all teams/workspaces the current user belongs to
router.get("/", requireAuth, route((req, res) => {
  const workspaces = db.prepare(`
    SELECT w.*, m.role AS current_role
    FROM workspaces w
    JOIN members m ON m.workspace_id = w.id
    WHERE m.user_id = ?
    ORDER BY w.created_at
  `).all(req.userId);
  res.json(workspaces);
}));

// POST /api/workspaces — create a new workspace
router.post("/", requireAuth, route((req, res) => {
  const { name, description = "" } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const id = uid("ws-");
  const createdAt = new Date().toISOString();
  db.prepare("INSERT INTO workspaces (id, name, description, created_at, owner_id) VALUES (?, ?, ?, ?, ?)")
    .run(id, name, description, createdAt, req.userId);
  const owner = db.prepare("SELECT name, email FROM users WHERE id = ?").get(req.userId);
  db.prepare("INSERT INTO members (id, workspace_id, user_id, name, role, email) VALUES (?, ?, ?, ?, ?, ?)")
    .run(uid("m-"), id, req.userId, owner.name, "Owner", owner.email);

  logActivity(id, `Workspace '${name}' created.`);
  res.status(201).json({ id, name, description, createdAt, ownerId: req.userId, currentRole: "Owner" });
}));

// GET /api/workspaces/:wsId/invitations — list pending invitations sent for a team
router.get("/:wsId/invitations", requireAuth, route((req, res) => {
  if (!ensureWorkspaceOwner(res, req.params.wsId, req.userId)) return;

  const invitations = db.prepare(`
    SELECT id, workspace_id, invited_user_id, invited_email, invited_name, role, status, invited_by_id, created_at, responded_at
    FROM invitations
    WHERE workspace_id = ?
    ORDER BY created_at DESC
  `).all(req.params.wsId);
  res.json(invitations);
}));

// POST /api/workspaces/:wsId/invitations — invite a registered user to the team
router.post("/:wsId/invitations", requireAuth, route((req, res) => {
  if (!ensureWorkspaceOwner(res, req.params.wsId, req.userId)) return;

  const { email = "", role = "Member" } = req.body;
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return res.status(400).json({ error: "email is required" });

  const user = db.prepare("SELECT id, name, email FROM users WHERE lower(email) = ?").get(normalizedEmail);
  if (!user) {
    return res.status(400).json({ error: "That email is not registered yet. Ask them to sign up first." });
  }

  const existingMember = db.prepare(
    "SELECT id FROM members WHERE workspace_id = ? AND user_id = ?"
  ).get(req.params.wsId, user.id);
  if (existingMember) {
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

export default router;
