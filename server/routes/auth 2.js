import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import db from "../db.js";
import { requireAuth, JWT_SECRET } from "../middleware/auth.js";

const router = Router();

// POST /api/auth/register — create a new account and return a JWT
router.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email and password are required" });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return res.status(409).json({ error: "Email already in use" });
  }

  const id = `u-${randomUUID().slice(0, 8)}`;
  const passwordHash = bcrypt.hashSync(password, 10);
  const createdAt = new Date().toISOString();

  db.prepare(
    "INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, email, passwordHash, name, createdAt);

  const token = jwt.sign({ userId: id, email }, JWT_SECRET, { expiresIn: "7d" });
  res.status(201).json({ token, user: { id, name, email } });
});

// POST /api/auth/login — verify credentials and return a JWT
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = jwt.sign({ userId: user.id, email }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, name: user.name, email } });
});

// GET /api/auth/me — return current user info (requires valid token)
router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT id, name, email, created_at FROM users WHERE id = ?").get(req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

export default router;
