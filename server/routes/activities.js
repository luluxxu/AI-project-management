import { Router } from "express";
import db from "../db.js";
import { requireAuth, requireWorkspaceAccess } from "../middleware/auth.js";
import { route } from "../middleware/error.js";

const router = Router();

router.get("/:wsId/activities", requireAuth, requireWorkspaceAccess, route((req, res) => {
  const activities = db.prepare(
    "SELECT * FROM activities WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 100"
  ).all(req.params.wsId);
  res.json(activities);
}));

export default router;
