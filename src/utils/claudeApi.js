// AI service calls — proxied through our own backend so the API key
// never leaves the server. Falls back to heuristic helpers when the
// server returns 503 (no GROQ_API_KEY configured).

import { apiFetch } from "./api";

export async function extractTasksWithAi(text, provider = "auto", sourceType = "notes") {
  const result = await apiFetch("/ai/extract-tasks", {
    method: "POST",
    body: JSON.stringify({ text, provider, sourceType }),
  });
  return result.tasks || [];
}

export async function generateDailyPlanWithAi(payload) {
  const plan = await apiFetch("/ai/daily-plan", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return plan;
}

export async function chatWithAi(messages, workspaceContext, provider = "auto") {
  const result = await apiFetch("/ai/chat", {
    method: "POST",
    body: JSON.stringify({ messages, workspaceContext, provider }),
  });
  return result;
}

export async function checkAiStatus() {
  return apiFetch("/ai/status");
}

export async function generateCourseSchedule(payload) {
  return apiFetch("/ai/course-schedule", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Backward-compatible aliases
export const extractTasksWithClaude = extractTasksWithAi;
export const generateDailyPlanWithClaude = generateDailyPlanWithAi;
export const chatWithClaude = chatWithAi;
