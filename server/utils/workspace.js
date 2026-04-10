import { randomUUID } from "crypto";
import db from "../db.js";

export const uid = (prefix = "") => `${prefix}${randomUUID().slice(0, 8)}`;

export function logActivity(workspaceId, message) {
  db.prepare("INSERT INTO activities (id, workspace_id, message, created_at) VALUES (?, ?, ?, ?)")
    .run(uid("a-"), workspaceId, message, new Date().toISOString());
}

export function getOwnedWorkspace(workspaceId, userId) {
  return db.prepare("SELECT id FROM workspaces WHERE id = ? AND owner_id = ?").get(workspaceId, userId);
}

export function ensureOwnedWorkspace(res, workspaceId, userId) {
  const workspace = getOwnedWorkspace(workspaceId, userId);
  if (!workspace) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return workspace;
}
