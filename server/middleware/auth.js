import jwt from "jsonwebtoken";
import db from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET || "taskpilot-dev-secret";

// Middleware that protects routes requiring a logged-in user.
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

// Middleware that requires the user to be a platform Admin.
export function requireAdmin(req, res, next) {
  if (req.userRole !== "Admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

// ── Workspace-level access helpers ──

// Returns membership row { role } or undefined
export function getWorkspaceMembership(workspaceId, userId) {
  return db.prepare(
    "SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?"
  ).get(workspaceId, userId);
}

// Returns true if user can access the workspace (is a member or platform admin)
export function canAccessWorkspace(workspaceId, userId, platformRole) {
  if (platformRole === "Admin") return true;
  return !!getWorkspaceMembership(workspaceId, userId);
}

// Middleware: require workspace membership. Reads workspace ID from req.params.wsId or req.params.id.
// Attaches req.workspaceRole (Owner/Admin/Member) for downstream use.
export function requireWorkspaceAccess(req, res, next) {
  const wsId = req.params.wsId || req.params.id;
  if (!wsId) return res.status(400).json({ error: "Workspace ID required" });

  if (req.userRole === "Admin") {
    req.workspaceRole = "Owner"; // platform admins get full access
    return next();
  }
  const membership = getWorkspaceMembership(wsId, req.userId);
  if (!membership) return res.status(403).json({ error: "Not a member of this workspace" });
  req.workspaceRole = membership.role;
  next();
}

// Middleware: require workspace Owner or Admin role (or platform Admin).
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