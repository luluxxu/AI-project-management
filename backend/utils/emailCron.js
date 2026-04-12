import cron from "node-cron";
import db from "../db.js";
import { isEmailConfigured, sendEmail, buildReminderEmail } from "./email.js";

function sendPendingEmails() {
  if (!isEmailConfigured()) return;

  const today = new Date().toISOString().slice(0, 10);

  const notifications = db.prepare(`
    SELECT
      n.id, n.message, n.type, n.trigger_date,
      u.email AS user_email,
      t.title AS task_title, t.due_date, t.status AS task_status,
      p.name AS project_name,
      w.name AS workspace_name
    FROM notifications n
    JOIN users u ON u.id = n.user_id
    JOIN tasks t ON t.id = n.task_id
    JOIN workspaces w ON w.id = n.workspace_id
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE date(n.trigger_date) <= date(?)
      AND n.emailed_at IS NULL
      AND t.status != 'Done'
      AND t.archived_at IS NULL
      AND w.archived_at IS NULL
  `).all(today);

  const markEmailed = db.prepare(
    "UPDATE notifications SET emailed_at = ? WHERE id = ?"
  );

  for (const n of notifications) {
    const { subject, text, html } = buildReminderEmail(n);
    sendEmail({ to: n.user_email, subject, text, html })
      .then(() => {
        markEmailed.run(new Date().toISOString(), n.id);
      })
      .catch((err) => {
        console.error(`Failed to email notification ${n.id} to ${n.user_email}:`, err.message);
      });
  }

  if (notifications.length > 0) {
    console.log(`Email cron: sent ${notifications.length} reminder(s)`);
  }
}

export function startEmailCron() {
  if (!isEmailConfigured()) {
    console.log("Email notifications disabled (SMTP not configured)");
    return;
  }

  // Run every day at 8:00 AM
  cron.schedule("0 8 * * *", sendPendingEmails);

  // Also run once on startup to catch any missed emails
  sendPendingEmails();

  console.log("Email notification cron started (daily at 8:00 AM)");
}
