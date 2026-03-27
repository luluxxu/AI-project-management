import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 1024;

function createClient(apiKey) {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

function safeParseJson(text) {
  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
  return JSON.parse(cleaned);
}

// ── 1. Task Extraction ──────────────────────────────────────────────────────

export async function extractTasksWithClaude(text, apiKey) {
  const client = createClient(apiKey);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: `You are a project management assistant. Parse free-form meeting notes or requirement text and extract a list of actionable tasks.

Return ONLY a JSON array. No markdown, no explanation, no code fences. Each element must have exactly these fields:
- title: string (short imperative phrase, max 60 chars)
- priority: one of "High" | "Medium" | "Low"
- effort: integer 1–8 (estimated hours)
- description: string (one sentence of context, may be empty string)

Rules:
- Extract up to 10 tasks. Skip filler text.
- Infer priority from urgency language (ASAP, critical, blocker = High; later, nice-to-have, backlog = Low; everything else = Medium).
- Infer effort from task type (research/plan = 2, design = 3, implement/build = 5, test/review = 3, document = 2).`,
    messages: [{ role: "user", content: text }],
  });

  const raw = response.content[0].text;
  const parsed = safeParseJson(raw);

  return parsed.map((item, index) => ({
    id: `draft-${index + 1}`,
    title: item.title || "",
    priority: ["High", "Medium", "Low"].includes(item.priority) ? item.priority : "Medium",
    effort: Number.isInteger(item.effort) ? Math.min(8, Math.max(1, item.effort)) : 3,
    description: item.description || "",
  }));
}

// ── 2. Daily Plan Generation ────────────────────────────────────────────────

export async function generateDailyPlanWithClaude(tasks, projects, members, apiKey) {
  const client = createClient(apiKey);
  const today = new Date().toISOString().slice(0, 10);

  const contextData = {
    today,
    members: members.map((m) => ({ id: m.id, name: m.name })),
    projects: projects.map((p) => ({ id: p.id, name: p.name, status: p.status, endDate: p.endDate })),
    tasks: tasks
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

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: `You are a project management assistant helping a team decide what to focus on today. You will receive workspace task data as JSON. Return ONLY a JSON array of up to 5 items representing the recommended daily plan, ordered by recommended priority.

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
    messages: [{ role: "user", content: JSON.stringify(contextData) }],
  });

  const raw = response.content[0].text;
  const parsed = safeParseJson(raw);

  return parsed.map((item) => ({
    rank: item.rank,
    taskId: item.taskId,
    title: item.title,
    reason: item.reason,
  }));
}

// ── 3. Chat Assistant ───────────────────────────────────────────────────────

export async function chatWithClaude(messages, workspaceContext, apiKey) {
  const client = createClient(apiKey);
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
${workspaceContext}
--- END SNAPSHOT ---

Today's date: ${today}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const fullText = response.content[0].text;

  // Extract optional <action> block
  const actionMatch = fullText.match(/<action>\s*([\s\S]*?)\s*<\/action>/);
  let action = null;
  if (actionMatch) {
    try {
      action = JSON.parse(actionMatch[1]);
    } catch {
      // malformed action block — ignore
    }
  }

  const text = fullText.replace(/<action>[\s\S]*?<\/action>/, "").trim();

  return { text, action };
}
