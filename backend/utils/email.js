import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  transporter = nodemailer.createTransport({
    host,
    port: Number(port) || 587,
    secure: Number(port) === 465,
    auth: { user, pass },
  });

  return transporter;
}

export function isEmailConfigured() {
  return !!getTransporter();
}

export async function sendEmail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) return null;

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  return t.sendMail({ from, to, subject, text, html });
}

export function buildReminderEmail(notification) {
  const subject = `TaskPilot: ${notification.message}`;
  const text = [
    notification.message,
    "",
    `Workspace: ${notification.workspace_name || ""}`,
    notification.project_name ? `Project: ${notification.project_name}` : "",
    `Task: ${notification.task_title || ""}`,
    notification.due_date ? `Due: ${notification.due_date}` : "",
    "",
    "Log in to TaskPilot to view details.",
  ].filter(Boolean).join("\n");

  const html = `
    <div style="font-family: sans-serif; max-width: 480px;">
      <h2 style="color: #1B0C0C; margin-bottom: 4px;">${notification.message}</h2>
      <table style="margin: 16px 0; font-size: 14px; color: #444;">
        ${notification.workspace_name ? `<tr><td style="padding: 4px 12px 4px 0; color: #888;">Workspace</td><td>${notification.workspace_name}</td></tr>` : ""}
        ${notification.project_name ? `<tr><td style="padding: 4px 12px 4px 0; color: #888;">Project</td><td>${notification.project_name}</td></tr>` : ""}
        <tr><td style="padding: 4px 12px 4px 0; color: #888;">Task</td><td>${notification.task_title || ""}</td></tr>
        ${notification.due_date ? `<tr><td style="padding: 4px 12px 4px 0; color: #888;">Due</td><td>${notification.due_date}</td></tr>` : ""}
      </table>
      <p style="font-size: 13px; color: #888;">Log in to TaskPilot to view details.</p>
    </div>
  `;

  return { subject, text, html };
}
