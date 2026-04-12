import jwt from "jsonwebtoken";
import db from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET || "taskpilot-dev-secret";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    req.userRole = payload.role || "Member";
    next();
  } catch {
    return res.status(401).json({ error: "Token expired or invalid" });
  }
}

export function requireAdmin(req, res, next) {
  if (req.userRole !== "Admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

export function getWorkspaceMembership(workspaceId, userId) {
  if (!workspaceId || !userId) return null;

  return db.prepare(
    "SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?"
  ).get(workspaceId, userId);
}

export function canAccessWorkspace(workspaceId, userId, platformRole) {
  if (platformRole === "Admin") return true;
  return !!getWorkspaceMembership(workspaceId, userId);
}

export function requireWorkspaceAccess(req, res, next) {
  const wsId = req.params.wsId || req.params.id;
  if (!wsId) return res.status(400).json({ error: "Workspace ID required" });

  if (req.userRole === "Admin") {
    req.workspaceRole = "Owner";
    return next();
  }

  const membership = getWorkspaceMembership(wsId, req.userId);
  if (!membership) {
    return res.status(403).json({ error: "Not a member of this workspace" });
  }

  req.workspaceRole = membership.role;
  next();
}

export function requireWorkspaceAdmin(req, res, next) {
  const wsId = req.params.wsId || req.params.id;
  if (!wsId) return res.status(400).json({ error: "Workspace ID required" });

  if (req.userRole === "Admin") {
    req.workspaceRole = "Owner";
    return next();
  }

  const membership = getWorkspaceMembership(wsId, req.userId);
  if (!membership || membership.role === "Member") {
    return res.status(403).json({ error: "Workspace admin access required" });
  }

  req.workspaceRole = membership.role;
  next();
}

export { JWT_SECRET };
