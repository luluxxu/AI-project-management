import { Router } from "express";
import OpenAI from "openai";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const MODEL = "llama-3.3-70b-versatile";
const MAX_TOKENS = 1024;

function getClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
}

function safeParseJson(text) {
  const cleaned = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
  return JSON.parse(cleaned);
}

// GET /api/v1/ai/status — check if server has an AI key configured
router.get("/status", requireAuth, (_req, res) => {
  res.json({ configured: !!process.env.GROQ_API_KEY });
});

// POST /api/v1/ai/extract-tasks
router.post("/extract-tasks", requireAuth, async (req, res) => {
  const client = getClient();
  if (!client) return res.status(503).json({ error: "AI service not configured. Set GROQ_API_KEY in server .env" });

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "text is required" });

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: "system",
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

    const tasks = parsed.map((item, index) => ({
      id: `draft-${index + 1}`,
      title: item.title || "",
      priority: ["High", "Medium", "Low"].includes(item.priority) ? item.priority : "Medium",
      effort: Number.isInteger(item.effort) ? Math.min(8, Math.max(1, item.effort)) : 3,
      description: item.description || "",
    }));

    res.json(tasks);
  } catch (err) {
    console.error("AI extract-tasks error:", err.message);
    res.status(500).json({ error: "AI task extraction failed" });
  }
});

// POST /api/v1/ai/daily-plan
router.post("/daily-plan", requireAuth, async (req, res) => {
  const client = getClient();
  if (!client) return res.status(503).json({ error: "AI service not configured. Set GROQ_API_KEY in server .env" });

  const { tasks, projects, members } = req.body;
  const today = new Date().toISOString().slice(0, 10);

  const contextData = {
    today,
    members: (members || []).map((m) => ({ id: m.id, name: m.name })),
    projects: (projects || []).map((p) => ({ id: p.id, name: p.name, status: p.status, endDate: p.endDate })),
    tasks: (tasks || [])
      .filter((t) => t.status !== "Done")
      .map((t) => ({
        id: t.id, title: t.title, description: t.description, status: t.status,
        priority: t.priority, dueDate: t.dueDate, effort: t.effort, projectId: t.projectId, assigneeId: t.assigneeId,
      })),
  };

  try {
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
    const plan = parsed.map((item) => ({
      rank: item.rank, taskId: item.taskId, title: item.title, reason: item.reason,
    }));

    res.json(plan);
  } catch (err) {
    console.error("AI daily-plan error:", err.message);
    res.status(500).json({ error: "AI plan generation failed" });
  }
});

// POST /api/v1/ai/chat
router.post("/chat", requireAuth, async (req, res) => {
  const client = getClient();
  if (!client) return res.status(503).json({ error: "AI service not configured. Set GROQ_API_KEY in server .env" });

  const { messages, workspaceContext } = req.body;
  const today = new Date().toISOString().slice(0, 10);

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
${workspaceContext || "No workspace data available."}
--- END SNAPSHOT ---

Today's date: ${today}`;

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: "system", content: systemPrompt },
        ...(messages || []).map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    const fullText = response.choices[0].message.content;

    const actionMatch = fullText.match(/<action>\s*([\s\S]*?)\s*<\/action>/);
    let action = null;
    if (actionMatch) {
      try { action = JSON.parse(actionMatch[1]); } catch { /* malformed action */ }
    }

    const text = fullText.replace(/<action>[\s\S]*?<\/action>/, "").trim();
    res.json({ text, action });
  } catch (err) {
    console.error("AI chat error:", err.message);
    res.status(500).json({ error: "AI chat failed" });
  }
});

export default router;
