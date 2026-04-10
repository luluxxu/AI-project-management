import { Router } from "express";
import db from "../db.js";
import { requireAuth, requireWorkspaceAccess } from "../middleware/auth.js";
import { route } from "../middleware/error.js";

const router = Router();

// GET /api/v1/members/:wsId/members
// Returns workspace_members joined with users (replaces old members table)
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

export default router;
