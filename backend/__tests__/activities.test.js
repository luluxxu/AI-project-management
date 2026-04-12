import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { cleanupTestDb } from "./setup.js";

cleanupTestDb();

const { default: request } = await import("supertest");
const { default: app } = await import("../index.js");

afterAll(() => cleanupTestDb());

let ownerToken;
let outsiderToken;
let workspaceId;

beforeAll(async () => {
  const ownerRes = await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Owner", email: "owner@test.com", password: "pass1234" });
  ownerToken = ownerRes.body.token;

  const outsiderRes = await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Outsider", email: "outsider@test.com", password: "pass1234" });
  outsiderToken = outsiderRes.body.token;

  const wsRes = await request(app)
    .post("/api/v1/workspaces")
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({ name: "Activity Test WS" });
  workspaceId = wsRes.body.id;
});

describe("GET /api/v1/activities/:wsId/activities", () => {
  it("returns activities after workspace creation", async () => {
    const res = await request(app)
      .get(`/api/v1/activities/${workspaceId}/activities`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body.some((a) => a.message.includes("created"))).toBe(true);
  });

  it("records activity when project is created", async () => {
    await request(app)
      .post(`/api/v1/projects/${workspaceId}/projects`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Proj A", status: "Active", priority: "Medium" });

    const res = await request(app)
      .get(`/api/v1/activities/${workspaceId}/activities`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.body.some((a) => a.message.includes("Proj A"))).toBe(true);
  });

  it("records activity when task is created", async () => {
    // Need a project first
    const projRes = await request(app)
      .post(`/api/v1/projects/${workspaceId}/projects`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Proj B", status: "Planning", priority: "Low" });

    await request(app)
      .post(`/api/v1/tasks/${workspaceId}/tasks`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        projectId: projRes.body.id,
        title: "Activity Test Task",
        status: "Todo",
        priority: "Medium",
        effort: 2,
      });

    const res = await request(app)
      .get(`/api/v1/activities/${workspaceId}/activities`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.body.some((a) => a.message.includes("Activity Test Task"))).toBe(true);
  });

  it("activities are ordered by created_at DESC", async () => {
    const res = await request(app)
      .get(`/api/v1/activities/${workspaceId}/activities`)
      .set("Authorization", `Bearer ${ownerToken}`);

    for (let i = 0; i < res.body.length - 1; i++) {
      expect(res.body[i].created_at >= res.body[i + 1].created_at).toBe(true);
    }
  });

  it("outsider cannot view activities", async () => {
    const res = await request(app)
      .get(`/api/v1/activities/${workspaceId}/activities`)
      .set("Authorization", `Bearer ${outsiderToken}`);

    expect(res.status).toBe(403);
  });
});
