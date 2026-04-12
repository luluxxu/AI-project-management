import { Router } from "express";
import db from "../db.js";
import { requireAuth, requireWorkspaceAccess } from "../middleware/auth.js";
import { route } from "../middleware/error.js";
import { parsePagination, paginatedResponse } from "../middleware/pagination.js";

const router = Router();

router.get("/:wsId/activities", requireAuth, requireWorkspaceAccess, route((req, res) => {
  const { paginate, page, limit, offset } = parsePagination(req.query, { defaultLimit: 50 });

  if (!paginate) {
    const activities = db.prepare(
      "SELECT * FROM activities WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 100"
    ).all(req.params.wsId);
    return res.json(activities);
  }

  const total = db.prepare(
    "SELECT COUNT(*) AS count FROM activities WHERE workspace_id = ?"
  ).get(req.params.wsId).count;

  const rows = db.prepare(
    "SELECT * FROM activities WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
  ).all(req.params.wsId, limit, offset);

  paginatedResponse(res, { rows, total, page, limit });
}));

export default router;
