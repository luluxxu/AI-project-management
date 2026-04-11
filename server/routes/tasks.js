import { Router } from "express";
import db from "../db.js";
import { requireAuth, requireWorkspaceAccess, canAccessWorkspace } from "../middleware/auth.js";
import { route } from "../middleware/error.js";
import { validateTaskPayload } from "../middleware/validation.js";
import { logActivity, uid } from "../utils/workspace.js";
import { deleteTaskNotifications, syncTaskNotifications } from "../utils/notifications.js";

const router = Router();

const createTaskTx = db.transaction((workspaceId, taskInput) => {
  const id = uid("t-");
  db.prepare(
    "INSERT INTO tasks (id, workspace_id, project_id, title, description, status, priority, assignee_id, due_date, effort, planned_start, planned_end) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    workspaceId,
    taskInput.projectId,
    taskInput.title,
    taskInput.description,
    taskInput.status,
    taskInput.priority,
    taskInput.assigneeId,
    taskInput.dueDate,
    taskInput.effort,
    taskInput.plannedStart,
    taskInput.plannedEnd
  );

  syncTaskNotifications(id);
  logActivity(workspaceId, `Task '${taskInput.title}' created.`);

  return {
    id,
    workspaceId,
    ...taskInput,
  };
});

const updateTaskTx = db.transaction((taskId, workspaceId, updates, values) => {
  db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`).run(...values, taskId);
  syncTaskNotifications(taskId);
  logActivity(workspaceId, "Task updated.");
  return db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
});

const deleteTaskTx = db.transaction((taskId, workspaceId) => {
  db.prepare("DELETE FROM tasks WHERE id = ?").run(taskId);
  deleteTaskNotifications(taskId);
  logActivity(workspaceId, "Task deleted.");
});

router.get("/:wsId/tasks", requireAuth, requireWorkspaceAccess, route((req, res) => {
  const tasks = db.prepare("SELECT * FROM tasks WHERE workspace_id = ?").all(req.params.wsId);
  res.json(tasks);
}));

router.post("/:wsId/tasks", requireAuth, requireWorkspaceAccess, route((req, res) => {
  const {
    projectId,
    title,
    description = "",
    status = "Todo",
    priority = "Medium",
    assigneeId = "",
    dueDate = "",
    effort = 2,
    plannedStart = "",
    plannedEnd = "",
  } = validateTaskPayload(req.body);

  const created = createTaskTx(req.params.wsId, {
    projectId,
    title,
    description,
    status,
    priority,
    assigneeId,
    dueDate,
    effort,
    plannedStart,
    plannedEnd,
  });
  res.status(201).json(created);
}));

router.patch("/:id", requireAuth, route((req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });
  if (!canAccessWorkspace(task.workspace_id, req.userId, req.userRole)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const payload = validateTaskPayload(req.body, { partial: true });
  const colMap = {
    title: "title",
    description: "description",
    status: "status",
    priority: "priority",
    assigneeId: "assignee_id",
    dueDate: "due_date",
    effort: "effort",
    projectId: "project_id",
    plannedStart: "planned_start",
    plannedEnd: "planned_end",
  };
  const updates = [];
  const values = [];
  for (const [bodyKey, col] of Object.entries(colMap)) {
    if (payload[bodyKey] !== undefined) {
      updates.push(`${col} = ?`);
      values.push(payload[bodyKey]);
    }
  }

  const updated = updateTaskTx(req.params.id, task.workspace_id, updates, values);
  res.json(updated);
}));

router.delete("/:id", requireAuth, route((req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });
  if (!canAccessWorkspace(task.workspace_id, req.userId, req.userRole)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  deleteTaskTx(req.params.id, task.workspace_id);
  res.json({ ok: true });
}));

export default router;
