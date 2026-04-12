import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes       from "./routes/auth.js";
import workspaceRoutes  from "./routes/workspaces.js";
import projectRoutes    from "./routes/projects.js";
import taskRoutes       from "./routes/tasks.js";
import memberRoutes     from "./routes/members.js";
import activityRoutes   from "./routes/activities.js";
import invitationRoutes from "./routes/invitations.js";
import notificationRoutes from "./routes/notifications.js";
import userRoutes       from "./routes/users.js";
import aiRoutes         from "./routes/ai.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { syncAllTaskNotifications } from "./utils/notifications.js";
import { startEmailCron } from "./utils/emailCron.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Mount all route groups under /api/v1
app.use("/api/v1/auth",       authRoutes);
app.use("/api/v1/workspaces", workspaceRoutes);
app.use("/api/v1/projects",   projectRoutes);
app.use("/api/v1/tasks",      taskRoutes);
app.use("/api/v1/members",    memberRoutes);
app.use("/api/v1/activities", activityRoutes);
app.use("/api/v1/invitations", invitationRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/users",      userRoutes);
app.use("/api/v1/ai",         aiRoutes);

app.get("/", (_, res) => {
  res.json({
    ok: true,
    message: "TaskPilot API is running.",
    health: "/api/health",
  });
});

// Simple health check
app.get("/api/v1/health", (_, res) => res.json({ ok: true }));

syncAllTaskNotifications();

app.use(notFoundHandler);
app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`TaskPilot API running on http://localhost:${PORT}`);
    startEmailCron();
  });
}

export default app;
