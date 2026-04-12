import { randomUUID } from "crypto";
import db from "../db.js";

export const uid = (prefix = "") => `${prefix}${randomUUID().slice(0, 8)}`;

export function logActivity(workspaceId, message) {
  db.prepare("INSERT INTO activities (id, workspace_id, message, created_at) VALUES (?, ?, ?, ?)")
    .run(uid("a-"), workspaceId, message, new Date().toISOString());
}

