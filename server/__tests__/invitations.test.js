import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { cleanupTestDb } from "./setup.js";

cleanupTestDb();

const { default: request } = await import("supertest");
const { default: app } = await import("../index.js");

afterAll(() => cleanupTestDb());

let ownerToken;
let inviteeToken, inviteeUserId;
let invitee2Token, invitee2UserId;
let outsiderToken;
let workspaceId;

beforeAll(async () => {
  const ownerRes = await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Owner", email: "owner@test.com", password: "pass1234" });
  ownerToken = ownerRes.body.token;

  const inviteeRes = await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Invitee", email: "invitee@test.com", password: "pass1234" });
  inviteeToken = inviteeRes.body.token;
  inviteeUserId = inviteeRes.body.user.id;

  const invitee2Res = await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Invitee2", email: "invitee2@test.com", password: "pass1234" });
  invitee2Token = invitee2Res.body.token;
  invitee2UserId = invitee2Res.body.user.id;

  const outsiderRes = await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Outsider", email: "outsider@test.com", password: "pass1234" });
  outsiderToken = outsiderRes.body.token;

  const wsRes = await request(app)
    .post("/api/v1/workspaces")
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({ name: "Invitation Test WS" });
  workspaceId = wsRes.body.id;
});

describe("Invitation creation (via workspace route)", () => {
  let invitationId;

  it("owner creates an invitation", async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "invitee@test.com", role: "Member" });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("Pending");
    expect(res.body.invitedEmail).toBe("invitee@test.com");
    invitationId = res.body.id;
  });

  it("rejects duplicate pending invitation", async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "invitee@test.com" });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/pending/i);
  });

  it("rejects invitation for unregistered email", async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "nobody@test.com" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not registered/i);
  });

  it("lists invitations for workspace admin", async () => {
    const res = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.some((i) => i.id === invitationId)).toBe(true);
  });
});

describe("GET /api/v1/invitations (invitee's pending list)", () => {
  it("invitee sees their pending invitation", async () => {
    const res = await request(app)
      .get("/api/v1/invitations")
      .set("Authorization", `Bearer ${inviteeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].workspace_name).toBe("Invitation Test WS");
  });

  it("outsider sees no invitations", async () => {
    const res = await request(app)
      .get("/api/v1/invitations")
      .set("Authorization", `Bearer ${outsiderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0);
  });
});

describe("POST /api/v1/invitations/:id/respond — accept", () => {
  let invitationId;

  beforeAll(async () => {
    const listRes = await request(app)
      .get("/api/v1/invitations")
      .set("Authorization", `Bearer ${inviteeToken}`);
    invitationId = listRes.body[0].id;
  });

  it("another user cannot respond to someone else's invitation", async () => {
    const res = await request(app)
      .post(`/api/v1/invitations/${invitationId}/respond`)
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ action: "accept" });

    expect(res.status).toBe(403);
  });

  it("invitee accepts the invitation", async () => {
    const res = await request(app)
      .post(`/api/v1/invitations/${invitationId}/respond`)
      .set("Authorization", `Bearer ${inviteeToken}`)
      .send({ action: "accept" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Accepted");
  });

  it("invitee is now a workspace member", async () => {
    const res = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/members`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.body.some((m) => m.user_id === inviteeUserId)).toBe(true);
  });

  it("cannot respond to already-responded invitation", async () => {
    const res = await request(app)
      .post(`/api/v1/invitations/${invitationId}/respond`)
      .set("Authorization", `Bearer ${inviteeToken}`)
      .send({ action: "accept" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already been responded/i);
  });
});

describe("POST /api/v1/invitations/:id/respond — reject", () => {
  let invitationId;

  beforeAll(async () => {
    // Create invitation for invitee2
    const createRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "invitee2@test.com", role: "Admin" });
    invitationId = createRes.body.id;
  });

  it("invitee rejects the invitation", async () => {
    const res = await request(app)
      .post(`/api/v1/invitations/${invitationId}/respond`)
      .set("Authorization", `Bearer ${invitee2Token}`)
      .send({ action: "reject" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Rejected");
  });

  it("rejected invitee is NOT a workspace member", async () => {
    const res = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/members`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.body.some((m) => m.user_id === invitee2UserId)).toBe(false);
  });
});

describe("Invitation validation", () => {
  it("rejects invalid action", async () => {
    // Create a new invitation to get a valid ID
    // First register a fresh user
    const freshRes = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Fresh", email: "fresh@test.com", password: "pass1234" });
    const freshToken = freshRes.body.token;

    const invRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "fresh@test.com" });

    const res = await request(app)
      .post(`/api/v1/invitations/${invRes.body.id}/respond`)
      .set("Authorization", `Bearer ${freshToken}`)
      .send({ action: "maybe" });

    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent invitation", async () => {
    const res = await request(app)
      .post("/api/v1/invitations/nonexistent/respond")
      .set("Authorization", `Bearer ${inviteeToken}`)
      .send({ action: "accept" });

    expect(res.status).toBe(404);
  });
});
