import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { cleanupTestDb } from "./setup.js";

cleanupTestDb();

const { default: request } = await import("supertest");
const { default: app } = await import("../index.js");

afterAll(() => cleanupTestDb());

let ownerToken;
let applicantToken, applicantUserId;
let memberToken;
let workspaceId;

beforeAll(async () => {
  const ownerRes = await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Owner", email: "owner@test.com", password: "pass1234" });
  ownerToken = ownerRes.body.token;

  const applicantRes = await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Applicant", email: "applicant@test.com", password: "pass1234" });
  applicantToken = applicantRes.body.token;
  applicantUserId = applicantRes.body.user.id;

  const memberRes = await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Member", email: "member@test.com", password: "pass1234" });
  memberToken = memberRes.body.token;

  const wsRes = await request(app)
    .post("/api/v1/workspaces")
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({ name: "JoinReq Test WS" });
  workspaceId = wsRes.body.id;

  // Add member directly
  await request(app)
    .post(`/api/v1/workspaces/${workspaceId}/members`)
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({ email: "member@test.com", role: "Member" });
});

describe("POST /:wsId/join-request", () => {
  it("non-member can submit a join request", async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/join-request`)
      .set("Authorization", `Bearer ${applicantToken}`);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("Pending");
    expect(res.body.id).toBeDefined();
  });

  it("rejects duplicate pending request", async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/join-request`)
      .set("Authorization", `Bearer ${applicantToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already pending/i);
  });

  it("existing member cannot submit join request", async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/join-request`)
      .set("Authorization", `Bearer ${memberToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already a member/i);
  });

  it("returns 404 for non-existent workspace", async () => {
    const res = await request(app)
      .post("/api/v1/workspaces/nonexistent/join-request")
      .set("Authorization", `Bearer ${applicantToken}`);

    expect(res.status).toBe(404);
  });
});

describe("GET /:wsId/join-requests", () => {
  it("workspace admin can list pending requests", async () => {
    const res = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/join-requests`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].user_id).toBe(applicantUserId);
    expect(res.body[0].name).toBe("Applicant");
  });

  it("regular member cannot list requests", async () => {
    const res = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/join-requests`)
      .set("Authorization", `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
  });
});

describe("PATCH /:wsId/join-requests/:id — approve", () => {
  let requestId;

  beforeAll(async () => {
    const listRes = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/join-requests`)
      .set("Authorization", `Bearer ${ownerToken}`);
    requestId = listRes.body[0].id;
  });

  it("admin approves the request", async () => {
    const res = await request(app)
      .patch(`/api/v1/workspaces/${workspaceId}/join-requests/${requestId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Approved" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Approved");
  });

  it("approved applicant is now a workspace member", async () => {
    const res = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/members`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.body.some((m) => m.user_id === applicantUserId)).toBe(true);
  });

  it("cannot process an already-processed request", async () => {
    const res = await request(app)
      .patch(`/api/v1/workspaces/${workspaceId}/join-requests/${requestId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Rejected" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already processed/i);
  });

  it("returns 404 for non-existent request", async () => {
    const res = await request(app)
      .patch(`/api/v1/workspaces/${workspaceId}/join-requests/nonexistent`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Approved" });

    expect(res.status).toBe(404);
  });

  it("rejects invalid status value", async () => {
    const res = await request(app)
      .patch(`/api/v1/workspaces/${workspaceId}/join-requests/${requestId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Maybe" });

    expect(res.status).toBe(400);
  });
});

describe("PATCH /:wsId/join-requests/:id — reject flow", () => {
  let requestId;

  beforeAll(async () => {
    // Register a new applicant for reject test
    const newRes = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Rejectee", email: "rejectee@test.com", password: "pass1234" });
    const newToken = newRes.body.token;

    // Submit join request
    await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/join-request`)
      .set("Authorization", `Bearer ${newToken}`);

    const listRes = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/join-requests`)
      .set("Authorization", `Bearer ${ownerToken}`);
    requestId = listRes.body[0].id;
  });

  it("admin rejects the request", async () => {
    const res = await request(app)
      .patch(`/api/v1/workspaces/${workspaceId}/join-requests/${requestId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Rejected" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Rejected");
  });

  it("rejected user is NOT a member", async () => {
    const res = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/members`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.body.some((m) => m.name === "Rejectee")).toBe(false);
  });
});

describe("Re-apply after rejection", () => {
  it("rejected user can re-submit a join request", async () => {
    // Login as rejectee
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "rejectee@test.com", password: "pass1234" });

    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/join-request`)
      .set("Authorization", `Bearer ${loginRes.body.token}`);

    expect(res.status).toBe(200); // 200 not 201 — updates existing row back to Pending
    expect(res.body.status).toBe("Pending");
  });
});
