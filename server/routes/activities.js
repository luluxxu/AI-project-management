import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/workspaces/:wsId/activities — return recent activity log (newest first)
router.get("/:wsId/activities", requireAuth, (req, res) => {
  const owned = db.prepare("SELECT id FROM workspaces WHERE id = ? AND owner_id = ?")
    .get(req.params.wsId, req.userId);
  if (!owned) return res.status(403).json({ error: "Forbidden" });

  const activities = db.prepare(
    "SELECT * FROM activities WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 100"
  ).all(req.params.wsId);
  res.json(activities);
});

export default router;
