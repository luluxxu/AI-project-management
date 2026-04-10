<<<<<<< HEAD
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
=======
import OpenAI from "openai";

// Use Llama 3.3 70B via Groq's free API (OpenAI-compatible endpoint).
const MODEL = "llama-3.3-70b-versatile";
const MAX_TOKENS = 1024;

// Create a fresh OpenAI client pointed at Groq's API for each call.
// Using a per-call factory (instead of a module-level singleton) means
// key changes take effect immediately without a page reload.
function createClient(apiKey) {
  return new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1", // Groq's OpenAI-compatible endpoint
    dangerouslyAllowBrowser: true,             // required when calling from a browser
  });
}

// Strip markdown code fences (```json ... ```) that the model sometimes adds,
// then parse the cleaned string as JSON.
function safeParseJson(text) {
  const cleaned = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
  return JSON.parse(cleaned);
}

// ── 1. Task Extraction ──────────────────────────────────────────────────────
// Sends free-form text (e.g. meeting notes) to the AI.
// The model returns a JSON array of structured task objects.
// Falls back to the heuristic helper in AiAssistantPage if this throws.

export async function extractTasksWithClaude(text, apiKey) {
  const client = createClient(apiKey);

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      {
        role: "system",
        // Tell the model exactly what format to return — a bare JSON array, no prose.
        content: `You are a project management assistant. Parse free-form meeting notes or requirement text and extract a list of actionable tasks.

Return ONLY a JSON array. No markdown, no explanation, no code fences. Each element must have exactly these fields:
- title: string (short imperative phrase, max 60 chars)
- priority: one of "High" | "Medium" | "Low"
- effort: integer 1–8 (estimated hours)
- description: string (one sentence of context, may be empty string)

Rules:
- Extract up to 10 tasks. Skip filler text.
- Infer priority from urgency language (ASAP, critical, blocker = High; later, nice-to-have, backlog = Low; everything else = Medium).
- Infer effort from task type (research/plan = 2, design = 3, implement/build = 5, test/review = 3, document = 2).`,
      },
      { role: "user", content: text },
    ],
  });

  const raw = response.choices[0].message.content;
  const parsed = safeParseJson(raw);

  // Normalise each item: ensure valid priority/effort values before returning.
  return parsed.map((item, index) => ({
    id: `draft-${index + 1}`,
    title: item.title || "",
    priority: ["High", "Medium", "Low"].includes(item.priority) ? item.priority : "Medium",
    effort: Number.isInteger(item.effort) ? Math.min(8, Math.max(1, item.effort)) : 3,
    description: item.description || "",
  }));
}

// ── 2. Daily Plan Generation ────────────────────────────────────────────────
// Sends the current workspace's open tasks (plus project/member context) to the AI.
// The model returns a ranked list of up to 5 tasks to focus on today.

export async function generateDailyPlanWithClaude(tasks, projects, members, apiKey) {
  const client = createClient(apiKey);
  const today = new Date().toISOString().slice(0, 10);

  // Build a compact JSON payload — only include fields the model needs.
  const contextData = {
    today,
    members: members.map((m) => ({ id: m.id, name: m.name })),
    projects: projects.map((p) => ({ id: p.id, name: p.name, status: p.status, endDate: p.endDate })),
    tasks: tasks
      .filter((t) => t.status !== "Done") // exclude completed tasks
      .map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        effort: t.effort,
        projectId: t.projectId,
        assigneeId: t.assigneeId,
      })),
  };

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      {
        role: "system",
        content: `You are a project management assistant helping a team decide what to focus on today. You will receive workspace task data as JSON. Return ONLY a JSON array of up to 5 items representing the recommended daily plan, ordered by recommended priority.

Each item must have exactly:
- rank: integer starting at 1
- taskId: string (the id from the input)
- title: string
- reason: string (1–2 sentences explaining why this is prioritised today)

Prioritisation criteria (apply in order):
1. Overdue tasks (dueDate < today) — always surface these first
2. Tasks due within 3 days
3. High priority tasks that are In Progress
4. High priority Todo tasks
5. Blockers (tasks whose description mentions 'blocking' or 'blocked')

Do not include Done tasks. Return ONLY the JSON array.`,
      },
      { role: "user", content: JSON.stringify(contextData) },
    ],
  });

  const raw = response.choices[0].message.content;
  const parsed = safeParseJson(raw);

  // Pick only the fields the UI table needs.
  return parsed.map((item) => ({
    rank: item.rank,
    taskId: item.taskId,
    title: item.title,
    reason: item.reason,
  }));
}

// ── 3. Chat Assistant ───────────────────────────────────────────────────────
// Multi-turn chat with full workspace awareness.
// `messages` is the accumulated conversation history ([{ role, content }]).
// `workspaceContext` is the plain-text snapshot from buildWorkspaceContext().
//
// The model may optionally append an <action> XML block at the end of its reply
// to suggest a mutation (e.g. create a task). The UI parses this block and
// shows a confirmation card — the store is never written without user approval.

export async function chatWithClaude(messages, workspaceContext, apiKey) {
  const client = createClient(apiKey);
  const today = new Date().toISOString().slice(0, 10);

  // System prompt: inject workspace snapshot + explain the <action> convention.
  const systemPrompt = `You are TaskPilot AI, an intelligent project management assistant embedded in a workspace tool. You have read-only access to the current workspace data provided below. You can answer questions, summarise status, identify risks, and suggest actions.

If the user asks you to perform an action (create a task, reassign someone, mark something done), do NOT do it yourself. Instead, respond with a structured suggestion using this exact format at the END of your response:

<action>
{"type":"CREATE_TASK","payload":{"title":"...","priority":"High|Medium|Low","effort":3,"description":"...","projectId":"..."}}
</action>

or

<action>
{"type":"UPDATE_TASK_STATUS","payload":{"taskId":"...","title":"...","newStatus":"Todo|In Progress|Done"}}
</action>

If no action is needed, omit the <action> block entirely.

--- WORKSPACE SNAPSHOT ---
${workspaceContext}
--- END SNAPSHOT ---

Today's date: ${today}`;

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      { role: "system", content: systemPrompt },
      // Spread the conversation history so the model sees all previous turns.
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });

  const fullText = response.choices[0].message.content;

  // Try to extract an <action> block from the end of the response.
  const actionMatch = fullText.match(/<action>\s*([\s\S]*?)\s*<\/action>/);
  let action = null;
  if (actionMatch) {
    try {
      action = JSON.parse(actionMatch[1]);
    } catch {
      // Model produced a malformed action block — treat as no action.
    }
  }

  // Strip the <action> block from the visible chat text before returning.
  const text = fullText.replace(/<action>[\s\S]*?<\/action>/, "").trim();

  return { text, action };
}
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
