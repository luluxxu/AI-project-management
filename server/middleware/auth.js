import jwt from "jsonwebtoken";
<<<<<<< HEAD
import db from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET || "taskpilot-dev-secret";

=======

const JWT_SECRET = process.env.JWT_SECRET || "taskpilot-dev-secret";

// Middleware that protects routes requiring a logged-in user.
// Reads the JWT from the Authorization header, verifies it, and
// attaches req.userId so downstream route handlers know who is calling.
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }

<<<<<<< HEAD
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    req.userRole = payload.role || "Member";
=======
  const token = header.slice(7); // strip "Bearer " prefix
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
    next();
  } catch {
    return res.status(401).json({ error: "Token expired or invalid" });
  }
}

<<<<<<< HEAD
export function requireAdmin(req, res, next) {
  if (req.userRole !== "Admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

export function getWorkspaceMembership(workspaceId, userId) {
  if (!workspaceId || !userId) return null;

  const workspaceMember = db.prepare(
    "SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?"
  ).get(workspaceId, userId);
  if (workspaceMember) return workspaceMember;

  return (
    db.prepare("SELECT role FROM members WHERE workspace_id = ? AND user_id = ?").get(workspaceId, userId) ||
    null
  );
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
=======
export { JWT_SECRET };
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
