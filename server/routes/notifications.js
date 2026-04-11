import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { route } from "../middleware/error.js";

const router = Router();

router.get("/", requireAuth, route((req, res) => {
  const notifications = db.prepare(`
    SELECT
      n.*,
      t.title AS task_title,
      t.status AS task_status,
      t.due_date,
      p.name AS project_name,
      w.name AS workspace_name
    FROM notifications n
    JOIN tasks t ON t.id = n.task_id
    JOIN workspaces w ON w.id = n.workspace_id
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE n.user_id = ?
      AND date(n.trigger_date) <= date('now')
      AND t.status != 'Done'
      AND n.id = (
        SELECT n2.id
        FROM notifications n2
        WHERE n2.user_id = n.user_id
          AND n2.task_id = n.task_id
          AND date(n2.trigger_date) <= date('now')
        ORDER BY date(n2.trigger_date) DESC, n2.created_at DESC
        LIMIT 1
      )
    ORDER BY n.read_at IS NULL DESC, date(n.trigger_date) DESC, n.created_at DESC
  `).all(req.userId);

  res.json(notifications);
}));

router.patch("/:id/read", requireAuth, route((req, res) => {
  const notification = db.prepare(
    "SELECT id, user_id, read_at FROM notifications WHERE id = ?"
  ).get(req.params.id);
  if (!notification) return res.status(404).json({ error: "Notification not found" });
  if (notification.user_id !== req.userId) return res.status(403).json({ error: "Forbidden" });

  const readAt = notification.read_at || new Date().toISOString();
  db.prepare("UPDATE notifications SET read_at = ? WHERE id = ?").run(readAt, notification.id);

  res.json({ id: notification.id, readAt });
}));

export default router;
