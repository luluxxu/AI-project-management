import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { route } from "../middleware/error.js";
import { ensureOwnedWorkspace } from "../utils/workspace.js";

const router = Router();

// GET /api/workspaces/:wsId/activities — return recent activity log (newest first)
router.get("/:wsId/activities", requireAuth, route((req, res) => {
  if (!ensureOwnedWorkspace(res, req.params.wsId, req.userId)) return;

  const activities = db.prepare(
    "SELECT * FROM activities WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 100"
  ).all(req.params.wsId);
  res.json(activities);
}));

export default router;
