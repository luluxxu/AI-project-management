import { Router } from "express";
import OpenAI from "openai";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 10,              // 10 requests per minute per user
  keyGenerator: (req) => req.userId,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI requests. Please try again in a minute." },
});

const CHATGPT_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const MAX_TOKENS = 1400;

function getConfiguredProviders() {
  const providers = [];
  if (process.env.OPENAI_API_KEY) providers.push("chatgpt");
  return providers;
}

function resolveProvider(requested = "auto") {
  const configured = getConfiguredProviders();
  if (!configured.length) return null;
  if (requested && requested !== "auto" && configured.includes(requested)) return requested;
  return configured[0];
}

function getOpenAiClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

function stripCodeFence(text = "") {
  return String(text)
    .replace(/^```(?:json)?\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();
}

function safeParseJson(text = "") {
  return JSON.parse(stripCodeFence(text));
}

function asIso(date, hm) {
  return new Date(`${date}T${hm}:00`);
}

function toMinutes(hm = "09:00") {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

function minutesToHm(value) {
  const h = Math.floor(value / 60);
  const m = value % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function normalizeBusyBlocks(date, busyBlocks = []) {
  return (busyBlocks || [])
    .map((b) => {
      const startRaw = b?.start || "";
      const endRaw = b?.end || "";

      const start = startRaw.includes("T") ? new Date(startRaw) : asIso(date, startRaw);
      const end = endRaw.includes("T") ? new Date(endRaw) : asIso(date, endRaw);
      if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end <= start) return null;
      return { start, end };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);
}

function scoreTask(task, date) {
  const due = task.dueDate ? new Date(`${task.dueDate}T00:00:00`) : null;
  const today = new Date(`${date}T00:00:00`);
  const diffDays = due ? Math.floor((due - today) / (1000 * 60 * 60 * 24)) : 999;

  const overdue = due && diffDays < 0;
  const dueSoon = due && diffDays >= 0 && diffDays <= 3;
  const blocking = /\b(blocked|blocking|blocker)\b/i.test(task.description || "");

  let score = 0;
  if (overdue) score += 100;
  if (dueSoon) score += 40;
  if (task.priority === "High") score += 25;
  if (task.status === "In Progress") score += 12;
  if (blocking) score += 8;

  return { score, overdue, dueSoon, blocking, diffDays };
}

function buildHeuristicDailyPlan({ tasks = [], date, workHours = {}, busyBlocks = [] }) {
  const openTasks = tasks.filter((t) => t.status !== "Done");

  const ranked = openTasks
    .map((task) => {
      const meta = scoreTask(task, date);
      return { task, meta };
    })
    .sort((a, b) => b.meta.score - a.meta.score || (a.task.dueDate || "").localeCompare(b.task.dueDate || ""))
    .slice(0, 8);

  const orderedTasks = ranked.map(({ task, meta }, index) => {
    const reasonParts = [];
    if (meta.overdue) reasonParts.push("overdue");
    else if (meta.dueSoon) reasonParts.push("due within 3 days");
    if (task.priority === "High") reasonParts.push("high priority");
    if (task.status === "In Progress") reasonParts.push("already in progress");
    if (meta.blocking) reasonParts.push("potential blocker");
    if (!reasonParts.length) reasonParts.push("balanced by effort and urgency");

    return {
      rank: index + 1,
      taskId: task.id,
      title: task.title,
      reason: reasonParts.join(", "),
      effort: Number.isInteger(task.effort) ? Math.max(1, task.effort) : 2,
    };
  });

  const startHm = workHours.start || "09:00";
  const endHm = workHours.end || "17:00";
  const dayStart = toMinutes(startHm);
  const dayEnd = toMinutes(endHm);

  const blocked = normalizeBusyBlocks(date, busyBlocks).map((b) => ({
    startMin: b.start.getHours() * 60 + b.start.getMinutes(),
    endMin: b.end.getHours() * 60 + b.end.getMinutes(),
  }));

  const free = [];
  let cursor = dayStart;
  for (const block of blocked) {
    if (block.startMin > cursor) free.push({ startMin: cursor, endMin: Math.min(block.startMin, dayEnd) });
    cursor = Math.max(cursor, block.endMin);
    if (cursor >= dayEnd) break;
  }
  if (cursor < dayEnd) free.push({ startMin: cursor, endMin: dayEnd });

  const timeBlocks = [];
  const freeCopy = free.map((slot) => ({ ...slot }));

  for (const item of orderedTasks.slice(0, 5)) {
    const minutesNeeded = Math.min(180, Math.max(30, (item.effort || 2) * 60));
    let assigned = false;

    for (const slot of freeCopy) {
      const available = slot.endMin - slot.startMin;
      if (available < 30) continue;
      const duration = Math.min(minutesNeeded, available);
      if (duration < 30) continue;

      const start = slot.startMin;
      const end = start + duration;

      timeBlocks.push({
        taskId: item.taskId,
        title: item.title,
        start: `${date}T${minutesToHm(start)}:00`,
        end: `${date}T${minutesToHm(end)}:00`,
        reason: item.reason,
      });

      slot.startMin = end;
      assigned = true;
      break;
    }

    if (!assigned) {
      // Leave task in ordered list even if no available slot.
    }
  }

  return {
    provider: "heuristic",
    orderedTasks: orderedTasks.map(({ effort: _effort, ...rest }) => rest),
    timeBlocks,
  };
}

function normalizeMessages(messages = []) {
  return (messages || [])
    .filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({ role: m.role, content: m.content.trim() }))
    .filter((m) => m.content.length > 0);
}

async function callChatGpt({ systemPrompt, messages, maxTokens = MAX_TOKENS, temperature = 0.2 }) {
  const client = getOpenAiClient();
  if (!client) throw new Error("OPENAI_API_KEY is not configured");

  const response = await client.chat.completions.create({
    model: CHATGPT_MODEL,
    max_tokens: maxTokens,
    temperature,
    messages: [
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
      ...messages,
    ],
  });

  return response.choices?.[0]?.message?.content?.trim() || "";
}

async function callModel({ provider, systemPrompt, messages, maxTokens = MAX_TOKENS, temperature = 0.2 }) {
  if (provider === "chatgpt") return callChatGpt({ systemPrompt, messages, maxTokens, temperature });
  throw new Error("AI provider is not configured");
}

// GET /api/v1/ai/status
router.get("/status", requireAuth, (_req, res) => {
  const configuredProviders = getConfiguredProviders();
  res.json({
    configured: configuredProviders.length > 0,
    configuredProviders,
    defaultProvider: configuredProviders[0] || null,
  });
});

// POST /api/v1/ai/extract-tasks
router.post("/extract-tasks", requireAuth, aiLimiter, async (req, res) => {
  const provider = resolveProvider(req.body?.provider);
  if (!provider) {
    return res.status(503).json({
      error: "AI service not configured. Set OPENAI_API_KEY in server .env",
    });
  }

  const { text, sourceType = "notes" } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "text is required" });
  }

  const sourceHint = sourceType === "email" ? "The input is an email thread." : "The input is notes/requirements.";

  try {
    const raw = await callModel({
      provider,
      systemPrompt: `You are a project management assistant. ${sourceHint}
Return ONLY a JSON array. No markdown, no explanation.
Each element must include exactly:
- title: string (imperative phrase, max 60 chars)
- priority: "High" | "Medium" | "Low"
- effort: integer 1-8 (estimated hours)
- description: string
Rules:
- Extract up to 10 actionable tasks.
- Skip non-actionable context.
- Preserve critical constraints, owners, and deadlines in description when present.`,
      messages: [{ role: "user", content: text }],
      temperature: 0.1,
      maxTokens: 1200,
    });

    const parsed = safeParseJson(raw);
    const tasks = (Array.isArray(parsed) ? parsed : []).map((item, index) => ({
      id: `draft-${index + 1}`,
      title: String(item?.title || "").slice(0, 60),
      priority: ["High", "Medium", "Low"].includes(item?.priority) ? item.priority : "Medium",
      effort: Number.isFinite(Number(item?.effort)) ? Math.max(1, Math.min(8, Number(item.effort))) : 3,
      description: String(item?.description || ""),
    }));

    res.json({ provider, tasks });
  } catch (err) {
    console.error("AI extract-tasks error:", err.message);
    res.status(500).json({ error: "AI task extraction failed" });
  }
});

// POST /api/v1/ai/daily-plan
router.post("/daily-plan", requireAuth, aiLimiter, async (req, res) => {
  const provider = resolveProvider(req.body?.provider);
  const { tasks = [], projects = [], members = [], busyBlocks = [], date, workHours = {} } = req.body;
  const targetDate = date || new Date().toISOString().slice(0, 10);

  const fallback = buildHeuristicDailyPlan({ tasks, date: targetDate, workHours, busyBlocks });
  if (!provider) return res.json(fallback);

  const contextData = {
    date: targetDate,
    workHours: {
      start: workHours.start || "09:00",
      end: workHours.end || "17:00",
    },
    busyBlocks,
    members: (members || []).map((m) => ({ id: m.id || m.userId, name: m.name })),
    projects: (projects || []).map((p) => ({ id: p.id, name: p.name, status: p.status, endDate: p.endDate })),
    tasks: (tasks || [])
      .filter((t) => t.status !== "Done")
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

  try {
    const raw = await callModel({
      provider,
      systemPrompt: `You are an AI planning service. Return ONLY a JSON object with shape:
{
  "orderedTasks": [
    {"rank":1,"taskId":"...","title":"...","reason":"..."}
  ],
  "timeBlocks": [
    {"taskId":"...","title":"...","start":"YYYY-MM-DDTHH:mm:ss","end":"YYYY-MM-DDTHH:mm:ss","reason":"..."}
  ]
}
Rules:
- Use only task IDs from input.
- Prioritise overdue, then due-soon, then high-priority in-progress tasks.
- Time blocks must stay inside workHours and avoid busyBlocks.
- Keep at most 5 time blocks.
- If a task cannot be scheduled, keep it in orderedTasks without a block.
Return valid JSON only.`,
      messages: [{ role: "user", content: JSON.stringify(contextData) }],
      temperature: 0.1,
      maxTokens: 1400,
    });

    const parsed = safeParseJson(raw);
    const orderedTasks = Array.isArray(parsed?.orderedTasks)
      ? parsed.orderedTasks
          .map((item, index) => ({
            rank: Number(item?.rank) || index + 1,
            taskId: String(item?.taskId || ""),
            title: String(item?.title || ""),
            reason: String(item?.reason || ""),
          }))
          .filter((item) => item.taskId)
      : fallback.orderedTasks;

    const timeBlocks = Array.isArray(parsed?.timeBlocks)
      ? parsed.timeBlocks
          .map((block) => ({
            taskId: String(block?.taskId || ""),
            title: String(block?.title || ""),
            start: String(block?.start || ""),
            end: String(block?.end || ""),
            reason: String(block?.reason || ""),
          }))
          .filter((block) => block.taskId && block.start && block.end)
          .slice(0, 5)
      : fallback.timeBlocks;

    res.json({ provider, orderedTasks, timeBlocks });
  } catch (err) {
    console.error("AI daily-plan error:", err.message);
    res.json(fallback);
  }
});

// POST /api/v1/ai/project-plan
router.post("/project-plan", requireAuth, aiLimiter, async (req, res) => {
  const provider = resolveProvider(req.body?.provider);
  if (!provider) {
    return res.status(503).json({
      error: "AI service not configured. Set OPENAI_API_KEY in server .env",
    });
  }

  const { projectName = "", description = "", startDate, endDate } = req.body;
  if (!projectName || !startDate || !endDate) {
    return res.status(400).json({ error: "projectName, startDate and endDate are required" });
  }

  try {
    const raw = await callModel({
      provider,
      systemPrompt: `You are a project planning assistant.
Given a project name, description, and date range, break it down into milestones and actionable tasks.

Return ONLY a JSON object with this shape:
{
  "milestones": [
    {"title":"...","targetDate":"YYYY-MM-DD","reason":"..."}
  ],
  "tasks": [
    {
      "title":"...",
      "description":"...",
      "priority":"High"|"Medium"|"Low",
      "effort": 1-8,
      "dueDate":"YYYY-MM-DD",
      "milestone":"milestone title this task belongs to"
    }
  ]
}
Rules:
- Generate 3-6 milestones spread evenly from startDate to endDate.
- Generate 5-15 concrete, actionable tasks tied to milestones.
- Task titles should be imperative phrases (e.g. "Set up CI pipeline").
- Include planning, implementation, testing, and review phases.
- effort is estimated hours (1-8).
- All dates must fall within startDate and endDate.
Return strict JSON only.`,
      messages: [
        {
          role: "user",
          content: JSON.stringify({ projectName, description, startDate, endDate }),
        },
      ],
      temperature: 0.2,
      maxTokens: 1800,
    });

    const parsed = safeParseJson(raw);

    const milestones = Array.isArray(parsed?.milestones)
      ? parsed.milestones.map((m) => ({
          title: String(m?.title || ""),
          targetDate: String(m?.targetDate || ""),
          reason: String(m?.reason || ""),
        }))
      : [];

    const tasks = Array.isArray(parsed?.tasks)
      ? parsed.tasks.map((t, i) => ({
          id: `draft-${i + 1}`,
          title: String(t?.title || "").slice(0, 160),
          description: String(t?.description || ""),
          priority: ["High", "Medium", "Low"].includes(t?.priority) ? t.priority : "Medium",
          effort: Number.isFinite(Number(t?.effort)) ? Math.max(1, Math.min(8, Number(t.effort))) : 3,
          dueDate: String(t?.dueDate || ""),
          milestone: String(t?.milestone || ""),
          status: "Todo",
        }))
      : [];

    res.json({ provider, milestones, tasks });
  } catch (err) {
    console.error("AI project-plan error:", err.message);
    res.status(500).json({ error: "AI project plan generation failed" });
  }
});

// POST /api/v1/ai/chat
router.post("/chat", requireAuth, aiLimiter, async (req, res) => {
  const provider = resolveProvider(req.body?.provider);
  if (!provider) {
    return res.status(503).json({
      error: "AI service not configured. Set OPENAI_API_KEY in server .env",
    });
  }

  const { messages, workspaceContext } = req.body;
  const today = new Date().toISOString().slice(0, 10);

  const systemPrompt = `You are TaskPilot AI, an intelligent project management assistant embedded in a workspace tool.
You have read-only access to workspace data and should provide concise, practical advice.

If the user asks to perform an action, do not execute it directly. Suggest one structured action at the end:
<action>
{"type":"CREATE_TASK","payload":{"title":"...","priority":"High|Medium|Low","effort":3,"description":"...","projectId":"..."}}
</action>
or
<action>
{"type":"UPDATE_TASK_STATUS","payload":{"taskId":"...","title":"...","newStatus":"Todo|In Progress|Done"}}
</action>

--- WORKSPACE SNAPSHOT ---
${workspaceContext || "No workspace data available."}
--- END SNAPSHOT ---
Today's date: ${today}`;

  try {
    const fullText = await callModel({
      provider,
      systemPrompt,
      messages: normalizeMessages(messages),
      temperature: 0.2,
      maxTokens: MAX_TOKENS,
    });

    const actionMatch = fullText.match(/<action>\s*([\s\S]*?)\s*<\/action>/);
    let action = null;
    if (actionMatch) {
      try {
        action = JSON.parse(actionMatch[1]);
      } catch {
        action = null;
      }
    }

    const text = fullText.replace(/<action>[\s\S]*?<\/action>/, "").trim();
    res.json({ provider, text, action });
  } catch (err) {
    console.error("AI chat error:", err.message);
    res.status(500).json({ error: "AI chat failed" });
  }
});

export default router;
