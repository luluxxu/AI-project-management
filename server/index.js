import express from "express";
import cors from "cors";
import dotenv from "dotenv";

<<<<<<< HEAD
import authRoutes from "./routes/auth.js";
import workspaceRoutes from "./routes/workspaces.js";
import projectRoutes from "./routes/projects.js";
import taskRoutes from "./routes/tasks.js";
import memberRoutes from "./routes/members.js";
import activityRoutes from "./routes/activities.js";
import invitationRoutes from "./routes/invitations.js";
import userRoutes from "./routes/users.js";
import aiRoutes from "./routes/ai.js";
=======
import authRoutes       from "./routes/auth.js";
import workspaceRoutes  from "./routes/workspaces.js";
import projectRoutes    from "./routes/projects.js";
import taskRoutes       from "./routes/tasks.js";
import memberRoutes     from "./routes/members.js";
import activityRoutes   from "./routes/activities.js";
import invitationRoutes from "./routes/invitations.js";
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
import { errorHandler, notFoundHandler } from "./middleware/error.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

<<<<<<< HEAD
for (const basePath of ["/api", "/api/v1"]) {
  app.use(`${basePath}/auth`, authRoutes);
  app.use(`${basePath}/workspaces`, workspaceRoutes);
  app.use(`${basePath}/projects`, projectRoutes);
  app.use(`${basePath}/tasks`, taskRoutes);
  app.use(`${basePath}/members`, memberRoutes);
  app.use(`${basePath}/activities`, activityRoutes);
  app.use(`${basePath}/invitations`, invitationRoutes);
  app.use(`${basePath}/users`, userRoutes);
  app.use(`${basePath}/ai`, aiRoutes);
  app.get(`${basePath}/health`, (_, res) => res.json({ ok: true }));
}
=======
// Mount all route groups under /api
app.use("/api/auth",       authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/projects",   projectRoutes);
app.use("/api/tasks",      taskRoutes);
app.use("/api/members",    memberRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/invitations", invitationRoutes);

app.get("/", (_, res) => {
  res.json({
    ok: true,
    message: "TaskPilot API is running.",
    health: "/api/health",
  });
});
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66

app.get("/", (_, res) => {
  res.json({
    ok: true,
    message: "TaskPilot API is running.",
    health: "/api/health",
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`TaskPilot API running on http://localhost:${PORT}`);
});
