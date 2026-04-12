import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { cleanupTestDb } from "./setup.js";

cleanupTestDb();

const { default: request } = await import("supertest");
const { default: app } = await import("../index.js");

afterAll(() => {
  cleanupTestDb();
});

// Shared state across sequential tests
let ownerToken, ownerUserId;
let memberToken, _memberUserId;
let outsiderToken;
let workspaceId;
let projectId;
let taskId;

// ────────────── Seed users ──────────────
beforeAll(async () => {
  // Register workspace owner
  const ownerRes = await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Owner", email: "owner@test.com", password: "pass1234" });
  ownerToken = ownerRes.body.token;
  ownerUserId = ownerRes.body.user.id;

  // Register a second user (will be added as member later)
  const memberRes = await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Member", email: "member@test.com", password: "pass1234" });
  memberToken = memberRes.body.token;
  _memberUserId = memberRes.body.user.id;

  // Register outsider (never added to workspace)
  const outsiderRes = await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Outsider", email: "outsider@test.com", password: "pass1234" });
  outsiderToken = outsiderRes.body.token;
});

// ────────────── Workspace CRUD ──────────────
describe("Workspace CRUD", () => {
  it("creates a workspace", async () => {
    const res = await request(app)
      .post("/api/v1/workspaces")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Test Workspace", description: "For testing" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Test Workspace");
    expect(res.body.my_role).toBe("Owner");
    workspaceId = res.body.id;
  });

  it("lists workspaces for owner", async () => {
    const res = await request(app)
      .get("/api/v1/workspaces")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.some((w) => w.id === workspaceId)).toBe(true);
  });

  it("outsider does not see the workspace", async () => {
    const res = await request(app)
      .get("/api/v1/workspaces")
      .set("Authorization", `Bearer ${outsiderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.some((w) => w.id === workspaceId)).toBe(false);
  });

  it("adds a member to the workspace", async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/members`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "member@test.com", role: "Member" });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe("Member");
  });

  it("rejects duplicate member", async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/members`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "member@test.com" });

    expect(res.status).toBe(409);
  });

  it("member cannot add other members (not workspace admin)", async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/members`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ email: "outsider@test.com" });

    expect(res.status).toBe(403);
  });

  it("outsider cannot access workspace members", async () => {
    const res = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/members`)
      .set("Authorization", `Bearer ${outsiderToken}`);

    expect(res.status).toBe(403);
  });

  it("owner cannot remove themselves", async () => {
    const res = await request(app)
      .delete(`/api/v1/workspaces/${workspaceId}/members/${ownerUserId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Owner cannot remove themselves/);
  });
});

// ────────────── Project CRUD ──────────────
describe("Project CRUD", () => {
  it("creates a project in the workspace", async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${workspaceId}/projects`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Test Project", status: "Active", priority: "High" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Test Project");
    projectId = res.body.id;
  });

  it("member can list projects", async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${workspaceId}/projects`)
      .set("Authorization", `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it("outsider cannot list projects", async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${workspaceId}/projects`)
      .set("Authorization", `Bearer ${outsiderToken}`);

    expect(res.status).toBe(403);
  });

  it("updates a project", async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${projectId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Renamed Project" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Renamed Project");
  });

  it("rejects invalid status on update", async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${projectId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "InvalidStatus" });

    expect(res.status).toBe(400);
  });

  it("archives and restores a project", async () => {
    const archiveRes = await request(app)
      .post(`/api/v1/projects/${projectId}/archive`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(archiveRes.status).toBe(200);
    expect(archiveRes.body.archivedAt).toBeDefined();

    // Cannot double-archive
    const doubleArchive = await request(app)
      .post(`/api/v1/projects/${projectId}/archive`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(doubleArchive.status).toBe(400);

    // Restore
    const restoreRes = await request(app)
      .post(`/api/v1/projects/${projectId}/restore`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(restoreRes.status).toBe(200);

    // Cannot double-restore
    const doubleRestore = await request(app)
      .post(`/api/v1/projects/${projectId}/restore`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(doubleRestore.status).toBe(400);
  });
});

// ────────────── Task CRUD ──────────────
describe("Task CRUD", () => {
  it("creates a task", async () => {
    const res = await request(app)
      .post(`/api/v1/tasks/${workspaceId}/tasks`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        projectId,
        title: "Test Task",
        status: "Todo",
        priority: "Medium",
        effort: 3,
        dueDate: "2026-12-01",
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Test Task");
    expect(res.body.effort).toBe(3);
    taskId = res.body.id;
  });

  it("member can list tasks", async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${workspaceId}/tasks`)
      .set("Authorization", `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.some((t) => t.id === taskId)).toBe(true);
  });

  it("outsider cannot list tasks", async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${workspaceId}/tasks`)
      .set("Authorization", `Bearer ${outsiderToken}`);

    expect(res.status).toBe(403);
  });

  it("updates a task", async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "In Progress" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("In Progress");
  });

  it("rejects effort out of range", async () => {
    const res = await request(app)
      .post(`/api/v1/tasks/${workspaceId}/tasks`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        projectId,
        title: "Bad Effort",
        status: "Todo",
        priority: "Low",
        effort: 99,
      });

    expect(res.status).toBe(400);
  });

  it("archives and restores a task", async () => {
    const archiveRes = await request(app)
      .post(`/api/v1/tasks/${taskId}/archive`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(archiveRes.status).toBe(200);

    // Archived tasks excluded from default list
    const listRes = await request(app)
      .get(`/api/v1/tasks/${workspaceId}/tasks`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(listRes.body.some((t) => t.id === taskId)).toBe(false);

    // Include archived
    const listAll = await request(app)
      .get(`/api/v1/tasks/${workspaceId}/tasks?includeArchived=true`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(listAll.body.some((t) => t.id === taskId)).toBe(true);

    // Restore
    const restoreRes = await request(app)
      .post(`/api/v1/tasks/${taskId}/restore`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(restoreRes.status).toBe(200);
  });

  it("deletes a task", async () => {
    const res = await request(app)
      .delete(`/api/v1/tasks/${taskId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);

    // Verify it's gone
    const listRes = await request(app)
      .get(`/api/v1/tasks/${workspaceId}/tasks?includeArchived=true`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(listRes.body.some((t) => t.id === taskId)).toBe(false);
  });
});

// ────────────── Workspace Archive Cascade ──────────────
describe("Workspace archive cascades to projects and tasks", () => {
  let cascadeProjectId, cascadeTaskId;

  beforeAll(async () => {
    // Create a project and task for cascade testing
    const projRes = await request(app)
      .post(`/api/v1/projects/${workspaceId}/projects`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Cascade Project", status: "Active", priority: "Low" });
    cascadeProjectId = projRes.body.id;

    const taskRes = await request(app)
      .post(`/api/v1/tasks/${workspaceId}/tasks`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        projectId: cascadeProjectId,
        title: "Cascade Task",
        status: "Todo",
        priority: "Low",
        effort: 1,
      });
    cascadeTaskId = taskRes.body.id;
  });

  it("archiving workspace hides its projects and tasks", async () => {
    const archiveRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/archive`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(archiveRes.status).toBe(200);

    // Projects should be hidden
    const projList = await request(app)
      .get(`/api/v1/projects/${workspaceId}/projects`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(projList.body.every((p) => p.archived_at !== null)).toBe(true);

    // Tasks should be hidden
    const taskList = await request(app)
      .get(`/api/v1/tasks/${workspaceId}/tasks`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(taskList.body.length).toBe(0);
  });

  it("restoring workspace restores its projects and tasks", async () => {
    const restoreRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/restore`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(restoreRes.status).toBe(200);

    const projList = await request(app)
      .get(`/api/v1/projects/${workspaceId}/projects`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(projList.body.some((p) => p.id === cascadeProjectId && !p.archived_at)).toBe(true);

    const taskList = await request(app)
      .get(`/api/v1/tasks/${workspaceId}/tasks`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(taskList.body.some((t) => t.id === cascadeTaskId)).toBe(true);
  });
});

// ────────────── Workspace deletion ──────────────
describe("Workspace deletion", () => {
  it("non-owner cannot delete workspace", async () => {
    const res = await request(app)
      .delete(`/api/v1/workspaces/${workspaceId}`)
      .set("Authorization", `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
  });

  it("owner can delete workspace", async () => {
    const res = await request(app)
      .delete(`/api/v1/workspaces/${workspaceId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);

    // Workspace should no longer appear
    const listRes = await request(app)
      .get("/api/v1/workspaces")
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(listRes.body.some((w) => w.id === workspaceId)).toBe(false);
  });
});
