import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
<<<<<<< HEAD
import db, { ADMIN_EMAIL } from "../db.js";
=======
import db from "../db.js";
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
import { requireAuth, JWT_SECRET } from "../middleware/auth.js";
import { route } from "../middleware/error.js";

const router = Router();
<<<<<<< HEAD
const uid = () => randomUUID().slice(0, 8);

=======

// POST /api/auth/register — create a new account and return a JWT
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
router.post("/register", route((req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email and password are required" });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return res.status(409).json({ error: "Email already in use" });
  }

<<<<<<< HEAD
  const id = `u-${uid()}`;
  const role = email === ADMIN_EMAIL ? "Admin" : "Member";
=======
  const id = `u-${randomUUID().slice(0, 8)}`;
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
  const passwordHash = bcrypt.hashSync(password, 10);
  const createdAt = new Date().toISOString();

  db.prepare(
<<<<<<< HEAD
    "INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, email, passwordHash, name, role, createdAt);

  const token = jwt.sign({ userId: id, email, role }, JWT_SECRET, { expiresIn: "7d" });
  res.status(201).json({ token, user: { id, name, email, role } });
}));

=======
    "INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, email, passwordHash, name, createdAt);

  const token = jwt.sign({ userId: id, email }, JWT_SECRET, { expiresIn: "7d" });
  res.status(201).json({ token, user: { id, name, email } });
}));

// POST /api/auth/login — verify credentials and return a JWT
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
router.post("/login", route((req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

<<<<<<< HEAD
  const token = jwt.sign({ userId: user.id, email, role: user.role || "Member" }, JWT_SECRET, { expiresIn: "7d" });
  res.json({
    token,
    user: { id: user.id, name: user.name, email, role: user.role || "Member" },
  });
}));

router.get("/me", requireAuth, route((req, res) => {
  const user = db.prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?").get(req.userId);
=======
  const token = jwt.sign({ userId: user.id, email }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, name: user.name, email } });
}));

// GET /api/auth/me — return current user info (requires valid token)
router.get("/me", requireAuth, route((req, res) => {
  const user = db.prepare("SELECT id, name, email, created_at FROM users WHERE id = ?").get(req.userId);
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
}));

export default router;
