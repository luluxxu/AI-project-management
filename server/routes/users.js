import { Router } from "express";
import db from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// GET /api/v1/users — list all users (admin only)
router.get("/", requireAuth, requireAdmin, (req, res) => {
  const users = db.prepare(
    "SELECT id, name, email, role, created_at FROM users ORDER BY created_at"
  ).all();
  res.json(users);
});

// PATCH /api/v1/users/:id — update user role (admin only)
router.patch("/:id", requireAuth, requireAdmin, (req, res) => {
  const { role } = req.body;
  if (!role || !["Admin", "Member"].includes(role)) {
    return res.status(400).json({ error: "role must be Admin or Member" });
  }

  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, req.params.id);
  const updated = db.prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?").get(req.params.id);
  res.json(updated);
});

// DELETE /api/v1/users/:id — delete a user (admin only, cannot delete self)
router.delete("/:id", requireAuth, requireAdmin, (req, res) => {
  if (req.params.id === req.userId) {
    return res.status(400).json({ error: "Cannot delete your own account" });
  }

  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
