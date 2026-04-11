import db from "../db.js";
import { uid } from "./workspace.js";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const REMINDERS = [
  { type: "due_3_days", daysBefore: 3, label: "due in 3 days" },
  { type: "due_1_day", daysBefore: 1, label: "due tomorrow" },
  { type: "due_today", daysBefore: 0, label: "due today" },
];

function formatDateOnly(value) {
  return value.toISOString().slice(0, 10);
}

function parseDateOnly(value) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolveAssigneeUserId(task) {
  if (!task?.assignee_id) return "";

  const directUser = db.prepare("SELECT id FROM users WHERE id = ?").get(task.assignee_id);
  if (directUser) return directUser.id;

  const workspaceMember = db.prepare(
    "SELECT user_id FROM workspace_members WHERE id = ? AND workspace_id = ?"
  ).get(task.assignee_id, task.workspace_id);
  if (workspaceMember?.user_id) return workspaceMember.user_id;

  const legacyMember = db.prepare(
    "SELECT user_id FROM members WHERE id = ? AND workspace_id = ?"
  ).get(task.assignee_id, task.workspace_id);
  return legacyMember?.user_id || "";
}

function buildReminderRows(task) {
  const dueDate = parseDateOnly(task.due_date);
  if (!dueDate) return [];

  const userId = resolveAssigneeUserId(task);
  if (!userId || task.status === "Done") return [];

  return REMINDERS.map((reminder) => {
    const triggerDate = new Date(dueDate.getTime() - reminder.daysBefore * DAY_IN_MS);
    return {
      id: uid("notif-"),
      userId,
      workspaceId: task.workspace_id,
      taskId: task.id,
      type: reminder.type,
      message: `Task '${task.title}' is ${reminder.label}.`,
      triggerDate: formatDateOnly(triggerDate),
      createdAt: new Date().toISOString(),
    };
  });
}

export function syncTaskNotifications(taskId) {
  const task = typeof taskId === "string"
    ? db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId)
    : taskId;
  if (!task) return;

  db.prepare("DELETE FROM notifications WHERE task_id = ?").run(task.id);

  const reminders = buildReminderRows(task);
  const insertNotification = db.prepare(`
    INSERT OR IGNORE INTO notifications (id, user_id, workspace_id, task_id, type, message, trigger_date, created_at, read_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
  `);

  for (const reminder of reminders) {
    insertNotification.run(
      reminder.id,
      reminder.userId,
      reminder.workspaceId,
      reminder.taskId,
      reminder.type,
      reminder.message,
      reminder.triggerDate,
      reminder.createdAt
    );
  }
}

export function deleteTaskNotifications(taskId) {
  db.prepare("DELETE FROM notifications WHERE task_id = ?").run(taskId);
}

export function syncAllTaskNotifications() {
  const tasks = db.prepare("SELECT id FROM tasks").all();
  for (const task of tasks) {
    syncTaskNotifications(task.id);
  }
}
