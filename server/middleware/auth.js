import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "taskpilot-dev-secret";

// Middleware that protects routes requiring a logged-in user.
// Reads the JWT from the Authorization header, verifies it, and
// attaches req.userId so downstream route handlers know who is calling.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }

  const token = header.slice(7); // strip "Bearer " prefix
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Token expired or invalid" });
  }
}

export { JWT_SECRET };