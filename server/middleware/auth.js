import jwt from "jsonwebtoken";
import db from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET || "taskpilot-dev-secret";

<<<<<<< HEAD
// Middleware that protects routes requiring a logged-in user.
=======
>>>>>>> 15f72fd4 (update members.js)
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

<<<<<<< HEAD
// Middleware that requires the user to be a platform Admin.
=======
>>>>>>> 15f72fd4 (update members.js)
export function requireAdmin(req, res, next) {
  if (req.userRole !== "Admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

<<<<<<< HEAD
// ── Workspace-level access helpers ──

// Returns membership row { role } or undefined
export function getWorkspaceMembership(workspaceId, userId) {
  return db.prepare(
    "SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?"
  ).get(workspaceId, userId);
}

// Returns true if user can access the workspace (is a member or platform admin)
=======
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

>>>>>>> 15f72fd4 (update members.js)
export function canAccessWorkspace(workspaceId, userId, platformRole) {
  if (platformRole === "Admin") return true;
  return !!getWorkspaceMembership(workspaceId, userId);
}

<<<<<<< HEAD
// Middleware: require workspace membership. Reads workspace ID from req.params.wsId or req.params.id.
// Attaches req.workspaceRole (Owner/Admin/Member) for downstream use.
=======
>>>>>>> 15f72fd4 (update members.js)
export function requireWorkspaceAccess(req, res, next) {
  const wsId = req.params.wsId || req.params.id;
  if (!wsId) return res.status(400).json({ error: "Workspace ID required" });

  if (req.userRole === "Admin") {
<<<<<<< HEAD
    req.workspaceRole = "Owner"; // platform admins get full access
    return next();
  }
  const membership = getWorkspaceMembership(wsId, req.userId);
  if (!membership) return res.status(403).json({ error: "Not a member of this workspace" });
=======
    req.workspaceRole = "Owner";
    return next();
  }

  const membership = getWorkspaceMembership(wsId, req.userId);
  if (!membership) {
    return res.status(403).json({ error: "Not a member of this workspace" });
  }

>>>>>>> 15f72fd4 (update members.js)
  req.workspaceRole = membership.role;
  next();
}

<<<<<<< HEAD
// Middleware: require workspace Owner or Admin role (or platform Admin).
=======
>>>>>>> 15f72fd4 (update members.js)
export function requireWorkspaceAdmin(req, res, next) {
  const wsId = req.params.wsId || req.params.id;
  if (!wsId) return res.status(400).json({ error: "Workspace ID required" });

  if (req.userRole === "Admin") {
    req.workspaceRole = "Owner";
    return next();
  }
<<<<<<< HEAD
=======

>>>>>>> 15f72fd4 (update members.js)
  const membership = getWorkspaceMembership(wsId, req.userId);
  if (!membership || membership.role === "Member") {
    return res.status(403).json({ error: "Workspace admin access required" });
  }
<<<<<<< HEAD
=======

>>>>>>> 15f72fd4 (update members.js)
  req.workspaceRole = membership.role;
  next();
}

<<<<<<< HEAD
export { JWT_SECRET };
=======
export { JWT_SECRET };
>>>>>>> 15f72fd4 (update members.js)
