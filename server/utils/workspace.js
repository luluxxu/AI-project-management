import { randomUUID } from "crypto";
import db from "../db.js";

export const uid = (prefix = "") => `${prefix}${randomUUID().slice(0, 8)}`;

export function logActivity(workspaceId, message) {
  db.prepare("INSERT INTO activities (id, workspace_id, message, created_at) VALUES (?, ?, ?, ?)")
    .run(uid("a-"), workspaceId, message, new Date().toISOString());
}

export function getWorkspaceMembership(workspaceId, userId) {
  return db.prepare(
    `SELECT m.id, m.workspace_id, m.user_id, m.role, w.owner_id
     FROM members m
     JOIN workspaces w ON w.id = m.workspace_id
     WHERE m.workspace_id = ? AND m.user_id = ?`
  ).get(workspaceId, userId);
}

export function ensureWorkspaceAccess(res, workspaceId, userId) {
  const membership = getWorkspaceMembership(workspaceId, userId);
  if (!membership) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return membership;
}

export function ensureWorkspaceOwner(res, workspaceId, userId) {
  const membership = ensureWorkspaceAccess(res, workspaceId, userId);
  if (!membership) return null;
  if (membership.role !== "Owner" && membership.owner_id !== userId) {
    res.status(403).json({ error: "Only the team owner can perform this action." });
    return null;
  }
  return membership;
}
