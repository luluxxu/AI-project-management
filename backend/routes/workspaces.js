import { Router } from "express";
import db from "../db.js";
import {
  requireAuth,
  requireWorkspaceAccess,
  requireWorkspaceAdmin,
  getWorkspaceMembership,
} from "../middleware/auth.js";
import { route } from "../middleware/error.js";
import {
  validateInvitationPayload,
  validateJoinRequestPayload,
  validateMemberRolePayload,
  validateWorkspacePayload,
} from "../middleware/validation.js";
import { logActivity, uid } from "../utils/workspace.js";
import { syncTaskNotifications } from "../utils/notifications.js";
import { parsePagination, paginatedResponse } from "../middleware/pagination.js";

const router = Router();

const createWorkspaceTx = db.transaction((name, description, isPublic, userId) => {
  const id = uid("ws-");
  const now = new Date().toISOString();

  db.prepare("INSERT INTO workspaces (id, name, description, created_at, owner_id, is_public) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, name, description, now, userId, isPublic);

  db.prepare("INSERT OR IGNORE INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, 'Owner', ?)")
    .run(uid("wm-"), id, userId, now);

  logActivity(id, `Workspace '${name}' created.`);

  return {
    id,
    name,
    description,
    isPublic,
    createdAt: now,
    ownerId: userId,
    my_role: "Owner",
    current_role: "Owner",
  };
});

const addWorkspaceMemberTx = db.transaction((workspaceId, user, role) => {
  const now = new Date().toISOString();
  const memberId = uid("wm-");

  db.prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)")
    .run(memberId, workspaceId, user.id, role, now);

  logActivity(workspaceId, `${user.name} was added as ${role}.`);

  return {
    id: memberId,
    workspaceId,
    userId: user.id,
    name: user.name,
    email: user.email,
    role,
    joinedAt: now,
  };
});

const updateWorkspaceMemberRoleTx = db.transaction((workspaceId, userId, role) => {
  db.prepare("UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?")
    .run(role, workspaceId, userId);

  logActivity(workspaceId, "Member role updated.");
  return listWorkspaceMembers(workspaceId).find((member) => member.user_id === userId);
});

const removeWorkspaceMemberTx = db.transaction((workspaceId, userId) => {
  db.prepare("DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?")
    .run(workspaceId, userId);

  logActivity(workspaceId, "A member was removed.");
});

const createInvitationTx = db.transaction((workspaceId, invitation, userName) => {
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

  logActivity(workspaceId, `Invitation sent to '${userName}'.`);
});

const setWorkspaceArchivedStateTx = db.transaction((workspace, archivedAt) => {
  db.prepare("UPDATE workspaces SET archived_at = ? WHERE id = ?").run(archivedAt, workspace.id);
  db.prepare("UPDATE projects SET archived_at = ? WHERE workspace_id = ?").run(archivedAt, workspace.id);
  db.prepare("UPDATE tasks SET archived_at = ? WHERE workspace_id = ?").run(archivedAt, workspace.id);

  if (archivedAt) {
    db.prepare("DELETE FROM notifications WHERE workspace_id = ?").run(workspace.id);
    logActivity(workspace.id, `Workspace '${workspace.name}' archived.`);
  } else {
    const tasks = db.prepare("SELECT id FROM tasks WHERE workspace_id = ?").all(workspace.id);
    for (const task of tasks) {
      syncTaskNotifications(task.id);
    }
    logActivity(workspace.id, `Workspace '${workspace.name}' restored.`);
  }
});

const respondToJoinRequestTx = db.transaction((workspaceId, request, status) => {
  db.prepare("UPDATE workspace_join_requests SET status = ? WHERE id = ?").run(status, request.id);

  if (status === "Approved") {
    const now = new Date().toISOString();
    db.prepare("INSERT OR IGNORE INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, 'Member', ?)")
      .run(uid("wm-"), workspaceId, request.user_id, now);
    logActivity(workspaceId, "A join request was approved.");
  }
});

const listWorkspaceMembers = (workspaceId) =>
  db.prepare(`
    SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, wm.joined_at, u.name, u.email
    FROM workspace_members wm
    JOIN users u ON u.id = wm.user_id
    WHERE wm.workspace_id = ?
    ORDER BY joined_at
  `).all(workspaceId);

router.get("/discover", requireAuth, route((req, res) => {
  const { paginate, page, limit, offset } = parsePagination(req.query);

  const baseWhere = `
    FROM workspaces w
    WHERE w.id NOT IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = ?
    )
      AND w.archived_at IS NULL
      AND w.is_public = 1
  `;

  if (!paginate) {
    const workspaces = db.prepare(`
      SELECT w.id, w.name, w.description,
        (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) AS member_count
      ${baseWhere}
      ORDER BY w.created_at DESC
    `).all(req.userId);
    return res.json(workspaces);
  }

  const total = db.prepare(`SELECT COUNT(*) AS count ${baseWhere}`).get(req.userId).count;

  const rows = db.prepare(`
    SELECT w.id, w.name, w.description,
      (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) AS member_count
    ${baseWhere}
    ORDER BY w.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.userId, limit, offset);

  paginatedResponse(res, { rows, total, page, limit });
}));

router.get("/", requireAuth, route((req, res) => {
  const includeArchived = req.query.includeArchived === "true";
  const workspaces = req.userRole === "Admin"
    ? db.prepare(`
        SELECT
          w.*,
          COALESCE(wm.role, 'Admin') AS my_role,
          COALESCE(wm.role, 'Admin') AS current_role
        FROM workspaces w
        LEFT JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = ?
        WHERE (? = 1 OR w.archived_at IS NULL)
        ORDER BY w.created_at
      `).all(req.userId, includeArchived ? 1 : 0)
    : db.prepare(`
        SELECT DISTINCT
          w.*,
          wm.role AS my_role,
          wm.role AS current_role
        FROM workspaces w
        JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = ?
        WHERE (? = 1 OR w.archived_at IS NULL)
        ORDER BY w.created_at
      `).all(req.userId, includeArchived ? 1 : 0);
  res.json(workspaces);
}));

router.post("/", requireAuth, route((req, res) => {
  const { name, description = "", isPublic = 0 } = validateWorkspacePayload(req.body);

  const workspace = createWorkspaceTx(name, description, isPublic, req.userId);
  res.status(201).json(workspace);
}));

router.patch("/:id", requireAuth, route((req, res) => {
  const workspace = db.prepare("SELECT id, owner_id FROM workspaces WHERE id = ?").get(req.params.id);
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });

  const membership = getWorkspaceMembership(req.params.id, req.userId);
  if (req.userRole !== "Admin" && (!membership || !["Owner", "Admin"].includes(membership.role))) {
    return res.status(403).json({ error: "Only workspace Owner or Admin can update" });
  }

  const payload = validateWorkspacePayload(req.body);
  db.prepare("UPDATE workspaces SET name = ?, description = ?, is_public = ? WHERE id = ?")
    .run(payload.name, payload.description, payload.isPublic, req.params.id);

  const updated = db.prepare("SELECT * FROM workspaces WHERE id = ?").get(req.params.id);
  res.json(updated);
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

router.post("/:id/archive", requireAuth, route((req, res) => {
  const workspace = db.prepare("SELECT id, owner_id, name, archived_at FROM workspaces WHERE id = ?").get(req.params.id);
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });

  const membership = getWorkspaceMembership(req.params.id, req.userId);
  if (req.userRole !== "Admin" && (!membership || membership.role !== "Owner")) {
    return res.status(403).json({ error: "Only workspace Owner or platform Admin can archive" });
  }
  if (workspace.archived_at) return res.status(400).json({ error: "Workspace is already archived" });

  const archivedAt = new Date().toISOString();
  setWorkspaceArchivedStateTx(workspace, archivedAt);
  res.json({ ok: true, archivedAt });
}));

router.post("/:id/restore", requireAuth, route((req, res) => {
  const workspace = db.prepare("SELECT id, owner_id, name, archived_at FROM workspaces WHERE id = ?").get(req.params.id);
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });

  const membership = getWorkspaceMembership(req.params.id, req.userId);
  if (req.userRole !== "Admin" && (!membership || membership.role !== "Owner")) {
    return res.status(403).json({ error: "Only workspace Owner or platform Admin can restore" });
  }
  if (!workspace.archived_at) return res.status(400).json({ error: "Workspace is not archived" });

  setWorkspaceArchivedStateTx(workspace, null);
  res.json({ ok: true });
}));

router.get("/:wsId/members", requireAuth, requireWorkspaceAccess, route((req, res) => {
  res.json(listWorkspaceMembers(req.params.wsId));
}));

router.post("/:wsId/members", requireAuth, requireWorkspaceAdmin, route((req, res) => {
  const { email: normalizedEmail, role = "Member" } = validateInvitationPayload(req.body);

  const user = db.prepare("SELECT id, name, email FROM users WHERE lower(email) = ?").get(normalizedEmail);
  if (!user) {
    return res.status(404).json({ error: "User not found. They need to register first." });
  }

  const existing = getWorkspaceMembership(req.params.wsId, user.id);
  if (existing) {
    return res.status(409).json({ error: "User is already a member of this workspace" });
  }

  const createdMember = addWorkspaceMemberTx(req.params.wsId, user, role);
  res.status(201).json(createdMember);
}));

router.patch("/:wsId/members/:userId", requireAuth, requireWorkspaceAdmin, route((req, res) => {
  const { role } = validateMemberRolePayload(req.body);

  const membership = getWorkspaceMembership(req.params.wsId, req.params.userId);
  if (!membership) return res.status(404).json({ error: "User is not a member" });

  const updated = updateWorkspaceMemberRoleTx(req.params.wsId, req.params.userId, role);
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

  removeWorkspaceMemberTx(req.params.wsId, req.params.userId);
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
  const { email: normalizedEmail, role = "Member" } = validateInvitationPayload(req.body);

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

  createInvitationTx(req.params.wsId, invitation, user.name);
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
  const { status } = validateJoinRequestPayload(req.body);

  const request = db.prepare(
    "SELECT * FROM workspace_join_requests WHERE id = ? AND workspace_id = ?"
  ).get(req.params.requestId, req.params.wsId);
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (request.status !== "Pending") return res.status(400).json({ error: "Request already processed" });

  respondToJoinRequestTx(req.params.wsId, request, status);

  res.json({ ok: true, status });
}));

export default router;
