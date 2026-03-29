import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes       from "./routes/auth.js";
import workspaceRoutes  from "./routes/workspaces.js";
import projectRoutes    from "./routes/projects.js";
import taskRoutes       from "./routes/tasks.js";
import memberRoutes     from "./routes/members.js";
import activityRoutes   from "./routes/activities.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Mount all route groups under /api
app.use("/api/auth",       authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/projects",   projectRoutes);
app.use("/api/tasks",      taskRoutes);
app.use("/api/members",    memberRoutes);
app.use("/api/activities", activityRoutes);

// Simple health check
app.get("/api/health", (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`TaskPilot API running on http://localhost:${PORT}`);
});