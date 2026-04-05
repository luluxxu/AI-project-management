// AI service calls — proxied through our own backend so the API key
// never leaves the server. Falls back to heuristic helpers when the
// server returns 503 (no GROQ_API_KEY configured).

import { apiFetch } from "./api";

// ── 1. Task Extraction ──────────────────────────────────────────────────────
// Sends free-form text (e.g. meeting notes) to the backend AI endpoint.
// Returns a JSON array of structured task draft objects.

export async function extractTasksWithClaude(text) {
  const tasks = await apiFetch("/ai/extract-tasks", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
  return tasks;
}

// ── 2. Daily Plan Generation ────────────────────────────────────────────────
// Sends the current workspace's open tasks (plus project/member context).
// Returns a ranked list of up to 5 tasks to focus on today.

export async function generateDailyPlanWithClaude(tasks, projects, members) {
  const plan = await apiFetch("/ai/daily-plan", {
    method: "POST",
    body: JSON.stringify({ tasks, projects, members }),
  });
  return plan;
}

// ── 3. Chat Assistant ───────────────────────────────────────────────────────
// Multi-turn chat with full workspace awareness.
// Returns { text, action } where action is an optional mutation suggestion.

export async function chatWithClaude(messages, workspaceContext) {
  const result = await apiFetch("/ai/chat", {
    method: "POST",
    body: JSON.stringify({ messages, workspaceContext }),
  });
  return result;
}

// ── 4. Status check ─────────────────────────────────────────────────────────
// Returns whether the server has an AI key configured.

export async function checkAiStatus() {
  const { configured } = await apiFetch("/ai/status");
  return configured;
}
