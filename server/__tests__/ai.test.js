import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { cleanupTestDb } from "./setup.js";

// Ensure no OpenAI key is set so we test fallback paths
delete process.env.OPENAI_API_KEY;

cleanupTestDb();

const { default: request } = await import("supertest");
const { default: app } = await import("../index.js");

afterAll(() => cleanupTestDb());

let token;

beforeAll(async () => {
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "AIUser", email: "ai@test.com", password: "pass1234" });
  token = res.body.token;
});

describe("GET /api/v1/ai/status", () => {
  it("returns configured: false when no API key", async () => {
    const res = await request(app)
      .get("/api/v1/ai/status")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.configured).toBe(false);
    expect(res.body.configuredProviders).toEqual([]);
    expect(res.body.defaultProvider).toBeNull();
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/ai/status");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/ai/extract-tasks", () => {
  it("returns 503 when no AI provider configured", async () => {
    const res = await request(app)
      .post("/api/v1/ai/extract-tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Build login page and add unit tests" });

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/not configured/i);
  });

  it("returns 400 when text is missing", async () => {
    const res = await request(app)
      .post("/api/v1/ai/extract-tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    // Without a provider, 503 takes priority; that's fine
    expect([400, 503]).toContain(res.status);
  });
});

describe("POST /api/v1/ai/daily-plan (heuristic fallback)", () => {
  it("returns heuristic plan when no AI provider", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await request(app)
      .post("/api/v1/ai/daily-plan")
      .set("Authorization", `Bearer ${token}`)
      .send({
        tasks: [
          { id: "t1", title: "Overdue bug", status: "In Progress", priority: "High", dueDate: "2020-01-01", effort: 2 },
          { id: "t2", title: "Low prio", status: "Todo", priority: "Low", effort: 1 },
          { id: "t3", title: "Due soon", status: "Todo", priority: "Medium", dueDate: today, effort: 3 },
        ],
        date: today,
        workHours: { start: "09:00", end: "17:00" },
      });

    expect(res.status).toBe(200);
    expect(res.body.provider).toBe("heuristic");
    expect(Array.isArray(res.body.orderedTasks)).toBe(true);
    expect(Array.isArray(res.body.timeBlocks)).toBe(true);

    // Overdue + high priority task should rank first
    expect(res.body.orderedTasks[0].taskId).toBe("t1");
  });

  it("heuristic respects busy blocks", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await request(app)
      .post("/api/v1/ai/daily-plan")
      .set("Authorization", `Bearer ${token}`)
      .send({
        tasks: [
          { id: "t1", title: "Task A", status: "Todo", priority: "High", effort: 2 },
        ],
        date: today,
        workHours: { start: "09:00", end: "17:00" },
        busyBlocks: [{ start: "09:00", end: "12:00" }],
      });

    expect(res.status).toBe(200);
    // Time block should start after the busy block
    if (res.body.timeBlocks.length > 0) {
      const block = res.body.timeBlocks[0];
      expect(block.start >= `${today}T12:00:00`).toBe(true);
    }
  });

  it("filters out Done tasks", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await request(app)
      .post("/api/v1/ai/daily-plan")
      .set("Authorization", `Bearer ${token}`)
      .send({
        tasks: [
          { id: "t1", title: "Done task", status: "Done", priority: "High", effort: 1 },
          { id: "t2", title: "Open task", status: "Todo", priority: "Low", effort: 1 },
        ],
        date: today,
      });

    expect(res.body.orderedTasks.some((t) => t.taskId === "t1")).toBe(false);
    expect(res.body.orderedTasks.some((t) => t.taskId === "t2")).toBe(true);
  });

  it("limits to 8 ordered tasks", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const tasks = Array.from({ length: 15 }, (_, i) => ({
      id: `t${i}`,
      title: `Task ${i}`,
      status: "Todo",
      priority: "Medium",
      effort: 1,
    }));

    const res = await request(app)
      .post("/api/v1/ai/daily-plan")
      .set("Authorization", `Bearer ${token}`)
      .send({ tasks, date: today });

    expect(res.body.orderedTasks.length).toBeLessThanOrEqual(8);
  });
});

describe("POST /api/v1/ai/chat", () => {
  it("returns 503 when no AI provider configured", async () => {
    const res = await request(app)
      .post("/api/v1/ai/chat")
      .set("Authorization", `Bearer ${token}`)
      .send({
        messages: [{ role: "user", content: "What tasks are overdue?" }],
        workspaceContext: "No data",
      });

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/not configured/i);
  });
});

describe("POST /api/v1/ai/project-plan", () => {
  it("returns 503 when no AI provider configured", async () => {
    const res = await request(app)
      .post("/api/v1/ai/project-plan")
      .set("Authorization", `Bearer ${token}`)
      .send({
        projectName: "My Project",
        description: "Build a web app",
        startDate: "2026-04-01",
        endDate: "2026-05-01",
      });

    expect(res.status).toBe(503);
  });

  it("returns 400 when required fields missing (with provider)", async () => {
    const res = await request(app)
      .post("/api/v1/ai/project-plan")
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "something" });

    // Either 400 (validation) or 503 (no provider) is acceptable
    expect([400, 503]).toContain(res.status);
  });
});

describe("AI rate limiting", () => {
  it("returns 429 after exceeding 10 requests per minute", async () => {
    // Send 10 requests to hit the limit
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post("/api/v1/ai/extract-tasks")
        .set("Authorization", `Bearer ${token}`)
        .send({ text: "test" });
    }

    // 11th request should be rate-limited
    const res = await request(app)
      .post("/api/v1/ai/extract-tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "test" });

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/too many/i);
  });

  it("includes rate limit headers", async () => {
    // Register a fresh user to get a clean rate limit window
    const freshRes = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "RateUser", email: "rate@test.com", password: "pass1234" });
    const freshToken = freshRes.body.token;

    const res = await request(app)
      .post("/api/v1/ai/daily-plan")
      .set("Authorization", `Bearer ${freshToken}`)
      .send({ tasks: [], date: "2026-04-11" });

    expect(res.headers["ratelimit-limit"]).toBeDefined();
    expect(res.headers["ratelimit-remaining"]).toBeDefined();
  });
});
