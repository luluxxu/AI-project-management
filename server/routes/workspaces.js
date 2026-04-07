import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { route } from "../middleware/error.js";
import { logActivity, uid } from "../utils/workspace.js";

const router = Router();

// GET /api/workspaces — list all workspaces owned by the current user
router.get("/", requireAuth, route((req, res) => {
  const workspaces = db.prepare("SELECT * FROM workspaces WHERE owner_id = ? ORDER BY created_at").all(req.userId);
  res.json(workspaces);
}));

// POST /api/workspaces — create a new workspace
router.post("/", requireAuth, route((req, res) => {
  const { name, description = "" } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const id = uid("ws-");
  const createdAt = new Date().toISOString();
  db.prepare("INSERT INTO workspaces (id, name, description, created_at, owner_id) VALUES (?, ?, ?, ?, ?)")
    .run(id, name, description, createdAt, req.userId);

  logActivity(id, `Workspace '${name}' created.`);
  res.status(201).json({ id, name, description, createdAt, ownerId: req.userId });
}));

export default router;
