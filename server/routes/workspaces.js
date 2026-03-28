import { Router } from "express";
import { randomUUID } from "crypto";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const uid = () => randomUUID().slice(0, 8);

const logActivity = (workspaceId, message) => {
  db.prepare("INSERT INTO activities (id, workspace_id, message, created_at) VALUES (?, ?, ?, ?)")
    .run(`a-${uid()}`, workspaceId, message, new Date().toISOString());
};

// GET /api/workspaces — list all workspaces owned by the current user
router.get("/", requireAuth, (req, res) => {
  const workspaces = db.prepare("SELECT * FROM workspaces WHERE owner_id = ? ORDER BY created_at").all(req.userId);
  res.json(workspaces);
});

// POST /api/workspaces — create a new workspace
router.post("/", requireAuth, (req, res) => {
  const { name, description = "" } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const id = `ws-${uid()}`;
  const createdAt = new Date().toISOString();
  db.prepare("INSERT INTO workspaces (id, name, description, created_at, owner_id) VALUES (?, ?, ?, ?, ?)")
    .run(id, name, description, createdAt, req.userId);

  logActivity(id, `Workspace '${name}' created.`);
  res.status(201).json({ id, name, description, createdAt, ownerId: req.userId });
});

export default router;
